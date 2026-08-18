import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, LessThanOrEqual, Repository } from 'typeorm';
import { AgentOutboxEvent } from './agent-outbox-event.entity';
import { QueueRunnerService } from '../../queue/queue-runner.service';
import { JOB_NAMES, QUEUE_NAMES } from '../../queue/queue.constants';

export interface AgentDispatchPayload {
  taskId: string;
  resume?: { approved: boolean; feedback?: string };
  mode?: 'initial' | 'resume' | 'replay' | 'fork';
  fork?: { threadId: string; checkpointId: string; nextNode: string; seeded?: boolean };
}

/**
 * Dispatches Agent jobs from a database-backed transactional outbox.
 *
 * The dispatcher is deliberately at-least-once. BullMQ's stable job ID and
 * the AgentRun conditional claim provide the second half of the boundary:
 * duplicate delivery is safe, while a crash never silently loses a run.
 */
@Injectable()
export class AgentOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentOutboxService.name);
  private readonly dispatcherId =
    process.env.AGENT_WORKER_ID?.trim().slice(0, 160) || `outbox-${process.pid}`;
  private timer: ReturnType<typeof setInterval> | undefined;
  private flushing = false;

  constructor(
    @InjectRepository(AgentOutboxEvent)
    private readonly outboxRepo: Repository<AgentOutboxEvent>,
    private readonly queueRunner: QueueRunnerService
  ) {}

  private agentFallback: ((payload: AgentDispatchPayload) => Promise<void>) | undefined;

  async onModuleInit(): Promise<void> {
    setImmediate(() => void this.flush());
    this.timer = setInterval(() => void this.flush(), 2_000);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  registerAgentFallback(handler: (payload: AgentDispatchPayload) => Promise<void>): void {
    this.agentFallback = handler;
  }

  /** Add the initial Agent dispatch in the same DB transaction as AgentRun. */
  async addRunEvent(manager: EntityManager, payload: AgentDispatchPayload): Promise<void> {
    const repo = manager.getRepository(AgentOutboxEvent);
    await repo.save(
      repo.create({
        eventType: JOB_NAMES.RUN_AGENT,
        aggregateId: payload.taskId,
        dedupeKey: this.dedupeKey(payload),
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
        attempts: 0,
        availableAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        dispatchedAt: null,
        lastError: null,
      })
    );
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    try {
      await this.requeueExpiredLocks();
      const events = await this.outboxRepo.find({
        where: [
          { status: 'pending', availableAt: LessThanOrEqual(new Date()) },
          { status: 'failed', availableAt: LessThanOrEqual(new Date()) },
        ],
        order: { createdAt: 'ASC' },
        take: 20,
      });
      for (const event of events) {
        if (!(await this.claim(event))) continue;
        await this.dispatch(event);
      }
    } finally {
      this.flushing = false;
    }
  }

  private async claim(event: AgentOutboxEvent): Promise<boolean> {
    const result = await this.outboxRepo.update(
      {
        id: event.id,
        status: event.status,
      },
      {
        status: 'dispatching',
        attempts: () => '"attempts" + 1',
        lockedAt: new Date(),
        lockedBy: this.dispatcherId,
        lastError: null,
      }
    );
    return (result.affected ?? 0) > 0;
  }

  private async dispatch(event: AgentOutboxEvent): Promise<void> {
    try {
      const payload = event.payload as unknown as AgentDispatchPayload;
      await this.queueRunner.enqueue(
        QUEUE_NAMES.AGENT_RUN,
        event.eventType,
        payload,
        async () => {
          if (!this.agentFallback) {
            throw new Error('Agent inline fallback is not registered');
          }
          await this.agentFallback(payload);
        },
        { jobId: `agent-run:${payload.taskId}:${event.id}` }
      );
      await this.outboxRepo.update(event.id, {
        status: 'dispatched',
        dispatchedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      });
    } catch (error: any) {
      const attempts = event.attempts ?? 1;
      const terminal = attempts >= 10;
      await this.outboxRepo.update(event.id, {
        status: terminal ? 'failed' : 'pending',
        availableAt: new Date(Date.now() + Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6))),
        lockedAt: null,
        lockedBy: null,
        lastError: String(error?.message ?? error).slice(0, 500),
      });
      this.logger.warn(
        `Agent outbox dispatch ${terminal ? 'failed permanently' : 'will retry'} ${event.id}: ${error?.message ?? error}`
      );
    }
  }

  private async requeueExpiredLocks(): Promise<void> {
    await this.outboxRepo.update(
      {
        status: 'dispatching',
        lockedAt: LessThanOrEqual(new Date(Date.now() - 60_000)),
      },
      {
        status: 'pending',
        availableAt: new Date(),
        lockedAt: null,
        lockedBy: null,
      }
    );
  }

  private dedupeKey(payload: AgentDispatchPayload): string {
    const suffix =
      payload.mode === 'initial' || !payload.mode ? 'initial' : `${payload.mode}:${Date.now()}`;
    return `agent-run:${payload.taskId}:${suffix}`;
  }
}

export const __outboxTestables = { AgentOutboxService };
