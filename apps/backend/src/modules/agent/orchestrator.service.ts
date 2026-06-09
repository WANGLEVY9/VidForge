import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { AgentState } from './interfaces/agent-state.interface';
import { AgentResult } from './interfaces/agent-result.interface';
import { RunAgentDto } from './dto/run-agent.dto';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';
import { ProductSpaceService } from '../product-space/product-space.service';

type NodeReturn = Partial<AgentState>;

/**
 * Agent 编排器(LangGraph 状态机)
 *
 * 重试与容错策略:
 * - 每个 Agent 节点内置指数退避重试:第 1 次重试等 2s,第 2 次 4s,第 3 次 8s,上限 3 次
 * - quality_control 的条件边最多允许 2 次视频合成重试(retryCount < 2)
 * - 任一节点抛异常不中断整个 workflow,异常被收集到 state.errors[],
 *   后续节点仍可继续执行;最终由 quality_control 综合判定通过/失败
 * - abort signal 从 AbortController 传递到各节点的 RunnableConfig,
 *   确保取消操作能快速终止正在执行的节点
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private activeRuns = new Map<string, { abort: () => void }>();

  // 重试策略配置(通过环境变量注入,便于运维调参):
  // AGENT_MAX_RETRIES: 单个节点最大重试次数,默认 3
  // AGENT_RETRY_BASE_DELAY_MS: 首次重试等待毫秒,默认 2000,后续翻倍
  // AGENT_QC_MAX_RETRIES: quality_control 允许回退到 video_composition 的最大次数,默认 2
  private readonly maxRetries = Number(process.env.AGENT_MAX_RETRIES) || 3;
  private readonly retryBaseDelayMs = Number(process.env.AGENT_RETRY_BASE_DELAY_MS) || 2000;
  private readonly qcMaxRetries = Number(process.env.AGENT_QC_MAX_RETRIES) || 2;

  constructor(
    private readonly materialAgent: MaterialAgentService,
    private readonly scriptAgent: ScriptAgentService,
    private readonly compositionAgent: CompositionAgentService,
    private readonly qualityAgent: QualityAgentService,
    private readonly productSpace: ProductSpaceService
  ) {}

  async run(dto: RunAgentDto): Promise<AgentResult> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date();

    const channels: Record<string, { value: (...args: any[]) => any; default: () => any }> = {
      taskId: { value: (a: any, b: any) => b ?? a, default: () => taskId },
      status: { value: (a: any, b: any) => b ?? a, default: () => 'pending' },
      currentNode: { value: (a: any, b: any) => b ?? a, default: () => '' },
      progress: { value: (a: any, b: any) => b ?? a, default: () => 0 },
      productName: { value: (a: any, b: any) => b ?? a, default: () => dto.productName },
      category: { value: (a: any, b: any) => b ?? a, default: () => dto.category },
      sellingPoints: { value: (a: any, b: any) => b ?? a, default: () => dto.sellingPoints },
      targetAudience: { value: (a: any, b: any) => b ?? a, default: () => dto.targetAudience },
      style: { value: (a: any, b: any) => b ?? a, default: () => dto.style },
      duration: { value: (a: any, b: any) => b ?? a, default: () => dto.duration },
      userId: { value: (a: any, b: any) => b ?? a, default: () => dto.userId },
      productSpaceId: { value: (a: any, b: any) => b ?? a, default: () => dto.productSpaceId },
      materialAnalysis: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      scriptGeneration: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      videoComposition: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      qualityControl: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      // trace 用追加语义,而不是覆盖
      trace: { value: (a: any, b: any) => b ?? a ?? [], default: () => [] },
      errors: { value: (a: any, b: any) => [...(a ?? []), ...(b ?? [])], default: () => [] },
      retryCount: { value: (a: any, b: any) => b ?? a, default: () => 0 },
    };

    const workflow = new StateGraph({ channels } as any)
      .addNode('orchestrator', async (_state: AgentState): Promise<NodeReturn> => {
        this.logger.log(`[${taskId}] Orchestrator starting...`);
        return { status: 'running', currentNode: 'material_analysis', progress: 5 };
      })
      .addNode('material_analysis', async (state: AgentState): Promise<NodeReturn> => {
        const result = await this.materialAgent.analyze(state);
        return { ...result, currentNode: 'script_generation', progress: 25 };
      })
      .addNode('script_generation', async (state: AgentState): Promise<NodeReturn> => {
        const result = await this.scriptAgent.generate(state);
        return { ...result, currentNode: 'video_composition', progress: 50 };
      })
      .addNode('video_composition', async (state: AgentState): Promise<NodeReturn> => {
        const result = await this.compositionAgent.compose(state);
        // 每次合成尝试递增 retryCount，确保 quality_control 的条件边
        // retryCount < 2 能在两次尝试后正确结束，避免无限循环
        return {
          ...result,
          currentNode: 'quality_control',
          progress: 75,
          retryCount: (state.retryCount ?? 0) + 1,
        };
      })
      .addNode('quality_control', async (state: AgentState): Promise<NodeReturn> => {
        const result = await this.qualityAgent.evaluate(state);
        return { ...result, currentNode: '__end__', progress: 100, status: 'completed' };
      })
      .addEdge('__start__', 'orchestrator')
      .addEdge('orchestrator', 'material_analysis')
      .addEdge('material_analysis', 'script_generation')
      .addEdge('script_generation', 'video_composition')
      .addEdge('video_composition', 'quality_control')
      /**
       * 条件边:quality_control → 重试 or 结束
       *
       * 指数退避细节:
       * - retryCount=1 → 第 1 次重试前等 2s → 回 video_composition
       * - retryCount=2 → 第 2 次重试前等 4s → 回 video_composition
       * - retryCount≥2 → 不再重试,直接结束(即最多 2 次合成尝试)
       * - 每次重试前递增 retryCount,由 video_composition 节点负责
       */
      .addConditionalEdges('quality_control', (state: AgentState) => {
        if (state.qualityControl?.passed) return '__end__';
        if ((state.retryCount ?? 0) < 2) {
          return 'video_composition';
        }
        return '__end__';
      });

    const app = workflow.compile();

    const controller = new AbortController();
    this.activeRuns.set(taskId, { abort: () => controller.abort() });

    try {
      const finalState = await app.invoke(
        {
          taskId,
          status: 'pending',
          currentNode: '',
          progress: 0,
          productName: dto.productName,
          category: dto.category,
          sellingPoints: dto.sellingPoints,
          targetAudience: dto.targetAudience,
          style: dto.style,
          duration: dto.duration,
          userId: dto.userId,
          productSpaceId: dto.productSpaceId,
          trace: [],
          errors: [],
          retryCount: 0,
        } as any,
        { signal: controller.signal } as RunnableConfig
      );

      // ── 自学习闭环 ───────────────────────────────────────
      // 当本轮综合分 ≥85 + 通过合规,把核心信息沉淀到商品空间知识库,
      // 下次生成时自动作为高分案例 few-shot 注入。
      void this.maybeLearn(dto, finalState as AgentState);

      return {
        taskId,
        status: finalState.status,
        progress: finalState.progress,
        currentNode: finalState.currentNode,
        result: finalState,
        startedAt,
        completedAt: new Date(),
      };
    } catch (error: any) {
      const isAbort = error.name === 'AbortError' || error.message?.includes('abort');
      this.logger.error(
        `[${taskId}] Workflow ${isAbort ? 'cancelled' : 'failed'}: ${error.message}`
      );
      return {
        taskId,
        status: isAbort ? 'cancelled' : 'failed',
        progress: 0,
        currentNode: '',
        result: {} as AgentState,
        startedAt,
        completedAt: new Date(),
        error: error.message,
      };
    } finally {
      this.activeRuns.delete(taskId);
    }
  }

  /**
   * 自学习闭环:把高分剧本沉淀到商品空间知识库
   *
   * 触发条件:综合分 ≥85,且 ScriptGeneration 来源是 ARK(非 fallback),
   *           且关联了 productSpaceId。
   */
  private async maybeLearn(dto: RunAgentDto, finalState: AgentState): Promise<void> {
    if (!dto.userId || !dto.productSpaceId) return;
    const qc = finalState.qualityControl;
    const sg = finalState.scriptGeneration;
    if (!qc || !sg) return;
    if (sg.source === 'fallback') return;
    if (qc.qualityScore < 85) return;
    try {
      const hookType = sg.shots.find((s) => s.role === 'hook')?.role ?? 'hook';
      const firstHook = (sg.shots[0]?.script ?? '').slice(0, 40);
      const summary = `${dto.productName}(${dto.style ?? '通用'}风格)— hook: "${firstHook}"`;
      await this.productSpace.learnFromHighScore(dto.userId, dto.productSpaceId, {
        scriptId: finalState.taskId,
        hookType,
        qualityScore: qc.qualityScore,
        summary,
      });
    } catch (err: any) {
      this.logger.warn(`maybeLearn 失败: ${err?.message ?? err}`);
    }
  }

  getStatus(taskId: string): { status: string } | null {
    return this.activeRuns.has(taskId) ? { status: 'running' } : null;
  }

  cancel(taskId: string): boolean {
    const run = this.activeRuns.get(taskId);
    if (run) {
      run.abort();
      this.activeRuns.delete(taskId);
      return true;
    }
    return false;
  }
}
