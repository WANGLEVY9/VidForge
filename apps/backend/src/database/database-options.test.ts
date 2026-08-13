import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveDatabaseSynchronize } from './database-options';

test('production never enables TypeORM schema synchronization', () => {
  assert.equal(resolveDatabaseSynchronize('production', 'true'), false);
  assert.equal(resolveDatabaseSynchronize('production'), false);
});

test('development keeps the local synchronization default', () => {
  assert.equal(resolveDatabaseSynchronize('development'), true);
  assert.equal(resolveDatabaseSynchronize('development', 'false'), false);
});

test('non-development environments default to migrations', () => {
  assert.equal(resolveDatabaseSynchronize('test'), false);
  assert.equal(resolveDatabaseSynchronize(undefined), false);
});
