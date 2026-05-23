import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ArkModelConfig, ModelConfigRegistry, buildDefaultModelConfigs } from '../config/ark.config';

@Injectable()
export class ArkConfigService implements OnModuleInit {
  private readonly logger = new Logger(ArkConfigService.name);
  private configs: ModelConfigRegistry = {};

  onModuleInit() {
    const env = process.env as Record<string, string | undefined>;
    const defaultConfigs = buildDefaultModelConfigs(env);

    for (const config of defaultConfigs) {
      this.configs[config.key] = { ...config };
      this.logger.log(`已加载模型配置: [${config.key}] ${config.name}`);
    }

    const count = Object.keys(this.configs).length;
    if (count === 0) {
      this.logger.warn('未检测到任何火山方舟模型配置');
    } else {
      this.logger.log(`共加载 ${count} 个模型配置`);
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
