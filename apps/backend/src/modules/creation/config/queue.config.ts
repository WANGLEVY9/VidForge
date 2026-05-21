import { QueueOptions } from 'bullmq';
import { ConfigService } from '@nestjs/config';

export const getQueueConfig = (configService: ConfigService): QueueOptions => {
  const redisUrl = configService.get('REDIS_URL');
  const url = new URL(redisUrl);
  
  return {
    connection: {
      host: url.hostname,
      port: parseInt(url.port),
      password: url.password,
      db: url.pathname ? parseInt(url.pathname.slice(1)) : 0,
    },
    defaultJobOptions: {
      attempts: 2, // 失败重试2次
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 3600, // 成功的任务保留1小时
        count: 1000, // 最多保留1000条
      },
      removeOnFail: {
        age: 86400, // 失败的任务保留1天
      },
    },
  };
};

export const VIDEO_RENDER_QUEUE = 'video-render-queue';
