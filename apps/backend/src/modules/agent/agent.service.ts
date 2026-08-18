import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AgentResult } from './interfaces/agent-result.interface';
import { RunAgentDto } from './dto/run-agent.dto';
import { AgentRun, AgentRunStatus } from './entities/agent-run.entity';
import { OrchestratorService } from './orchestrator.service';
import { createAgentTaskId, readAgentRuntimeConfig } from './agent-runtime.config';
import { QueueRunnerService } from '../queue/queue-runner.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';
import { AgentCheckpointService } from './checkpoint/agent-checkpoint.service';
import { ProviderOperationService } from './provider-operations/provider-operation.service';

@Injectable()
export class AgentService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentService.name);
  private readonly runtime = readAgentRuntimeConfig();
  private readonly isWorker = process.env.PROCESS_ROLE === 'agent-worker';
  private readonly workerId =
    process.env.AGENT_WORKER_ID?.trim().slice(0, 160) ||
    `${this.isWorker ? 'agent' : 'api'}-${process.pid}`;
  private recoveryTimer: ReturnType<typeof setInterval> | undefined;
  constructor(
    @InjectRepository(AgentRun)
    private readonly runRepo: Repository<AgentRun>,
    private readonly orchestrator: OrchestratorService,
    @Optional() private readonly queueRunner?: QueueRunnerService,
    @Optional() private readonly checkpointService?: AgentCheckpointService,
    @Optional() private readonly providerOperations?: ProviderOperationService
  ) {}

  /**
   * Only the dedicated worker performs recovery and dispatch. The API process
   * never executes a long-running graph and never turns an expired lease into
   * a terminal failure, so a worker restart can resume its LangGraph thread.
   */
  async onModuleInit(): Promise<void> {
    if (!this.isWorker) return;

    await this.recoverAndDispatch();
    this.recoveryTimer = setInterval(
      () => {
        void this.recoverAndDispatch().catch((error) => {
          this.logger.error(`Agent worker recovery 失败: ${error?.message ?? error}`);
        });
      },
      Math.max(10_000, Math.floor(this.runtime.leaseDurationMs / 2))
    );
    this.recoveryTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
  }

  private async recoverAndDispatch(): Promise<void> {
    const running = await this.runRepo.find({ where: { status: 'running' }, take: 50 });
    const now = Date.now();
    const stale = running.filter(
      (run) => !run.leaseUntil || new Date(run.leaseUntil).getTime() <= now
    );
    let reclaimed = 0;
    for (const run of stale) {
      const result = await this.runRepo.update(
        {
          id: run.id,
          status: 'running',
          leaseUntil: run.leaseUntil ? run.leaseUntil : IsNull(),
        },
        {
          status: 'pending',
          currentNode: 'recovery_pending',
          errorMessage: 'worker lease expired; resuming from the latest LangGraph checkpoint',
          workerId: null,
          leaseUntil: null,
          heartbeatAt: null,
          completedAt: null,
        }
      );
      if (!result || result.affected === undefined || result.affected > 0) reclaimed += 1;
    }
    if (reclaimed > 0) {
      this.logger.warn(`已回收 ${reclaimed} 个过期 Agent lease，准备从图 checkpoint 恢复`);
    }

    const pending = await this.runRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: 10,
    });
    for (const run of pending) {
      try {
        await this.dispatch(run.id);
      } catch (error: any) {
        this.logger.error(`恢复 Agent 任务入队失败 ${run.id}: ${error?.message ?? error}`);
      }
    }
  }

  /** Start a durable background run and return before model/media work begins. */
  async run(dto: RunAgentDto, rawIdempotencyKey?: string): Promise<AgentResult> {
    const idempotencyKey = this.normalizeIdempotencyKey(rawIdempotencyKey);
    if (idempotencyKey) {
      const existing = await this.runRepo.findOne({
        where: { userId: dto.userId!, idempotencyKey },
      });
      if (existing) return this.toResult(existing);
    }

    const taskId = createAgentTaskId();
    const startedAt = new Date();
    try {
      await this.runRepo.save(
        this.runRepo.create({
          id: taskId,
          userId: dto.userId!,
          idempotencyKey,
          status: 'pending',
          currentNode: 'queued',
          progress: 0,
          attempt: 0,
          workerId: null,
          leaseUntil: null,
          heartbeatAt: null,
          graphThreadId: taskId,
          checkpointId: null,
          input: this.toStoredInput(dto),
          result: null,
          errorMessage: null,
          startedAt: null,
          completedAt: null,
        })
      );
    } catch (error) {
      if (idempotencyKey && this.isUniqueViolation(error)) {
        const existing = await this.runRepo.findOne({
          where: { userId: dto.userId!, idempotencyKey },
        });
        if (existing) return this.toResult(existing);
      }
      throw error;
    }

    try {
      await this.dispatch(taskId);
    } catch (error: any) {
      await this.runRepo.update(taskId, {
        status: 'failed',
        currentNode: 'queue_dispatch_failed',
        errorMessage: String(error?.message ?? error).slice(0, 500),
        completedAt: new Date(),
      });
      throw error;
    }
    return {
      taskId,
      status: 'pending',
      progress: 0,
      currentNode: 'queued',
      result: {},
      startedAt,
    };
  }

  async getStatus(userId: string, taskId: string): Promise<AgentResult> {
    const run = await this.runRepo.findOne({ where: { id: taskId, userId } });
    if (!run) throw new NotFoundException('Agent 任务不存在');
    return this.toResult(run);
  }

  /**
   * Read-only runtime audit for an authenticated run owner. It intentionally
   * returns a compact checkpoint timeline instead of raw LangGraph state,
   * because state can contain prompts, material URLs and long-term memory.
   */
  async getAudit(userId: string, taskId: string) {
    const run = await this.runRepo.findOne({ where: { id: taskId, userId } });
    if (!run) throw new NotFoundException('Agent 任务不存在');

    let checkpointHistory: Awaited<ReturnType<AgentCheckpointService['listSummaries']>> = [];
    let checkpointError: string | null = null;
    if (this.checkpointService && run.graphThreadId) {
      try {
        checkpointHistory = await this.checkpointService.listSummaries(run.graphThreadId);
      } catch (error: any) {
        checkpointError = String(error?.message ?? error).slice(0, 500);
        this.logger.warn(`读取 Agent checkpoint 时间线失败 ${taskId}: ${checkpointError}`);
      }
    }

    return {
      run: this.toResult(run),
      controlPlane: {
        attempt: run.attempt ?? 0,
        workerId: run.workerId ?? null,
        leaseUntil: run.leaseUntil ?? null,
        heartbeatAt: run.heartbeatAt ?? null,
        graphThreadId: run.graphThreadId ?? null,
        latestCheckpointId: run.checkpointId ?? null,
      },
      checkpointing: {
        configured: this.checkpointService?.configured ?? false,
        history: checkpointHistory,
        error: checkpointError,
      },
      providerOperations: this.providerOperations
        ? await this.providerOperations.listAuditForRun(userId, taskId)
        : [],
    };
  }

  async cancel(userId: string, taskId: string): Promise<{ cancelled: boolean }> {
    const run = await this.runRepo.findOne({ where: { id: taskId, userId } });
    if (!run) throw new NotFoundException('Agent 任务不存在');
    if (this.isTerminal(run.status)) return { cancelled: false };

    const cancelled = this.orchestrator.cancel(taskId);
    await this.runRepo.update(taskId, {
      status: 'cancelled',
      currentNode: 'cancelled',
      errorMessage: '用户取消',
      completedAt: new Date(),
      leaseUntil: null,
      heartbeatAt: new Date(),
    });
    return { cancelled: cancelled || run.status === 'pending' };
  }

  /** Entry point used by BullMQ's independent AgentRunProcessor. */
  async executeQueuedRun(taskId: string): Promise<void> {
    const queued = await this.runRepo.findOne({ where: { id: taskId } });
    if (!queued || this.isTerminal(queued.status)) return;

    const startedAt = queued.startedAt ?? queued.createdAt ?? new Date();

    const claimed = await this.runRepo.update(
      { id: taskId, status: 'pending' },
      {
        status: 'running',
        currentNode: 'material_analysis',
        startedAt,
        attempt: () => '"attempt" + 1',
        workerId: this.workerId,
        leaseUntil: this.leaseUntil(),
        heartbeatAt: new Date(),
      }
    );
    if (claimed.affected === 0) {
      this.logger.debug(`跳过已被其他 worker 认领的 Agent 任务 ${taskId}`);
      return;
    }

    try {
      const dto = { ...queued.input, userId: queued.userId } as RunAgentDto;
      const result = await this.orchestrator.run(dto, taskId, async (update) => {
        await this.runRepo.update(taskId, {
          status: update.status,
          currentNode: update.currentNode,
          progress: update.progress,
          workerId: this.workerId,
          leaseUntil: this.leaseUntil(),
          heartbeatAt: new Date(),
        });
      });
      let checkpointId: string | null = null;
      try {
        checkpointId = await this.checkpointService?.latestCheckpointId(
          queued.graphThreadId ?? taskId
        );
      } catch (error: any) {
        this.logger.warn(`读取 Agent checkpoint ID 失败 ${taskId}: ${error?.message ?? error}`);
      }
      await this.runRepo.update(taskId, {
        status: result.status as AgentRunStatus,
        currentNode: result.currentNode,
        progress: result.progress,
        result: result.result as Record<string, unknown>,
        errorMessage: result.error ?? null,
        completedAt: result.completedAt ?? new Date(),
        leaseUntil: null,
        heartbeatAt: new Date(),
        checkpointId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.runRepo.update(taskId, {
        status: 'pending',
        currentNode: 'worker_retry_pending',
        errorMessage: message.slice(0, 500),
        workerId: null,
        leaseUntil: null,
        heartbeatAt: new Date(),
      });
      throw error;
    }
  }

  private async dispatch(taskId: string): Promise<void> {
    const fallback = () => this.executeQueuedRun(taskId);
    if (!this.queueRunner) {
      // Unit-test / minimal embedding fallback. The real Nest application
      // always receives QueueRunnerService from the global QueueModule.
      void fallback().catch((error) => {
        this.logger.error(`[agent:inline] ${taskId}: ${error?.message ?? error}`);
      });
      return;
    }
    await this.queueRunner.enqueue(
      QUEUE_NAMES.AGENT_RUN,
      JOB_NAMES.RUN_AGENT,
      { taskId },
      fallback,
      { jobId: `agent-run:${taskId}`, attempts: 3 }
    );
  }

  private toResult(run: AgentRun): AgentResult {
    return {
      taskId: run.id,
      status: run.status,
      progress: run.progress,
      currentNode: run.currentNode,
      result: run.result ?? {},
      startedAt: run.startedAt ?? run.createdAt,
      completedAt: run.completedAt ?? undefined,
      error: run.errorMessage ?? undefined,
    };
  }

  private toStoredInput(dto: RunAgentDto): Record<string, unknown> {
    const { userId: _userId, ...safeInput } = dto;
    return safeInput;
  }

  private isTerminal(status: AgentRunStatus): boolean {
    return status === 'completed' || status === 'failed' || status === 'cancelled';
  }

  private normalizeIdempotencyKey(value?: string): string | null {
    const normalized = value?.trim();
    if (!normalized) return null;
    if (normalized.length > 200) {
      throw new BadRequestException('Idempotency-Key must be 200 characters or fewer');
    }
    return normalized;
  }

  private leaseUntil(): Date {
    return new Date(Date.now() + this.runtime.leaseDurationMs);
  }

  private isUniqueViolation(error: unknown): boolean {
    return Boolean(
      error && typeof error === 'object' && (error as { code?: string }).code === '23505'
    );
  }
}
