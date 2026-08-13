import { strict as assert } from 'node:assert';
import { ServiceUnavailableException } from '@nestjs/common';
import { test } from 'node:test';
import { HealthController } from './health.controller';

test('health check returns liveness metadata without touching the database', () => {
  let called = false;
  const controller = new HealthController({
    query: async () => {
      called = true;
      return [{ '?column?': 1 }];
    },
  } as never);

  const result = controller.check();

  assert.equal(result.status, 'ok');
  assert.equal(typeof result.timestamp, 'string');
  assert.equal(typeof result.uptime, 'number');
  assert.equal(called, false);
});

test('readiness check reports database availability', async () => {
  const controller = new HealthController({
    query: async (sql: string) => {
      assert.equal(sql, 'SELECT 1');
      return [{ '?column?': 1 }];
    },
  } as never);

  const result = await controller.ready();

  assert.equal(result.status, 'ready');
  assert.equal(result.database, 'up');
});

test('readiness check converts database failures into a 503 exception', async () => {
  const controller = new HealthController({
    query: async () => {
      throw new Error('database unavailable');
    },
  } as never);

  await assert.rejects(
    () => controller.ready(),
    (error: unknown) => {
      assert.ok(error instanceof ServiceUnavailableException);
      assert.equal(error.getStatus(), 503);
      const response = error.getResponse() as {
        status: string;
        database: string;
        timestamp: string;
      };
      assert.equal(response.status, 'not-ready');
      assert.equal(response.database, 'down');
      assert.equal(typeof response.timestamp, 'string');
      return true;
    }
  );
});
