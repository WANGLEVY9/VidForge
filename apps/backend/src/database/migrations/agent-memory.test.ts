import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentMemory1765656000001 } from './1765656000001-AgentMemory';

test('agent memory migration is idempotent and creates tenant-safe indexes', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new AgentMemory1765656000001().up(queryRunner);

  assert.ok(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS "agent_memories"')));
  assert.ok(statements.some((sql) => sql.includes('userId", "semanticKey')));
  assert.ok(statements.some((sql) => sql.includes('userId", "productSpaceId')));
});
