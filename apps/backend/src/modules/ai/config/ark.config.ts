export interface ArkModelConfig {
  key: string;
  type: 'text' | 'video';
  name: string;
  endpointId: string;
  apiKey: string;
  isPrimary: boolean;
  description?: string;
  rateLimit?: string;
}

export type ModelConfigRegistry = Record<string, ArkModelConfig>;

export function buildDefaultModelConfigs(env: Record<string, string | undefined>): ArkModelConfig[] {
  const configs: ArkModelConfig[] = [];

  const textPrimaryEp = env['ARK_TEXT_PRIMARY_ENDPOINT_ID'];
  const textPrimaryKey = env['ARK_TEXT_PRIMARY_API_KEY'];
  if (textPrimaryEp && textPrimaryKey) {
    configs.push({
      key: 'text-primary',
      type: 'text',
      name: env['ARK_TEXT_PRIMARY_NAME'] || 'Doubao-Seed-2.0-pro',
      endpointId: textPrimaryEp,
      apiKey: textPrimaryKey,
      isPrimary: true,
      description: '主力文本生成模型',
      rateLimit: env['ARK_TEXT_PRIMARY_RATE_LIMIT'] || '100RPM 50WTPM',
    });
  }

  const videoPrimaryEp = env['ARK_VIDEO_PRIMARY_ENDPOINT_ID'];
  const videoPrimaryKey = env['ARK_VIDEO_PRIMARY_API_KEY'];
  if (videoPrimaryEp && videoPrimaryKey) {
    configs.push({
      key: 'video-primary',
      type: 'video',
      name: env['ARK_VIDEO_PRIMARY_NAME'] || 'Doubao-Seedance-1.5-pro',
      endpointId: videoPrimaryEp,
      apiKey: videoPrimaryKey,
      isPrimary: true,
      description: '主力视频生成模型',
      rateLimit: env['ARK_VIDEO_PRIMARY_RATE_LIMIT'] || '5并发',
    });
  }

  return configs;
}

export const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export const ARK_API_PATHS = {
  CHAT_COMPLETIONS: '/chat/completions',
  VIDEO_CREATE_TASK: '/contents/generations/tasks',
  VIDEO_QUERY_TASK: '/contents/generations/tasks/',
} as const;
