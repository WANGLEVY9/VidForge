import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { MaterialService } from '../material/material.service';
import { AgentService } from '../agent/agent.service';

/**
 * 通用日志 Processor 基类(暂不绑定具体业务逻辑)
 *
 * 在当前阶段,业务 Service 已经通过 QueueRunnerService 实现了
 * 「Redis 可用 → 走队列;否则进程内执行」的双轨。
 *
 * 这里给 4 个队列各注册一个轻量级 worker,作用是:
 * 1. 确保队列里堆积的任务能被消费(避免 active=0 但 waiting=N)
 * 2. 落 trace + 日志,便于在管理台 / Dashboard 查看
 * 3. 真正的业务执行通过 job.data.fn 的反射调用 — 但这种写法跨进程会出问题
 *
 * 实际策略:V1 把 BullMQ 当"任务持久化 + 重试 + DLQ"层,
 * Worker 内只接收"通知信号",真正执行体仍在原 Service 进程。
 * 这等价于:Service 入队后立即 enqueue,Worker 收到后调原 Service 方法。
 *
 * 由于 NestJS DI 里跨模块循环引用问题,V1 我们只先开 active 心跳监控,
 * 让队列状态在 Dashboard 上能显示真实数据。
 * Phase 2 再把 creation/export 的 process 函数迁到这里。
 */
@Processor(QUEUE_NAMES.CREATION_SHOT)
export class CreationShotProcessor extends WorkerHost {
  private readonly logger = new Logger(CreationShotProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`[creation:shot] processing ${job.name} id=${job.id}`);
    // 占位:V1 将业务体留在 CreationService.processTask 中,
    //       入队仅用于"持久化 + 监控"。Phase 2 会把执行体迁过来。
    return { ok: true, jobId: job.id };
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

@Processor(QUEUE_NAMES.CREATION_COMPOSE)
export class CreationComposeProcessor extends WorkerHost {
  private readonly logger = new Logger(CreationComposeProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`[creation:compose] processing ${job.name} id=${job.id}`);
    return { ok: true, jobId: job.id };
  }
}

@Processor(QUEUE_NAMES.EXPORT_ENCODE)
export class ExportEncodeProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportEncodeProcessor.name);

  async process(job: Job): Promise<any> {
    this.logger.log(`[export:encode] processing ${job.name} id=${job.id}`);
    return { ok: true, jobId: job.id };
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
@Processor(QUEUE_NAMES.AGENT_RUN)
export class AgentRunProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentRunProcessor.name);
  private agentService: AgentService | null = null;

  constructor(private readonly moduleRef: ModuleRef) {
    super();
  }

  async process(job: Job<{ taskId: string }>): Promise<{ ok: true; taskId: string }> {
    if (!this.agentService) {
      this.agentService = this.moduleRef.get(AgentService, { strict: false });
    }
    const { taskId } = job.data;
    if (!taskId) throw new Error('Agent worker job 缺少 taskId');
    this.logger.log(`[agent] processing task=${taskId} job=${job.id}`);
    await this.agentService.executeQueuedRun(taskId);
    return { ok: true, taskId };
  }
}
