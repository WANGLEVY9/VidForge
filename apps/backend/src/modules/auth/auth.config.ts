const DEVELOPMENT_JWT_SECRET = 'vidforge-local-development-only-secret';

export function resolveJwtSecret(
  nodeEnv: string | undefined,
  rawSecret: string | undefined
): string {
  const configuredSecret = rawSecret?.trim();
  const isProduction = nodeEnv === 'production';

  if (isProduction && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }

  return configuredSecret || DEVELOPMENT_JWT_SECRET;
}

export function shouldSeedDemoUser(
  nodeEnv: string | undefined,
  seedFlag: string | undefined
): boolean {
  return nodeEnv !== 'production' && seedFlag === 'true';
}
