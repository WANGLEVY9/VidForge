export const RATE_LIMITS = [
  { name: 'short', ttl: 10_000, limit: 30 },
  { name: 'medium', ttl: 60_000, limit: 100 },
] as const;
