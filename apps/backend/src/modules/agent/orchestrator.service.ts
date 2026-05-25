import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, END } from '@langchain/langgraph';
import { AgentState } from './interfaces/agent-state.interface';
import { AgentResult } from './interfaces/agent-result.interface';
import { RunAgentDto } from './dto/run-agent.dto';
import { MaterialAgentService } from './agents/material-agent.service';
import { ScriptAgentService } from './agents/script-agent.service';
import { CompositionAgentService } from './agents/composition-agent.service';
import { QualityAgentService } from './agents/quality-agent.service';

type NodeReturn = Partial<AgentState>;

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private activeRuns = new Map<string, { abort: () => void }>();

  constructor(
    private readonly materialAgent: MaterialAgentService,
    private readonly scriptAgent: ScriptAgentService,
    private readonly compositionAgent: CompositionAgentService,
    private readonly qualityAgent: QualityAgentService,
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
      materialAnalysis: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      scriptGeneration: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      videoComposition: { value: (a: any, b: any) => b ?? a, default: () => undefined },
      qualityControl: { value: (a: any, b: any) => b ?? a, default: () => undefined },
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
        return { ...result, currentNode: 'quality_control', progress: 75 };
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
      .addConditionalEdges('quality_control', (state: AgentState) => {
        if (state.qualityControl?.passed) return '__end__';
        if ((state.retryCount ?? 0) < 2) {
          return 'video_composition';
        }
        return '__end__';
      });

    const app = workflow.compile();

    try {
      const finalState = await app.invoke({
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
        errors: [],
        retryCount: 0,
      } as any);

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
      this.logger.error(`[${taskId}] Workflow failed: ${error.message}`);
      return {
        taskId,
        status: 'failed',
        progress: 0,
        currentNode: '',
        result: {} as AgentState,
        startedAt,
        completedAt: new Date(),
        error: error.message,
      };
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
