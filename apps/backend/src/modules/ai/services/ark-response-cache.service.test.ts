import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ArkResponseCacheService } from './ark-response-cache.service';

test('response cache keeps deterministic values in the local fallback', async () => {
  const cache = new ArkResponseCacheService();
  const input = { model: 'demo', messages: [{ role: 'user', content: 'hello' }], temperature: 0 };

  await cache.set(input, { answer: 'world' }, 12);
  assert.deepEqual(await cache.get(input), { answer: 'world' });
  assert.equal(cache.stats().hitCount, 1);
  assert.equal(cache.stats().persistence, 'memory');
});

test('response cache skips high-temperature requests', async () => {
  const cache = new ArkResponseCacheService();
  const input = { model: 'demo', messages: [], temperature: 0.8 };

  await cache.set(input, { answer: 'random' });
  assert.equal(await cache.get(input), null);
  assert.equal(cache.stats().size, 0);
});
