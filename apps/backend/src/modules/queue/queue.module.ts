import { Module, DynamicModule, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { QueueRunnerService } from './queue-runner.service';
import {
  CreationShotProcessor,
  CreationComposeProcessor,
  ExportEncodeProcessor,
  MaterialAnalyzeProcessor,
} from './queue.processors';
import { readQueueRuntimeConfig } from './queue-runtime.config';

/**
 * 全局队列基础设施(条件加载版本)
 *
 * 设计:
 * - 当环境变量 REDIS_URL 配置存在时,加载完整的 BullMQ 体系(Queue + Worker)
 * - 当 REDIS_URL 不存在时,只暴露 QueueRunnerService 的 stub 实现;
 *   本地开发可走进程内 fallback,生产-like 环境则拒绝队列任务
 *
 * 这避免了在没有 Redis 的本地环境下应用启动被 ioredis 重连风暴卡死,
 * 同时避免生产环境把长任务静默放回 API 进程。
 *
 * 启动后 QueueRunnerService 会通过 isRedisHealthy() 决定具体执行路径。
 */
@Global()
@Module({})
export class QueueModule {
  static forRoot(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;
    const runtime = readQueueRuntimeConfig();
    const useRealQueue =
      !!redisUrl && (redisUrl.startsWith('redis://') || redisUrl.startsWith('rediss://'));

    if (!useRealQueue) {
      // 没配 Redis:不注册 BullMQ 任何东西,只暴露一个 stub QueueRunnerService
      return {
        module: QueueModule,
        global: true,
        providers: [
          {
            provide: QueueRunnerService,
            useValue: createInlineRunner(runtime.allowInlineFallback),
          },
        ],
        exports: [QueueRunnerService],
      };
    }

    // 真正接 Redis 时,注册完整的 BullMQ
    return {
      module: QueueModule,
      global: true,
      imports: [
        BullModule.forRootAsync({
          useFactory: () => ({
            connection: {
              ...parseRedisUrl(redisUrl!),
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              // 重连兜底:连续失败 5 次放弃
              retryStrategy: (times: number) => {
                if (times > 5) return null;
                return Math.min(times * 1000, 5000);
              },
              connectTimeout: 10000,
            },
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 2000 },
              removeOnComplete: { count: 200, age: 24 * 3600 },
              removeOnFail: { count: 1000, age: 7 * 24 * 3600 },
            },
          }),
        }),
        BullModule.registerQueue(
          { name: QUEUE_NAMES.CREATION_SHOT },
          { name: QUEUE_NAMES.CREATION_COMPOSE },
          { name: QUEUE_NAMES.EXPORT_ENCODE },
          { name: QUEUE_NAMES.MATERIAL_ANALYZE }
        ),
      ],
      providers: [
        QueueRunnerService,
        CreationShotProcessor,
        CreationComposeProcessor,
        ExportEncodeProcessor,
        MaterialAnalyzeProcessor,
      ],
      exports: [BullModule, QueueRunnerService],
    };
  }
}

/** 不依赖 BullMQ 的 inline 版 QueueRunnerService(Redis 未配置时使用) */
function createInlineRunner(allowInlineFallback: boolean): QueueRunnerService {
  // 用 Object.create 绕过构造函数(它要求 4 个 @InjectQueue 参数)
  const stub = Object.create(QueueRunnerService.prototype) as QueueRunnerService;
  // 把内部状态置为"健康检测已完成,Redis 不可用"
  (stub as any).redisHealthy = false;
  (stub as any).logger = console;
  (stub as any).shotQueue = null;
  (stub as any).composeQueue = null;
  (stub as any).exportQueue = null;
  (stub as any).materialQueue = null;

  // 重写 isRedisHealthy / enqueue / getCounts 为 inline 实现
  stub.isRedisHealthy = async () => false;
  stub.enqueue = async (_q, _name, _data, fallback) => {
    if (!allowInlineFallback) {
      throw new Error(
        'Redis is required in this environment. Configure REDIS_URL or explicitly set QUEUE_INLINE_FALLBACK=true.'
      );
    }
    void fallback().catch((err) => {
      console.error(`[inline-fallback] ${err?.message ?? err}`);
    });
    return { mode: 'inline' as const };
  };
  stub.getCounts = async () => ({ mode: 'inline', queues: {} });
  return stub;
}

function parseRedisUrl(url: string) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port ? Number(u.port) : 6379,
      password: u.password || undefined,
      username: u.username || undefined,
      db: u.pathname && u.pathname !== '/' ? Number(u.pathname.slice(1)) : 0,
      tls: u.protocol === 'rediss:' ? {} : undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}
