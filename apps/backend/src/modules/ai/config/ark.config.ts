export interface ArkModelConfig {
  key: string;
  type: 'text' | 'video';
  name: string;
  endpointId: string;
  apiKey: string;
  isPrimary: boolean;
  description?: string;
  rateLimit?: string;
  /**
   * 当前生效 apiKey 的来源:
   * - db                : 来自 ark_model_overrides 表(用户在 API 配置中心写入)
   * - env               : 来自环境变量
   * - builtin           : 来自代码内置默认值（当前不提供内置凭证）
   */
  apiKeySource?: 'db' | 'env' | 'builtin';
  /**
   * endpointId 的来源
   */
  endpointSource?: 'db' | 'env' | 'builtin';
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

/** 只从环境变量读取凭证；公开仓库不得内置任何真实 API key。 */
function pickKey(
  envKey: string | undefined,
  builtinKey?: string
): { apiKey?: string; source: 'env' | 'builtin' } {
  const cleaned = sanitizeEnv(envKey);
  if (cleaned) return { apiKey: cleaned, source: 'env' };
  return { apiKey: builtinKey, source: 'builtin' };
}

function pickEndpoint(
  envEp: string | undefined,
  builtinEp: string
): { endpointId: string; source: 'env' | 'builtin' } {
  const cleaned = sanitizeEnv(envEp);
  if (cleaned) return { endpointId: cleaned, source: 'env' };
  return { endpointId: builtinEp, source: 'builtin' };
}

/**
 * 默认模型元数据（开箱即用）
 * 端点和凭证均通过环境变量提供；公开仓库不包含任何默认凭证。
 */
const BUILTIN_DEFAULTS = {
  textPrimary: {
    endpointId: '',
    apiKey: undefined,
    name: 'Doubao-Seed-2.0-pro',
    rateLimit: '100RPM 50WTPM',
  },
  videoPrimary: {
    endpointId: '',
    apiKey: undefined,
    name: 'Doubao-Seedance-1.5-pro',
    rateLimit: '5并发',
  },
} as const;

export function buildDefaultModelConfigs(
  env: Record<string, string | undefined>
): ArkModelConfig[] {
  const configs: ArkModelConfig[] = [];

  // 文本主模型
  {
    const { endpointId, source: epSource } = pickEndpoint(
      env['ARK_TEXT_PRIMARY_ENDPOINT_ID'],
      BUILTIN_DEFAULTS.textPrimary.endpointId
    );
    const { apiKey, source: keySource } = pickKey(
      env['ARK_TEXT_PRIMARY_API_KEY'],
      BUILTIN_DEFAULTS.textPrimary.apiKey
    );
    if (endpointId && apiKey) {
      configs.push({
        key: 'text-primary',
        type: 'text',
        name: env['ARK_TEXT_PRIMARY_NAME'] || BUILTIN_DEFAULTS.textPrimary.name,
        endpointId,
        apiKey,
        isPrimary: true,
        description: '主力文本生成模型(支持视觉理解)',
        rateLimit: env['ARK_TEXT_PRIMARY_RATE_LIMIT'] || BUILTIN_DEFAULTS.textPrimary.rateLimit,
        apiKeySource: keySource,
        endpointSource: epSource,
      });
    }
  }

  // 视频主模型
  {
    const { endpointId, source: epSource } = pickEndpoint(
      env['ARK_VIDEO_PRIMARY_ENDPOINT_ID'],
      BUILTIN_DEFAULTS.videoPrimary.endpointId
    );
    const { apiKey, source: keySource } = pickKey(
      env['ARK_VIDEO_PRIMARY_API_KEY'],
      BUILTIN_DEFAULTS.videoPrimary.apiKey
    );
    if (endpointId && apiKey) {
      configs.push({
        key: 'video-primary',
        type: 'video',
        name: env['ARK_VIDEO_PRIMARY_NAME'] || BUILTIN_DEFAULTS.videoPrimary.name,
        endpointId,
        apiKey,
        isPrimary: true,
        description: '主力视频生成模型',
        rateLimit: env['ARK_VIDEO_PRIMARY_RATE_LIMIT'] || BUILTIN_DEFAULTS.videoPrimary.rateLimit,
        apiKeySource: keySource,
        endpointSource: epSource,
      });
    }
  }

  return configs;
}

export const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';

export const ARK_API_PATHS = {
  CHAT_COMPLETIONS: '/chat/completions',
  VIDEO_CREATE_TASK: '/contents/generations/tasks',
  VIDEO_QUERY_TASK: '/contents/generations/tasks/',
} as const;
