import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

/**
 * 队列运行器 - 屏蔽"是否真的连得上 Redis"的复杂度。
 *
 * - 启动时 ping Redis,确认 BullMQ 队列可用
 * - 业务 Service 通过 enqueue() 调用,内部判断:
 *    - 队列连接 OK → 投递到 BullMQ
 *    - 队列连接坏 → 在当前进程异步执行 fallback(便于本地零依赖体验)
 *
 * 这样既具备生产级队列能力(重启不丢、可水平扩展、可观测),
 * 也保留了"开箱即用"的开发体验。
 */
@Injectable()
export class QueueRunnerService {
  private readonly logger = new Logger(QueueRunnerService.name);
  private redisHealthy: boolean | null = null;

  constructor(
    @InjectQueue(QUEUE_NAMES.CREATION_SHOT) private readonly shotQueue: Queue,
    @InjectQueue(QUEUE_NAMES.CREATION_COMPOSE) private readonly composeQueue: Queue,
    @InjectQueue(QUEUE_NAMES.EXPORT_ENCODE) private readonly exportQueue: Queue,
    @InjectQueue(QUEUE_NAMES.MATERIAL_ANALYZE) private readonly materialQueue: Queue,
  ) {}

  /**
   * 异步检测 Redis 是否可达。结果会缓存。
   * 任何 BullMQ Queue 都共用同一个 Redis 连接,任选一个 ping 即可。
   */
  async isRedisHealthy(): Promise<boolean> {
    if (this.redisHealthy !== null) return this.redisHealthy;
    try {
      const client: any = await this.shotQueue.client;
      // ioredis 暴露 ping(),IRedisClient 类型未导出 ping;用 any 绕过
      if (typeof client?.ping === 'function') {
        await client.ping();
      }
      this.redisHealthy = true;
      this.logger.log('队列 Redis 连接正常,使用 BullMQ 持久化队列');
    } catch (err: any) {
      this.redisHealthy = false;
      this.logger.warn(
        `队列 Redis 不可达 (${err?.message ?? err}),降级到进程内异步执行。生产环境务必配置 REDIS_URL。`,
      );
    }
    return this.redisHealthy;
  }

  /**
   * 通用入队接口。
   * @param queueName 队列名
   * @param jobName 任务名
   * @param data 任务载荷
   * @param fallback 当 Redis 不可达时,本地异步执行的降级函数
   * @param options BullMQ 任务选项覆盖
   */
  async enqueue<T>(
    queueName: string,
    jobName: string,
    data: T,
    fallback: () => Promise<void>,
    options?: { priority?: number; delay?: number; attempts?: number },
  ): Promise<{ jobId?: string; mode: 'queue' | 'inline' }> {
    const healthy = await this.isRedisHealthy();
    if (!healthy) {
      // 进程内 fire-and-forget
      void fallback().catch((err) => {
        this.logger.error(`[inline:${queueName}] ${err?.message ?? err}`);
      });
      return { mode: 'inline' };
    }

    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, {
      priority: options?.priority,
      delay: options?.delay,
      attempts: options?.attempts ?? 3,
    });
    this.logger.log(`[queue:${queueName}] 入队 ${jobName} jobId=${job.id}`);
    return { jobId: String(job.id), mode: 'queue' };
  }

  /** 获取所有队列的真实计数,供 Analytics QueueStatus 使用 */
  async getCounts(): Promise<Record<string, any>> {
    const healthy = await this.isRedisHealthy();
    if (!healthy) {
      return {
        mode: 'inline',
        queues: {},
      };
    }
    const queues = [
      { name: QUEUE_NAMES.CREATION_SHOT, q: this.shotQueue },
      { name: QUEUE_NAMES.CREATION_COMPOSE, q: this.composeQueue },
      { name: QUEUE_NAMES.EXPORT_ENCODE, q: this.exportQueue },
      { name: QUEUE_NAMES.MATERIAL_ANALYZE, q: this.materialQueue },
    ];

    const result: Record<string, any> = {};
    for (const { name, q } of queues) {
      try {
        result[name] = await q.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        );
      } catch (err: any) {
        result[name] = { error: err?.message ?? String(err) };
      }
    }
    return { mode: 'queue', queues: result };
  }

  private getQueue(name: string): Queue {
    switch (name) {
      case QUEUE_NAMES.CREATION_SHOT:
        return this.shotQueue;
      case QUEUE_NAMES.CREATION_COMPOSE:
        return this.composeQueue;
      case QUEUE_NAMES.EXPORT_ENCODE:
        return this.exportQueue;
      case QUEUE_NAMES.MATERIAL_ANALYZE:
        return this.materialQueue;
      default:
        throw new Error(`未知队列: ${name}`);
    }
  }
}
