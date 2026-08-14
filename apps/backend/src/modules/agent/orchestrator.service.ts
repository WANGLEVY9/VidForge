import { Injectable, Logger, Optional } from '@nestjs/common';
import { StateGraph } from '@langchain/langgraph';
import type { RetryPolicy } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { AgentState } from './interfaces/agent-state.interface';
import { AgentResult } from './interfaces/agent-result.interface';
import { RunAgentDto } from './dto/run-agent.dto';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';
import { ProductSpaceService } from '../product-space/product-space.service';
import { TraceService } from '../trace/trace.service';
import { AgentMemoryService } from './memory/agent-memory.service';
import {
  createAgentRetryPolicy,
  createAgentTaskId,
  nextQualityNode,
  readAgentRuntimeConfig,
} from './agent-runtime.config';

type NodeReturn = Partial<AgentState>;
export type AgentProgressUpdate = Partial<Pick<AgentState, 'status' | 'currentNode' | 'progress'>>;
export type AgentProgressReporter = (update: AgentProgressUpdate) => Promise<void> | void;

/**
 * Agent 编排器(LangGraph 状态机)
 *
 * 重试与容错策略:
 * - 每个 Agent 节点内置指数退避重试:第 1 次重试等 2s,第 2 次 4s,第 3 次 8s,上限 3 次
 * - quality_control 失败会回到 script_generation,让反馈真正参与下一轮计划
 * - 任一节点的 provider / 网络瞬态异常由 LangGraph RetryPolicy 处理
 * - abort signal 从 AbortController 传递到各节点的 RunnableConfig,
 *   确保取消操作能快速终止正在执行的节点
 */
