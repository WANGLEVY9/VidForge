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
   * - builtin           : 来自代码内置默认值
   * - builtin-fallback  : env 上的 key 命中黑名单/被强制屏蔽,自动回落到 builtin
   */
  apiKeySource?: 'db' | 'env' | 'builtin' | 'builtin-fallback';
  /**
   * endpointId 的来源
   */
  endpointSource?: 'db' | 'env' | 'builtin';
  /**
   * 如果 env 上的 key 被屏蔽,这里记录被屏蔽的脱敏指纹,用于诊断端点展示
   */
  blockedEnvKey?: string;
}

export type ModelConfigRegistry = Record<string, ArkModelConfig>;

/**
 * 已知失效的旧 key 黑名单。
 *
 * 背景:线上 env(如 Railway)上可能残留过去某个时刻有效但现在已失效的 key,
 * 而代码默认逻辑是 env 优先 > builtin。如果不主动屏蔽,部署后会一直拿失效
 * key 调 ARK,所有调用 fallback 到示例剧本。
 *
 * 凡是命中此名单的 env key 会被忽略,自动回落到代码内置默认值,
 * 同时通过 logger 与 /api/ai/ark/diagnose 端点显式告知运维。
 *
 * 新增已知失效 key 时,请在末尾追加,并在注释里说明何时何处确认失效。
 */
const KNOWN_DEAD_KEYS: ReadonlySet<string> = new Set([
  // 2026-05-31: Railway env 上残留的旧 key,curl 直测返回
  // {"error":{"code":"AuthenticationError","message":"The API key doesn't exist..."}}
  'ark-f26df94a-6b3a-4535-bd66-465266a7e1af-dd663',
  // 2026-06-06: 赛事主办方更换 apikey,旧 key 已失效
  'ark-0a0ae159-729d-4b5d-9c2d-a5bf04824ff5-d42e3',
]);

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
 * 给一个 apiKey 生成 8 位脱敏指纹,用于日志/诊断回包,不暴露原文
 */
function maskKey(raw: string): string {
  if (!raw) return '';
  if (raw.length <= 8) return '*'.repeat(raw.length);
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
}

/**
 * 决策一对 (envKey, builtinKey) 中应该使用哪个。
 *
 * 规则:
 *   1. env 非空 且 env 不在黑名单 → 用 env
 *   2. env 非空 但 env 在黑名单   → 用 builtin,记录 blockedEnvKey(供诊断展示)
 *   3. env 为空                   → 用 builtin
 */
function pickKey(
  envKey: string | undefined,
  builtinKey: string,
): { apiKey: string; source: 'env' | 'builtin' | 'builtin-fallback'; blockedEnvKey?: string } {
  const cleaned = sanitizeEnv(envKey);
  if (cleaned) {
    if (KNOWN_DEAD_KEYS.has(cleaned)) {
      return { apiKey: builtinKey, source: 'builtin-fallback', blockedEnvKey: maskKey(cleaned) };
    }
    return { apiKey: cleaned, source: 'env' };
  }
  return { apiKey: builtinKey, source: 'builtin' };
}

function pickEndpoint(
  envEp: string | undefined,
  builtinEp: string,
): { endpointId: string; source: 'env' | 'builtin' } {
  const cleaned = sanitizeEnv(envEp);
  if (cleaned) return { endpointId: cleaned, source: 'env' };
  return { endpointId: builtinEp, source: 'builtin' };
}

/**
 * 内置默认配置(开箱即用)
 * 用于本地开发与私有部署场景。生产环境通过环境变量覆盖。
 *
 * 优先级:env 显式配置 > 内置默认值,但 env 命中 KNOWN_DEAD_KEYS 时自动回落
 *
 * 注意:这两个 EP 与 APIKEY 仅供该项目内部 Demo 使用,
 * 不要在公开仓库中暴露。生产部署务必通过 env 覆盖。
 */
const BUILTIN_DEFAULTS = {
  textPrimary: {
    endpointId: 'ep-20260514115629-vhldw',
    apiKey: 'ark-1249de72-68c5-4737-8777-789f626d0a3b-c7bc9',
    name: 'Doubao-Seed-2.0-pro',
    rateLimit: '100RPM 50WTPM',
  },
  videoPrimary: {
    endpointId: 'ep-20260514120705-pqv86',
    apiKey: 'ark-1249de72-68c5-4737-8777-789f626d0a3b-c7bc9',
    name: 'Doubao-Seedance-1.5-pro',
    rateLimit: '5并发',
  },
} as const;

export function buildDefaultModelConfigs(env: Record<string, string | undefined>): ArkModelConfig[] {
  const configs: ArkModelConfig[] = [];

  // 文本主模型
  {
    const { endpointId, source: epSource } = pickEndpoint(
      env['ARK_TEXT_PRIMARY_ENDPOINT_ID'],
      BUILTIN_DEFAULTS.textPrimary.endpointId,
    );
    const { apiKey, source: keySource, blockedEnvKey } = pickKey(
      env['ARK_TEXT_PRIMARY_API_KEY'],
      BUILTIN_DEFAULTS.textPrimary.apiKey,
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
        blockedEnvKey,
      });
    }
  }

  // 视频主模型
  {
    const { endpointId, source: epSource } = pickEndpoint(
      env['ARK_VIDEO_PRIMARY_ENDPOINT_ID'],
      BUILTIN_DEFAULTS.videoPrimary.endpointId,
    );
    const { apiKey, source: keySource, blockedEnvKey } = pickKey(
      env['ARK_VIDEO_PRIMARY_API_KEY'],
      BUILTIN_DEFAULTS.videoPrimary.apiKey,
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
        blockedEnvKey,
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

/**
 * 导出黑名单大小,用于启动日志展示
 */
export const KNOWN_DEAD_KEY_COUNT = KNOWN_DEAD_KEYS.size;
