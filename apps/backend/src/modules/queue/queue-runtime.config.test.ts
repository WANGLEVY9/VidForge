import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readQueueRuntimeConfig } from './queue-runtime.config';

test('queue inline fallback is enabled for local development by default', () => {
  assert.deepEqual(readQueueRuntimeConfig({ NODE_ENV: 'development' }), {
    allowInlineFallback: true,
  });
});

test('production-like environments fail closed by default', () => {
  assert.deepEqual(readQueueRuntimeConfig({ NODE_ENV: 'production' }), {
    allowInlineFallback: false,
  });
  assert.deepEqual(readQueueRuntimeConfig({ NODE_ENV: 'staging' }), {
    allowInlineFallback: false,
  });
});

test('explicit queue fallback configuration wins over the environment default', () => {
  assert.deepEqual(
    readQueueRuntimeConfig({ NODE_ENV: 'production', QUEUE_INLINE_FALLBACK: 'true' }),
    { allowInlineFallback: true }
  );
  assert.deepEqual(
    readQueueRuntimeConfig({ NODE_ENV: 'development', QUEUE_INLINE_FALLBACK: 'off' }),
    { allowInlineFallback: false }
  );
});