@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private activeRuns = new Map<string, { abort: () => void }>();

  private readonly runtime = readAgentRuntimeConfig();
  private readonly retryPolicy: RetryPolicy = createAgentRetryPolicy(this.runtime);

  constructor(
    private readonly materialAgent: MaterialAgentService,
    private readonly scriptAgent: ScriptAgentService,
    private readonly compositionAgent: CompositionAgentService,
    private readonly qualityAgent: QualityAgentService,
    private readonly productSpace: ProductSpaceService,
    private readonly traceService: TraceService,
    @Optional() private readonly memoryService?: AgentMemoryService
  ) {}

  async run(
    dto: RunAgentDto,
    taskId = createAgentTaskId(),
    reportProgress?: AgentProgressReporter
  ): Promise<AgentResult> {
    const startedAt = new Date();
    const report = async (update: AgentProgressUpdate) => {
      await reportProgress?.(update);
    };

    const memoryContext = await this.recallMemory(dto);

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
      memoryContext: {
        value: (a: any, b: any) => b ?? a ?? { recalled: [] },
        default: () => memoryContext,
      },
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
        await report({ status: 'running', currentNode: 'material_analysis', progress: 5 });
        return { status: 'running', currentNode: 'material_analysis', progress: 5 };
      })
      .addNode(
        'material_analysis',
        async (state: AgentState): Promise<NodeReturn> => {
          const result = await this.materialAgent.analyze(state);
          await report({ status: 'running', currentNode: 'script_generation', progress: 25 });
          return { ...result, currentNode: 'script_generation', progress: 25 };
        },
        { retryPolicy: this.retryPolicy }
      )
      .addNode(
        'script_generation',
        async (state: AgentState): Promise<NodeReturn> => {
          const result = await this.scriptAgent.generate(state);
          await report({ status: 'running', currentNode: 'video_composition', progress: 50 });
          return { ...result, currentNode: 'video_composition', progress: 50 };
        },
        { retryPolicy: this.retryPolicy }
      )
      .addNode(
        'video_composition',
        async (state: AgentState): Promise<NodeReturn> => {
          const result = await this.compositionAgent.compose(state);
          await report({ status: 'running', currentNode: 'quality_control', progress: 75 });
          // 每次合成尝试递增 retryCount,由 quality_control 控制 replan 上限。
          return {
            ...result,
            currentNode: 'quality_control',
            progress: 75,
            retryCount: (state.retryCount ?? 0) + 1,
          };
        },
        { retryPolicy: this.retryPolicy }
      )
      .addNode(
        'quality_control',
        async (state: AgentState): Promise<NodeReturn> => {
          const result = await this.qualityAgent.evaluate(state);
          await report({
            status: result.qualityControl?.passed ? 'completed' : 'running',
            currentNode: result.qualityControl?.passed ? '__end__' : 'script_generation',
            progress: result.qualityControl?.passed ? 100 : 80,
          });
          return {
            ...result,
            currentNode: '__end__',
            progress: 100,
            status: result.qualityControl?.passed ? 'completed' : 'failed',
          };
        },
        { retryPolicy: this.retryPolicy }
      )
      .addEdge('__start__', 'orchestrator')
      .addEdge('orchestrator', 'material_analysis')
      .addEdge('material_analysis', 'script_generation')
      .addEdge('script_generation', 'video_composition')
      .addEdge('video_composition', 'quality_control')
      /**
       * 条件边:quality_control → script_generation 重规划 or 结束
       *
       * 指数退避细节:
       * - 质量反馈先回到 Script Agent,避免重复渲染同一个计划
       * - retryCount 由 video_composition 节点递增,因此重规划次数有硬上限
       */
      .addConditionalEdges('quality_control', (state: AgentState) => {
        return nextQualityNode(
          state.qualityControl?.passed,
          state.retryCount ?? 0,
          this.runtime.qcMaxRetries
        );
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
          memoryContext,
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

      const result: AgentResult = {
        taskId,
        status: finalState.status,
        progress: finalState.progress,
        currentNode: finalState.currentNode,
        result: finalState,
        startedAt,
        completedAt: new Date(),
      };
      void this.recordRunTrace(
        taskId,
        dto.userId,
        startedAt,
        'ok',
        result,
        finalState as AgentState
      );
      return result;
    } catch (error: any) {
      const isAbort = error.name === 'AbortError' || error.message?.includes('abort');
      this.logger.error(
        `[${taskId}] Workflow ${isAbort ? 'cancelled' : 'failed'}: ${error.message}`
      );
      const result: AgentResult = {
        taskId,
        status: isAbort ? 'cancelled' : 'failed',
        progress: 0,
        currentNode: '',
        result: {} as AgentState,
        startedAt,
        completedAt: new Date(),
        error: error.message,
      };
      void this.recordRunTrace(taskId, dto.userId, startedAt, isAbort ? 'ok' : 'error', result);
      return result;
    } finally {
      this.activeRuns.delete(taskId);
    }
  }

  private async recordRunTrace(
    taskId: string,
    userId: string | undefined,
    startedAt: Date,
    status: 'ok' | 'error',
    result: AgentResult,
    finalState?: AgentState
  ): Promise<void> {
    await this.traceService.recordSpan({
      userId,
      taskId,
      scope: 'agent',
      span: 'agent_workflow',
      startedAt,
      endedAt: result.completedAt ?? new Date(),
      status,
      summary: finalState?.qualityControl
        ? `质量分 ${finalState.qualityControl.qualityScore},通过=${finalState.qualityControl.passed}`
        : (result.error ?? `工作流 ${result.status}`),
      metadata: {
        currentNode: result.currentNode,
        progress: result.progress,
        retryCount: finalState?.retryCount ?? 0,
        traceSpanCount: finalState?.trace?.length ?? 0,
      },
    });
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
      await this.memoryService?.remember({
        userId: dto.userId,
        productSpaceId: dto.productSpaceId,
        sourceRunId: finalState.taskId,
        kind: 'success_pattern',
        scope: 'run',
        semanticKey: `run:${finalState.taskId}:quality-pattern`,
        content: `${dto.category} / ${dto.style ?? '通用'}：${summary}`,
        metadata: {
          source: 'quality_control',
          qualityScore: qc.qualityScore,
          tags: [dto.category, dto.style ?? '通用', hookType],
        },
        importance: Math.min(1, qc.qualityScore / 100),
      });
    } catch (err: any) {
      this.logger.warn(`maybeLearn 失败: ${err?.message ?? err}`);
    }
  }

  private async recallMemory(dto: RunAgentDto): Promise<AgentState['memoryContext']> {
    if (!this.memoryService || !dto.userId) return { recalled: [] };
    const query = [dto.productName, dto.category, dto.sellingPoints, dto.targetAudience, dto.style]
      .filter(Boolean)
      .join(' ');
    const recalled = await this.memoryService.recall({
      userId: dto.userId,
      productSpaceId: dto.productSpaceId,
      query,
      limit: 6,
    });
    return {
      recalled: recalled.map((memory) => ({
        id: memory.id,
        kind: memory.kind,
        content: memory.content,
        score: memory.score,
      })),
    };
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
