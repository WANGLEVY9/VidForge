import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ProviderOperations1765656000003 } from './1765656000003-ProviderOperations';

test('provider operations migration creates an additive, idempotent ledger', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new ProviderOperations1765656000003().up(queryRunner);

  assert.ok(statements[0]?.includes('CREATE TABLE IF NOT EXISTS "provider_operations"'));
  assert.ok(statements.some((sql) => sql.includes('IDX_provider_operations_provider_key')));
  assert.ok(statements.some((sql) => sql.includes('"remoteOperationId"')));
  assert.ok(statements.every((sql) => sql.includes('IF NOT EXISTS')));
});

test('provider operations migration only drops its own table on rollback', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new ProviderOperations1765656000003().down(queryRunner);

  assert.deepEqual(statements, ['DROP TABLE IF EXISTS "provider_operations"']);
});
