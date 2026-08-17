import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentRunReliability1765656000002 } from './1765656000002-AgentRunReliability';

test('agent run reliability migration is additive and idempotent', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new AgentRunReliability1765656000002().up(queryRunner);

  assert.ok(statements.every((sql) => sql.includes('IF NOT EXISTS')));
  assert.ok(statements.some((sql) => sql.includes('"idempotencyKey"')));
  assert.ok(statements.some((sql) => sql.includes('"leaseUntil"')));
  assert.ok(statements.some((sql) => sql.includes('"graphThreadId"')));
  assert.ok(statements.some((sql) => sql.includes('IDX_agent_runs_user_idempotency')));
});

test('agent run reliability migration removes only its own indexes and columns', async () => {
  const statements: string[] = [];
  const queryRunner = { query: async (sql: string) => statements.push(sql) } as never;

  await new AgentRunReliability1765656000002().down(queryRunner);

  assert.match(statements[0], /IDX_agent_runs_lease/);
  assert.match(statements.at(-1) ?? '', /idempotencyKey/);
  assert.equal(
    statements.some((sql) => sql.includes('DROP TABLE')),
    false
  );
});
