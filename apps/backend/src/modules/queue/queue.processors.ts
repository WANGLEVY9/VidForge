import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { MaterialService } from '../material/material.service';
import { AgentService } from '../agent/agent.service';
import { CreationService } from '../creation/creation.service';
import { ExportService } from '../export/export.service';
import type { AgentDispatchPayload } from '../agent/outbox/agent-outbox.service';
import type { CreationComposeJob, CreationShotJob, ExportEncodeJob } from './queue.payloads';

/**
 * Media Worker business processors.
 *
 * Jobs contain JSON-serializable snapshots and the processor resolves the
 * domain service inside the worker process. No function references or API
 * process callbacks cross the Redis boundary. Stable job IDs are assigned by
 * the enqueueing service, while BullMQ retries transient worker failures.
 */
@Processor(QUEUE_NAMES.CREATION_SHOT, { concurrency: readMediaWorkerConcurrency() })
export class CreationShotProcessor extends WorkerHost {
  private readonly logger = new Logger(CreationShotProcessor.name);

  private creationService: CreationService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<CreationShotJob>): Promise<{ ok: true; taskId: string }> {
    if (!this.creationService) {
      this.creationService = this.moduleRef.get(CreationService, { strict: false });
    }
    const { taskId, dto } = job.data;
    if (!taskId || !dto) throw new Error('creation-shot job 缺少 taskId 或 dto');
    this.logger.log(`[creation:shot] processing ${job.name} id=${job.id}`);
    await this.creationService.processShots(taskId, dto);
    return { ok: true, taskId };
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`[creation:shot] completed ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`[creation:shot] failed ${job.id}: ${err.message}`);
  }
}

@Processor(QUEUE_NAMES.CREATION_COMPOSE, { concurrency: readMediaWorkerConcurrency() })
export class CreationComposeProcessor extends WorkerHost {
  private readonly logger = new Logger(CreationComposeProcessor.name);

  private creationService: CreationService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<CreationComposeJob>): Promise<{ ok: true; taskId: string }> {
    if (!this.creationService) {
      this.creationService = this.moduleRef.get(CreationService, { strict: false });
    }
    const { taskId, dto } = job.data;
    if (!taskId || !dto) throw new Error('creation-compose job 缺少 taskId 或 dto');
    this.logger.log(`[creation:compose] processing ${job.name} id=${job.id}`);
    await this.creationService.processComposition(taskId, dto);
    return { ok: true, taskId };
  }
}

@Processor(QUEUE_NAMES.EXPORT_ENCODE, { concurrency: readMediaWorkerConcurrency() })
export class ExportEncodeProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportEncodeProcessor.name);

  private exportService: ExportService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<ExportEncodeJob>): Promise<{ ok: true; taskId: string }> {
    if (!this.exportService) {
      this.exportService = this.moduleRef.get(ExportService, { strict: false });
    }
    const { taskId, sourceUrl } = job.data;
    if (!taskId) throw new Error('export-encode job 缺少 taskId');
    this.logger.log(`[export:encode] processing ${job.name} id=${job.id}`);
    await this.exportService.processExport(taskId, sourceUrl);
    return { ok: true, taskId };
  }
}

@Processor(QUEUE_NAMES.MATERIAL_ANALYZE)
export class MaterialAnalyzeProcessor extends WorkerHost {
  private readonly logger = new Logger(MaterialAnalyzeProcessor.name);
  private materialService: MaterialService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<{ userId: string; materialId: string; category?: string }>): Promise<any> {
    this.logger.log(`[material:analyze] processing job=${job.id} material=${job.data.materialId}`);

    // 延迟获取 MaterialService:QueueModule 初始化早于 MaterialModule
    if (!this.materialService) {
      this.materialService = this.moduleRef.get(MaterialService, { strict: false });
    }

    const { userId, materialId, category } = job.data;
    try {
      const result = await this.materialService.analyzeTags(userId, materialId, { category });
      const caption = (result.metadata as any)?.caption ?? 'ok';
      this.logger.log(`[material:analyze] completed ${materialId}: ${caption}`);
      return { ok: true, materialId, caption };
    } catch (err: any) {
      this.logger.error(`[material:analyze] failed ${materialId}: ${err.message}`);
      throw err; // BullMQ 自动重试
    }
  }
}

/**
 * Agent workflow worker.
 *
 * This processor is registered only when PROCESS_ROLE=agent-worker. The API
 * process can therefore enqueue durable runs without also consuming them.
 * ModuleRef keeps QueueModule independent from AgentModule's provider graph.
 */
@Processor(QUEUE_NAMES.AGENT_RUN, { concurrency: readAgentWorkerConcurrency() })
export class AgentRunProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentRunProcessor.name);
  private agentService: AgentService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<AgentDispatchPayload>): Promise<{ ok: true; taskId: string }> {
    if (!this.agentService) {
      this.agentService = this.moduleRef.get(AgentService, { strict: false });
    }
    const { taskId } = job.data;
    if (!taskId) throw new Error('Agent worker job 缺少 taskId');
    this.logger.log(`[agent] processing task=${taskId} job=${job.id}`);
    await this.agentService.executeQueuedRun(taskId, job.data);
    return { ok: true, taskId };
  }
}

function readAgentWorkerConcurrency(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.AGENT_WORKER_CONCURRENCY ?? '2', 10);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(parsed, 16));
}

function readMediaWorkerConcurrency(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.MEDIA_WORKER_CONCURRENCY ?? '2', 10);
  if (!Number.isFinite(parsed)) return 2;
  return Math.max(1, Math.min(parsed, 8));
}

export const __queueProcessorTestables = {
  readAgentWorkerConcurrency,
  readMediaWorkerConcurrency,
};
