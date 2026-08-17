import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { QUEUE_NAMES } from './queue.constants';
import { QueueRunnerService } from './queue-runner.service';

function createQueue() {
  const jobs = [{ id: 'failed-1', retry: async () => undefined }];
  return {
    client: Promise.resolve({ ping: async () => 'PONG' }),
    add: async (_name: string, _data: unknown, options: Record<string, unknown>) => ({
      id: options.jobId ?? 'generated-1',
    }),
    getJobCounts: async () => ({ waiting: 1, active: 2, completed: 3, failed: 4, delayed: 0 }),
    getFailed: async () => jobs,
    close: async () => undefined,
  };
}

function createRunner() {
  const queue = createQueue();
  return new QueueRunnerService(
    queue as never,
    queue as never,
    queue as never,
    queue as never,
    queue as never
  );
}

test('queue runner preserves idempotency job IDs when Redis is available', async () => {
  const runner = createRunner();
  let fallbackCalled = false;
  const result = await runner.enqueue(
    QUEUE_NAMES.MATERIAL_ANALYZE,
    'analyze-material',
    { materialId: 'material-1' },
    async () => {
      fallbackCalled = true;
    },
    { jobId: 'material-analyze:material-1', attempts: 4 }
  );

  assert.deepEqual(result, { jobId: 'material-analyze:material-1', mode: 'queue' });
  assert.equal(fallbackCalled, false);
});

test('queue runner retries a bounded number of failed jobs', async () => {
  const runner = createRunner();
  assert.deepEqual(await runner.retryFailed(QUEUE_NAMES.MATERIAL_ANALYZE, 0), {
    mode: 'queue',
    retried: 1,
  });
});

test('queue runner closes all queue clients on shutdown', async () => {
  const runner = createRunner();
  await runner.isRedisHealthy();
  await runner.onApplicationShutdown('SIGTERM');
  assert.equal(await runner.isRedisHealthy(), true);
});
