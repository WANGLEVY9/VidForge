export interface QueueRuntimeConfig {
  /** Allow local development to execute jobs without Redis. */
  allowInlineFallback: boolean;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

/** Production-like environments fail closed instead of hiding Redis outages. */
export function readQueueRuntimeConfig(env: NodeJS.ProcessEnv = process.env): QueueRuntimeConfig {
  const explicit = parseBoolean(env.QUEUE_INLINE_FALLBACK);
  const productionLike = ['production', 'staging'].includes(
    env.NODE_ENV?.trim().toLowerCase() ?? ''
  );
  return { allowInlineFallback: explicit ?? !productionLike };
}
