import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentResult } from './interfaces/agent-result.interface';
import { RunAgentDto } from './dto/run-agent.dto';
import { AgentRun, AgentRunStatus } from './entities/agent-run.entity';
import { OrchestratorService } from './orchestrator.service';
import { createAgentTaskId, readAgentRuntimeConfig } from './agent-runtime.config';

@Injectable()
export class AgentService implements OnModuleInit {
  private readonly logger = new Logger(AgentService.name);
  private readonly runtime = readAgentRuntimeConfig();
  private readonly workerId =
    process.env.AGENT_WORKER_ID?.trim().slice(0, 160) || `api-${process.pid}`;
  constructor(
    @InjectRepository(AgentRun)
    private readonly runRepo: Repository<AgentRun>,
    private readonly orchestrator: OrchestratorService
  ) {}

  /**
   * 恢复上次进程退出前尚未开始的任务；正在运行的任务可能已产生外部副作用，
   * 因此标记为 interrupted，交给后续显式 replay 流程，而不是自动重复扣费。
   */
  async onModuleInit(): Promise<void> {
    const running = await this.runRepo.find({ where: { status: 'running' }, take: 50 });
    const now = Date.now();
    const interrupted = running.filter(
      (run) => !run.leaseUntil || new Date(run.leaseUntil).getTime() <= now
    );
    if (interrupted.length) {
      await this.runRepo.update(
        interrupted.map((run) => run.id),
        {
          status: 'failed',
          currentNode: 'interrupted',
          errorMessage: '服务进程在任务执行期间退出，请通过 replay 流程重新运行',
          completedAt: new Date(),
        }
      );
      this.logger.warn(`已标记 ${interrupted.length} 个中断中的 Agent 任务，未自动重复执行`);
    }

    // 先处理遗留的 running，再启动 pending，避免本轮恢复刚启动的任务被误判为中断。
    const pending = await this.runRepo.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
      take: 10,
    });
    for (const run of pending) {
      const dto = { ...run.input, userId: run.userId } as RunAgentDto;
      void this.execute(run.id, dto, run.createdAt ?? new Date()).catch((error) => {
        this.logger.error(`恢复 Agent 任务失败 ${run.id}: ${error?.message ?? error}`);
      });
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

    void this.execute(taskId, dto, startedAt);
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

  private async execute(taskId: string, dto: RunAgentDto, startedAt: Date): Promise<void> {
    const queued = await this.runRepo.findOne({ where: { id: taskId } });
    if (!queued || queued.status === 'cancelled') return;

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
      await this.runRepo.update(taskId, {
        status: result.status as AgentRunStatus,
        currentNode: result.currentNode,
        progress: result.progress,
        result: result.result as Record<string, unknown>,
        errorMessage: result.error ?? null,
        completedAt: result.completedAt ?? new Date(),
        leaseUntil: null,
        heartbeatAt: new Date(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.runRepo.update(taskId, {
        status: 'failed',
        currentNode: 'failed',
        errorMessage: message.slice(0, 500),
        completedAt: new Date(),
        leaseUntil: null,
        heartbeatAt: new Date(),
      });
    }
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
