import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import { createClient } from 'redis';

interface CacheEntry {
  value: any;
  hitCount: number;
  storedAt: number;
  /** 估算节省的 token 数(用 promptTokens + completionTokens) */
  savedTokens: number;
}

type RedisClient = ReturnType<typeof createClient>;

/**
 * ARK 应用级响应缓存
 *
 * 缓存策略:
 * - Key = SHA256(model + messages JSON + temperature + maxTokens)
 * - LRU 淘汰,容量上限 1000 条
 * - 默认 TTL 6 小时(纯 prompt 不变,生成结果可复用)
 * - 不缓存 temperature > 0.5 的请求(高随机度场景需要每次新结果)
 *
 * 这一层是火山方舟自带 prompt cache 的"二级缓存":
 * - 火山 prompt cache 在 token 级别工作,可降低 ~50% 输入 token 成本
 * - 本地缓存在请求级别工作,直接返回完整响应,**0 成本 + 0 延迟**
 *
 * 命中时:不调 ARK,直接返回缓存值,trace 标记 cacheHit=true。
 *
 * Redis 可用时以 Redis 作为跨进程持久化层,内存 Map 作为本地热缓存;
 * 未配置或连接失败时安全回退到进程内缓存。
 */
@Injectable()
export class ArkResponseCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(ArkResponseCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize = 1000;
  private readonly ttlMs = 6 * 60 * 60 * 1000; // 6 小时
  private hitCount = 0;
  private missCount = 0;
  private savedTokensTotal = 0;
  private readonly redisKeyPrefix = 'vidforge:ark-response-cache:v1:';
  private readonly redisClient: RedisClient | null;
  private redisConnectPromise: Promise<RedisClient | null> | null = null;
  private redisFailureAt = 0;
  private readonly redisRetryDelayMs = 30_000;

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (!redisUrl || !/^rediss?:\/\//.test(redisUrl)) {
      this.redisClient = null;
      return;
    }

    const client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      this.redisFailureAt = Date.now();
      this.logger.warn(`ARK Redis cache 暂不可用: ${error.message}`);
    });
    this.redisClient = client;
  }

  /**
   * 缓存 key 计算
   */
  private buildKey(input: {
    model: string;
    messages: any[];
    temperature?: number;
    maxTokens?: number;
  }): string {
    const payload = {
      model: input.model,
      // messages 中可能含 image_url(base64),取 hash 而非完整内容做 key 防止 OOM
      messages: input.messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    };
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  /** 是否应当缓存(只缓存确定性高的请求) */
  shouldCache(temperature?: number): boolean {
    if (temperature === undefined) return true;
    return temperature <= 0.5;
  }

  /** 尝试取缓存 */
  async get(input: {
    model: string;
    messages: any[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<any | null> {
    if (!this.shouldCache(input.temperature)) return null;

    const key = this.buildKey(input);
    const redis = await this.getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(`${this.redisKeyPrefix}${key}`);
        if (raw) {
          const entry = JSON.parse(String(raw)) as CacheEntry;
          this.recordHit(entry, key);
          this.rememberLocal(key, entry);
          return entry.value;
        }
      } catch (error: any) {
        this.markRedisFailure(`读取失败: ${error?.message ?? error}`);
      }
    }

    const entry = this.cache.get(key);
    if (!entry) {
      this.missCount += 1;
      return null;
    }
    // TTL 检查
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.cache.delete(key);
      this.missCount += 1;
      return null;
    }
    // LRU:命中后挪到 Map 末尾
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.recordHit(entry, key);
    return entry.value;
  }

  /** 写入缓存 */
  async set(
    input: { model: string; messages: any[]; temperature?: number; maxTokens?: number },
    value: any,
    savedTokens = 0
  ): Promise<void> {
    if (!this.shouldCache(input.temperature)) return;

    const key = this.buildKey(input);
    const entry: CacheEntry = {
      value,
      hitCount: 0,
      storedAt: Date.now(),
      savedTokens,
    };
    this.rememberLocal(key, entry);

    const redis = await this.getRedisClient();
    if (redis) {
      try {
        await redis.setEx(
          `${this.redisKeyPrefix}${key}`,
          Math.floor(this.ttlMs / 1000),
          JSON.stringify(entry)
        );
      } catch (error: any) {
        this.markRedisFailure(`写入失败: ${error?.message ?? error}`);
      }
    }
  }

  stats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    savedTokensTotal: number;
    persistence: 'redis+memory' | 'memory';
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? Math.round((this.hitCount / total) * 1000) / 10 : 0,
      savedTokensTotal: this.savedTokensTotal,
      persistence: this.redisClient ? 'redis+memory' : 'memory',
    };
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.savedTokensTotal = 0;
    const redis = await this.getRedisClient();
    if (!redis) return;
    try {
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, {
          MATCH: `${this.redisKeyPrefix}*`,
          COUNT: 100,
        });
        cursor = String(result.cursor);
        if (result.keys.length) await redis.del(result.keys);
      } while (cursor !== '0');
    } catch (error: any) {
      this.markRedisFailure(`清理失败: ${error?.message ?? error}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redisClient?.isOpen) await this.redisClient.quit();
  }

  private rememberLocal(key: string, entry: CacheEntry): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.delete(key);
    this.cache.set(key, entry);
  }

  private recordHit(entry: CacheEntry, key: string): void {
    entry.hitCount += 1;
    this.hitCount += 1;
    this.savedTokensTotal += entry.savedTokens;
    this.logger.debug(
      `[cache HIT] key=${key.slice(0, 8)} 累计节省 ${this.savedTokensTotal} tokens`
    );
  }

  private async getRedisClient(): Promise<RedisClient | null> {
    if (!this.redisClient) return null;
    if (this.redisClient.isReady) return this.redisClient;
    if (Date.now() - this.redisFailureAt < this.redisRetryDelayMs) return null;
    if (!this.redisConnectPromise) {
      this.redisConnectPromise = this.redisClient
        .connect()
        .then(() => this.redisClient)
        .catch((error: unknown) => {
          this.markRedisFailure(
            `连接失败: ${error instanceof Error ? error.message : String(error)}`
          );
          return null;
        })
        .finally(() => {
          this.redisConnectPromise = null;
        });
    }
    return this.redisConnectPromise;
  }

  private markRedisFailure(message: string): void {
    this.redisFailureAt = Date.now();
    this.logger.warn(`ARK Redis cache ${message},回退内存缓存`);
  }
}
