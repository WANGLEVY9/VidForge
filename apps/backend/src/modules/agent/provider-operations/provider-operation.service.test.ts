import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  ProviderOperationService,
  __providerOperationTestables,
} from './provider-operation.service';

test('provider operation request hashes are stable across object key order', () => {
  const { stableRequestHash } = __providerOperationTestables;
  assert.equal(
    stableRequestHash({ prompt: 'video', options: { duration: 5, ratio: '9:16' } }),
    stableRequestHash({ options: { ratio: '9:16', duration: 5 }, prompt: 'video' })
  );
});

test('provider operation reuses a stable operation for an idempotency key', async () => {
  const existing = {
    id: 'op-1',
    provider: 'ark-video',
    idempotencyKey: 'task-1:shot-1',
  };
  const repo = {
    findOne: async () => existing,
    create: () => {
      throw new Error('should not create a duplicate operation');
    },
  };
  const service = new ProviderOperationService(repo as never);
  const result = await service.begin({
    userId: 'user-1',
    runId: 'task-1',
    nodeName: 'video_composition',
    provider: 'ark-video',
    capability: 'video',
    idempotencyKey: 'task-1:shot-1',
    request: { prompt: 'test' },
  });
  assert.equal(result.id, 'op-1');
});

test('provider operation records only the first remote dispatch as a provider attempt', async () => {
  const saved: Array<Record<string, unknown>> = [];
  const repo = { save: async (value: Record<string, unknown>) => (saved.push(value), value) };
  const service = new ProviderOperationService(repo as never);
  const first = await service.markDispatched(
    {
      id: 'op-1',
      remoteOperationId: null,
      attempt: 0,
      dispatchedAt: null,
    } as never,
    'ark-task-1'
  );
  await service.markDispatched(first as never, 'ark-task-1');
  assert.equal(saved[0]?.attempt, 1);
  assert.equal(saved[1]?.attempt, 1);
});
