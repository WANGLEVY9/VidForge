import type { RetryPolicy } from '@langchain/langgraph';

export interface AgentRuntimeConfig {
  /** Number of retries after the initial node attempt. */
  maxRetries: number;
  /** Delay before the first retry; later delays use exponential backoff. */
  retryBaseDelayMs: number;
  /** Maximum number of quality-driven replans. */
  qcMaxRetries: number;
  /** Maximum number of long-term memory hits retrieved per run. */
  memoryTopK: number;
  /** Maximum characters allocated to serialized memory context. */
  memoryMaxChars: number;
  /** How long a worker owns a running task before it must renew its lease. */
  leaseDurationMs: number;
}

const DEFAULTS: AgentRuntimeConfig = {
  maxRetries: 3,
  retryBaseDelayMs: 2000,
  qcMaxRetries: 2,
  memoryTopK: 6,
  memoryMaxChars: 1800,
  leaseDurationMs: 120_000,
};

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function readAgentRuntimeConfig(env: NodeJS.ProcessEnv = process.env): AgentRuntimeConfig {
  return {
    maxRetries: boundedInteger(env.AGENT_MAX_RETRIES, DEFAULTS.maxRetries, 0, 5),
    retryBaseDelayMs: boundedInteger(
      env.AGENT_RETRY_BASE_DELAY_MS,
      DEFAULTS.retryBaseDelayMs,
      100,
      60_000
    ),
    qcMaxRetries: boundedInteger(env.AGENT_QC_MAX_RETRIES, DEFAULTS.qcMaxRetries, 0, 3),
    memoryTopK: boundedInteger(env.AGENT_MEMORY_TOP_K, DEFAULTS.memoryTopK, 1, 12),
    memoryMaxChars: boundedInteger(env.AGENT_MEMORY_MAX_CHARS, DEFAULTS.memoryMaxChars, 400, 6_000),
    leaseDurationMs: boundedInteger(
      env.AGENT_LEASE_DURATION_MS,
      DEFAULTS.leaseDurationMs,
      10_000,
      900_000
    ),
  };
}

export function createAgentTaskId(now = Date.now(), random = Math.random()): string {
  return `task_${now}_${random.toString(36).slice(2, 7)}`;
}

/**
 * Do not retry caller/input errors or cancellation. Network, provider and
 * transient database errors remain retryable by LangGraph.
 */
export function isRetryableAgentError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true;
  const candidate = error as { name?: string; code?: string; status?: number };
  if (
    candidate.name === 'AbortError' ||
    candidate.code === 'ERR_CANCELED' ||
    candidate.name === 'TypeError' ||
    candidate.name === 'SyntaxError' ||
    candidate.name === 'ReferenceError'
  ) {
    return false;
  }
  return !(
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
}

export function createAgentRetryPolicy(config: AgentRuntimeConfig): RetryPolicy {
  return {
    initialInterval: config.retryBaseDelayMs,
    backoffFactor: 2,
    maxInterval: Math.min(config.retryBaseDelayMs * 8, 60_000),
    maxAttempts: config.maxRetries + 1,
    jitter: true,
    retryOn: isRetryableAgentError,
    logWarning: true,
  };
}

export function nextQualityNode(
  passed: boolean | undefined,
  retryCount: number,
  maxRetries: number
): 'script_generation' | '__end__' {
  if (passed || retryCount >= maxRetries) return '__end__';
  return 'script_generation';
}
