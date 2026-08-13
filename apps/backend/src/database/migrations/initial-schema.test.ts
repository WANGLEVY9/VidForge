import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { InitialSchema1765656000000 } from './1765656000000-InitialSchema';

test('initial schema migration provisions extensions, tables, and indexes idempotently', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
    },
  } as never;

  await new InitialSchema1765656000000().up(queryRunner);

  assert.match(statements[0], /CREATE EXTENSION IF NOT EXISTS/);
  assert.ok(statements.some((sql) => sql.includes('CREATE EXTENSION IF NOT EXISTS vector')));
  for (const table of [
    'users',
    'product_spaces',
    'materials',
    'scripts',
    'creation_tasks',
    'agent_runs',
    'trace_spans',
    'export_tasks',
    'notifications',
    'templates',
    'ark_model_overrides',
  ]) {
    assert.ok(
      statements.some((sql) => sql.includes(`CREATE TABLE IF NOT EXISTS "${table}"`)),
      `missing table ${table}`
    );
  }
  assert.ok(statements.some((sql) => sql.includes('CREATE INDEX IF NOT EXISTS')));
});

test('initial schema migration down removes tables in dependency-safe reverse order', async () => {
  const statements: string[] = [];
  const queryRunner = {
    query: async (sql: string) => {
      statements.push(sql);
    },
  } as never;

  await new InitialSchema1765656000000().down(queryRunner);

  assert.match(statements[0], /ark_model_overrides/);
  assert.match(statements.at(-1) ?? '', /users/);
});
