import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveJwtSecret, shouldSeedDemoUser } from './auth.config';

test('production requires a JWT secret of at least 32 characters', () => {
  assert.throws(() => resolveJwtSecret('production', undefined), /at least 32 characters/);
  assert.throws(() => resolveJwtSecret('production', 'too-short'), /at least 32 characters/);
});

test('development can use a local-only fallback secret', () => {
  assert.equal(
    resolveJwtSecret('development', undefined),
    'vidforge-local-development-only-secret'
  );
});

test('configured JWT secrets are trimmed', () => {
  const secret = 'a-secure-production-secret-with-32-chars';
  assert.equal(resolveJwtSecret('production', `  ${secret}  `), secret);
});

test('demo users require explicit opt-in and are never seeded in production', () => {
  assert.equal(shouldSeedDemoUser('development', 'true'), true);
  assert.equal(shouldSeedDemoUser('development', 'false'), false);
  assert.equal(shouldSeedDemoUser('production', 'true'), false);
});
