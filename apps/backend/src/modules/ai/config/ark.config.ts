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

/**
 * 清理环境变量黏贴时常见的脏字符:
 * - 前后空白 / \r / \n
 * - 误带的成对中英文引号
 * 不修改中间内容
 */
function sanitizeEnv(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let v = raw.trim();
  // 去掉成对的引号包裹
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'")) ||
    (v.startsWith('“') && v.endsWith('”')) ||
    (v.startsWith('‘') && v.endsWith('’'))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * 内置默认配置(开箱即用)
 * 用于本地开发与私有部署场景。生产环境通过环境变量覆盖。
 *
 * 优先级:env 显式配置 > 内置默认值
 *
 * 注意:这两个 EP 与 APIKEY 仅供该项目内部 Demo 使用,
 * 不要在公开仓库中暴露。生产部署务必通过 env 覆盖。
 */
const BUILTIN_DEFAULTS = {
  textPrimary: {
    endpointId: 'ep-20260514115629-vhldw',
    apiKey: 'ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3',
    name: 'Doubao-Seed-2.0-pro',
    rateLimit: '100RPM 50WTPM',
  },
  videoPrimary: {
    endpointId: 'ep-20260514120705-pqv86',
    apiKey: 'ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3',
    name: 'Doubao-Seedance-1.5-pro',
    rateLimit: '5并发',
  },
} as const;

export function buildDefaultModelConfigs(env: Record<string, string | undefined>): ArkModelConfig[] {
  const configs: ArkModelConfig[] = [];

  // 文本主模型:env 优先,缺失时回落到内置默认值
  const textPrimaryEp =
    sanitizeEnv(env['ARK_TEXT_PRIMARY_ENDPOINT_ID']) || BUILTIN_DEFAULTS.textPrimary.endpointId;
  const textPrimaryKey =
    sanitizeEnv(env['ARK_TEXT_PRIMARY_API_KEY']) || BUILTIN_DEFAULTS.textPrimary.apiKey;
  if (textPrimaryEp && textPrimaryKey) {
    configs.push({
      key: 'text-primary',
      type: 'text',
      name: env['ARK_TEXT_PRIMARY_NAME'] || BUILTIN_DEFAULTS.textPrimary.name,
      endpointId: textPrimaryEp,
      apiKey: textPrimaryKey,
      isPrimary: true,
      description: '主力文本生成模型(支持视觉理解)',
      rateLimit: env['ARK_TEXT_PRIMARY_RATE_LIMIT'] || BUILTIN_DEFAULTS.textPrimary.rateLimit,
    });
  }

  // 视频主模型:同上
  const videoPrimaryEp =
    sanitizeEnv(env['ARK_VIDEO_PRIMARY_ENDPOINT_ID']) || BUILTIN_DEFAULTS.videoPrimary.endpointId;
  const videoPrimaryKey =
    sanitizeEnv(env['ARK_VIDEO_PRIMARY_API_KEY']) || BUILTIN_DEFAULTS.videoPrimary.apiKey;
  if (videoPrimaryEp && videoPrimaryKey) {
    configs.push({
      key: 'video-primary',
      type: 'video',
      name: env['ARK_VIDEO_PRIMARY_NAME'] || BUILTIN_DEFAULTS.videoPrimary.name,
      endpointId: videoPrimaryEp,
      apiKey: videoPrimaryKey,
      isPrimary: true,
      description: '主力视频生成模型',
      rateLimit: env['ARK_VIDEO_PRIMARY_RATE_LIMIT'] || BUILTIN_DEFAULTS.videoPrimary.rateLimit,
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
