import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentOutbox1765656000004 } from './1765656000004-AgentOutbox';

test('agent outbox migration creates an additive durable dispatch table', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new AgentOutbox1765656000004().up(queryRunner);

  assert.ok(statements[0]?.includes('CREATE TABLE IF NOT EXISTS "agent_outbox_events"'));
  assert.ok(statements[0]?.includes('"dedupeKey"'));
  assert.ok(statements.some((sql) => sql.includes('IDX_agent_outbox_ready')));
  assert.ok(statements.every((sql) => sql.includes('IF NOT EXISTS')));
});

test('agent outbox rollback does not touch AgentRun or checkpoint tables', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new AgentOutbox1765656000004().down(queryRunner);

  assert.deepEqual(statements, [
    'DROP INDEX IF EXISTS "IDX_agent_outbox_ready"',
    'DROP TABLE IF EXISTS "agent_outbox_events"',
  ]);
});
