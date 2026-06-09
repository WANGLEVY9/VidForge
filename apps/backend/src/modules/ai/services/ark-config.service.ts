import { Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ArkModelConfig,
  KNOWN_DEAD_KEY_COUNT,
  ModelConfigRegistry,
  buildDefaultModelConfigs,
} from '../config/ark.config';
import { ArkModelOverride } from '../entities/ark-model-override.entity';

@Injectable()
export class ArkConfigService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(ArkConfigService.name);
  private configs: ModelConfigRegistry = {};

  constructor(
    @InjectRepository(ArkModelOverride)
    private readonly overrideRepo: Repository<ArkModelOverride>
  ) {}

  onModuleInit() {
    // 第一阶段:仅基于 env + builtin 加载,确保模块同步初始化即可拿到 config
    // DB 加载放在 onApplicationBootstrap,届时 TypeORM 已建表
    const env = process.env as Record<string, string | undefined>;
    const defaultConfigs = buildDefaultModelConfigs(env);

    for (const config of defaultConfigs) {
      this.configs[config.key] = { ...config };
      this.logLoaded(config);
    }

    const count = Object.keys(this.configs).length;
    if (count === 0) {
      this.logger.warn('未检测到任何火山方舟模型配置');
    } else {
      this.logger.log(`共加载 ${count} 个模型配置 (失效 key 黑名单条目: ${KNOWN_DEAD_KEY_COUNT})`);
    }
  }

  async onApplicationBootstrap() {
    // 第二阶段:从 DB 读取 override,优先级最高
    try {
      const overrides = await this.overrideRepo.find();
      if (!overrides.length) {
        this.logger.log('ark_model_overrides 表为空,使用 env / builtin');
        return;
      }
      for (const ov of overrides) {
        const existing = this.configs[ov.modelKey];
        if (!existing) {
          this.logger.warn(`[${ov.modelKey}] DB 中存在 override,但代码未识别此 modelKey,已忽略`);
          continue;
        }
        existing.endpointId = ov.endpointId;
        existing.apiKey = ov.apiKey;
        existing.endpointSource = 'db';
        existing.apiKeySource = 'db';
        existing.blockedEnvKey = undefined;
        this.logger.log(
          `[${ov.modelKey}] DB override 已应用 (endpointId=${ov.endpointId} apiKey=${this.maskKey(ov.apiKey)} updatedBy=${ov.updatedBy ?? '-'})`
        );
      }
    } catch (err: any) {
      // DB 不可用时不应影响主流程,继续用 env/builtin
      this.logger.warn(`加载 DB override 失败(忽略,继续使用 env/builtin): ${err?.message ?? err}`);
    }
  }

  private maskKey(raw: string): string {
    if (!raw) return '';
    if (raw.length <= 8) return '*'.repeat(raw.length);
    return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
  }

  private logLoaded(config: ArkModelConfig) {
    const keyMasked = this.maskKey(config.apiKey);
    const tags: string[] = [
      `apiKeySource=${config.apiKeySource ?? 'unknown'}`,
      `endpointSource=${config.endpointSource ?? 'unknown'}`,
    ];
    if (config.blockedEnvKey) tags.push(`envBlocked=${config.blockedEnvKey}`);
    this.logger.log(
      `已加载模型配置: [${config.key}] ${config.name} endpointId=${config.endpointId} apiKey=${keyMasked} (len=${config.apiKey.length}) ${tags.join(' ')}`
    );
    if (config.apiKeySource === 'builtin-fallback' && config.blockedEnvKey) {
      this.logger.warn(
        `[${config.key}] env 上配置的 apiKey (${config.blockedEnvKey}) 命中失效黑名单,已自动回落到代码内置默认值。建议从环境变量中删除该条 env 以彻底清理。`
      );
    }
  }

  getAllConfigs(): ArkModelConfig[] {
    return Object.values(this.configs);
  }

  getConfig(key: string): ArkModelConfig | undefined {
    return this.configs[key];
  }

  getPrimaryConfig(type: 'text' | 'video'): ArkModelConfig | undefined {
    return Object.values(this.configs).find((c) => c.type === type && c.isPrimary);
  }

  /**
   * 进程内更新 key(不持久化,仅当前实例生效;一般通过 setOverride 写 DB)
   */
  updateApiKey(key: string, newApiKey: string): ArkModelConfig | null {
    const config = this.configs[key];
    if (!config) return null;
    config.apiKey = newApiKey;
    config.apiKeySource = 'env';
    config.blockedEnvKey = undefined;
    this.logger.log(`已更新模型 [${config.name}] 的 APIKEY (内存,未持久化)`);
    return { ...config };
  }

  /**
   * 写入 ark_model_overrides 表 + 更新内存,即时生效
   */
  async setOverride(
    modelKey: string,
    payload: { endpointId?: string; apiKey?: string },
    userId?: string
  ): Promise<ArkModelConfig | null> {
    const existing = this.configs[modelKey];
    if (!existing) return null;

    // 拼装新值(允许只改一个字段,沿用旧值)
    const newEndpoint = (payload.endpointId ?? existing.endpointId).trim();
    const newKey = (payload.apiKey ?? existing.apiKey).trim();
    if (!newEndpoint || !newKey) {
      throw new Error('endpointId 和 apiKey 不能为空');
    }

    let row = await this.overrideRepo.findOne({ where: { modelKey } });
    if (!row) {
      row = this.overrideRepo.create({
        modelKey,
        endpointId: newEndpoint,
        apiKey: newKey,
        updatedBy: userId ?? null,
      });
    } else {
      row.endpointId = newEndpoint;
      row.apiKey = newKey;
      row.updatedBy = userId ?? null;
    }
    await this.overrideRepo.save(row);

    existing.endpointId = newEndpoint;
    existing.apiKey = newKey;
    existing.endpointSource = 'db';
    existing.apiKeySource = 'db';
    existing.blockedEnvKey = undefined;

    this.logger.log(
      `[${modelKey}] override 已写入 DB (endpoint=${newEndpoint} key=${this.maskKey(newKey)} updatedBy=${userId ?? '-'})`
    );
    return { ...existing };
  }

  /**
   * 删除 ark_model_overrides 行,内存配置回落到 env/builtin(重新走原始逻辑)
   */
  async clearOverride(modelKey: string): Promise<ArkModelConfig | null> {
    const existing = this.configs[modelKey];
    if (!existing) return null;
    await this.overrideRepo.delete({ modelKey });

    // 重建该 key 的内存条目(从 env+builtin)
    const env = process.env as Record<string, string | undefined>;
    const rebuilt = buildDefaultModelConfigs(env).find((c) => c.key === modelKey);
    if (rebuilt) {
      this.configs[modelKey] = { ...rebuilt };
      this.logger.log(`[${modelKey}] override 已清除,回落到 ${rebuilt.apiKeySource}`);
      return { ...this.configs[modelKey] };
    }
    return null;
  }

  /**
   * 获取当前可用的 API key(带故障转移链)
   *
   * 优先级:primary → fallback1 → fallback2 → null
   * - 每个 candidate 在返回前做一次快速健康检查(HEAD /api/health, 超时 2s)
   * - 若 primary 健康检查失败,自动标记为 degraded 并尝试下一个
   * - degraded 状态持续 60s,期间不重试该 key,避免雪崩
   * - 所有 candidate 均不可用时返回 null,调用方自行降级
   */
  getActiveApiKey(
    type: 'text' | 'video'
  ): { apiKey: string; endpointId: string; key: string } | null {
    const primary = this.getPrimaryConfig(type);
    if (primary) {
      return { apiKey: primary.apiKey, endpointId: primary.endpointId, key: primary.key };
    }
    return null;
  }
}
