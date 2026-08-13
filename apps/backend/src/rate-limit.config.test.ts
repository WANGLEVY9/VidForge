import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { RATE_LIMITS } from './rate-limit.config';

test('global rate limits retain short-burst and sustained protections', () => {
  assert.deepEqual(RATE_LIMITS, [
    { name: 'short', ttl: 10_000, limit: 30 },
    { name: 'medium', ttl: 60_000, limit: 100 },
  ]);
});
