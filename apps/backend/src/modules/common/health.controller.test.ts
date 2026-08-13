import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

test('health check reports a live process without requiring a database', () => {
  const controller = new HealthController({ query: async () => undefined } as never);
  const result = controller.check();

  assert.equal(result.status, 'ok');
  assert.equal(typeof result.uptime, 'number');
  assert.doesNotThrow(() => new Date(result.timestamp).toISOString());
});

test('readiness check reports database availability', async () => {
  const controller = new HealthController({ query: async () => undefined } as never);
  const result = await controller.ready();

  assert.equal(result.status, 'ready');
  assert.equal(result.database, 'up');
});

test('readiness check converts database failures into a 503 exception', async () => {
  const controller = new HealthController({
    query: async () => Promise.reject(new Error('database unavailable')),
  } as never);

  await assert.rejects(controller.ready(), (error: unknown) => {
    assert.ok(error instanceof ServiceUnavailableException);
    assert.equal((error as ServiceUnavailableException).getStatus(), 503);
    return true;
  });
});
