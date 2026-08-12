import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

interface CacheEntry {
  value: any;
  hitCount: number;
  storedAt: number;
  /** 估算节省的 token 数(用 promptTokens + completionTokens) */
  savedTokens: number;
}

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
 * 该缓存内存级,进程重启清空。生产可后续替换为 Redis。
 */
@Injectable()
export class ArkResponseCacheService {
  private readonly logger = new Logger(ArkResponseCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly maxSize = 1000;
  private readonly ttlMs = 6 * 60 * 60 * 1000; // 6 小时
  private hitCount = 0;
  private missCount = 0;
  private savedTokensTotal = 0;

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
  get(input: {
    model: string;
    messages: any[];
    temperature?: number;
    maxTokens?: number;
  }): any | null {
    if (!this.shouldCache(input.temperature)) return null;

    const key = this.buildKey(input);
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
    entry.hitCount += 1;
    this.hitCount += 1;
    this.savedTokensTotal += entry.savedTokens;
    this.logger.debug(
      `[cache HIT] key=${key.slice(0, 8)} 累计节省 ${this.savedTokensTotal} tokens`
    );
    return entry.value;
  }

  /** 写入缓存 */
  set(
    input: { model: string; messages: any[]; temperature?: number; maxTokens?: number },
    value: any,
    savedTokens = 0
  ): void {
    if (!this.shouldCache(input.temperature)) return;

    const key = this.buildKey(input);
    if (this.cache.size >= this.maxSize) {
      // 淘汰最早一条
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      hitCount: 0,
      storedAt: Date.now(),
      savedTokens,
    });
  }

  stats(): {
    size: number;
    hitCount: number;
    missCount: number;
    hitRate: number;
    savedTokensTotal: number;
  } {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate: total > 0 ? Math.round((this.hitCount / total) * 1000) / 10 : 0,
      savedTokensTotal: this.savedTokensTotal,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.savedTokensTotal = 0;
  }
}
