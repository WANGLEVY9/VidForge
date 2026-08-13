/**
 * Schema synchronization is a local-development convenience only.
 * Production schema changes must go through an explicit TypeORM migration.
 */
export function resolveDatabaseSynchronize(nodeEnv?: string, syncEnv?: string): boolean {
  if (nodeEnv === 'production') return false;
  return syncEnv === undefined ? nodeEnv === 'development' : syncEnv === 'true';
}
