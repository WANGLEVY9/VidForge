import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ArkModelConfig,
  KNOWN_DEAD_KEY_COUNT,
  ModelConfigRegistry,
  buildDefaultModelConfigs,
} from '../config/ark.config';

@Injectable()
export class ArkConfigService implements OnModuleInit {
  private readonly logger = new Logger(ArkConfigService.name);
  private configs: ModelConfigRegistry = {};

  onModuleInit() {
    const env = process.env as Record<string, string | undefined>;
    const defaultConfigs = buildDefaultModelConfigs(env);

    for (const config of defaultConfigs) {
      this.configs[config.key] = { ...config };
      const keyMasked =
        config.apiKey.length <= 8
          ? '*'.repeat(config.apiKey.length)
          : `${config.apiKey.slice(0, 4)}...${config.apiKey.slice(-4)}`;
      const tags: string[] = [
        `apiKeySource=${config.apiKeySource ?? 'unknown'}`,
        `endpointSource=${config.endpointSource ?? 'unknown'}`,
      ];
      if (config.blockedEnvKey) {
        tags.push(`envBlocked=${config.blockedEnvKey}`);
      }
      this.logger.log(
        `已加载模型配置: [${config.key}] ${config.name} endpointId=${config.endpointId} apiKey=${keyMasked} (len=${config.apiKey.length}) ${tags.join(' ')}`,
      );

      // 当 env 上的 key 被黑名单屏蔽时,显式 warn 一行,运维一眼能看到
      if (config.apiKeySource === 'builtin-fallback' && config.blockedEnvKey) {
        this.logger.warn(
          `[${config.key}] env 上配置的 apiKey (${config.blockedEnvKey}) 命中失效黑名单,已自动回落到代码内置默认值。建议从环境变量中删除该条 env 以彻底清理。`,
        );
      }
    }

    const count = Object.keys(this.configs).length;
    if (count === 0) {
      this.logger.warn('未检测到任何火山方舟模型配置');
    } else {
      this.logger.log(
        `共加载 ${count} 个模型配置 (失效 key 黑名单条目: ${KNOWN_DEAD_KEY_COUNT})`,
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

  updateApiKey(key: string, newApiKey: string): ArkModelConfig | null {
    const config = this.configs[key];
    if (!config) return null;
    config.apiKey = newApiKey;
    // 通过 API 改 key 时,认为是 env 之外的运行时覆盖,标记为 env(避免诊断端点误判)
    config.apiKeySource = 'env';
    config.blockedEnvKey = undefined;
    this.logger.log(`已更新模型 [${config.name}] 的 APIKEY`);
    return { ...config };
  }

  getActiveApiKey(type: 'text' | 'video'): { apiKey: string; endpointId: string; key: string } | null {
    const primary = this.getPrimaryConfig(type);
    if (primary) {
      return { apiKey: primary.apiKey, endpointId: primary.endpointId, key: primary.key };
    }
    return null;
  }
}
