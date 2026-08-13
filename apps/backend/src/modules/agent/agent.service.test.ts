import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentService } from './agent.service';

function createRepo() {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const repo = {
    create: (value: Record<string, unknown>) => value,
    save: async (value: Record<string, unknown>) => ({
      ...value,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }),
    update: async (id: string, patch: Record<string, unknown>) => {
      updates.push({ id, patch });
    },
    findOne: async () => ({
      id: 'task_1',
      userId: 'user-1',
      status: 'completed',
      currentNode: '__end__',
      progress: 100,
      result: { qualityControl: { passed: true } },
      errorMessage: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      startedAt: new Date('2026-01-01T00:00:01.000Z'),
      completedAt: new Date('2026-01-01T00:00:02.000Z'),
    }),
    updates,
  };
  return repo;
}

test('agent service creates a pending durable run and returns immediately', async () => {
  const repo = createRepo();
  const orchestrator = {
    run: async () => ({
      taskId: 'generated',
      status: 'completed' as const,
      progress: 100,
      currentNode: '__end__',
      result: {},
      startedAt: new Date(),
      completedAt: new Date(),
    }),
    cancel: () => true,
  };
  const service = new AgentService(repo as never, orchestrator as never);
  const result = await service.run({
    userId: 'user-1',
    productName: '商品',
    category: '家居',
    sellingPoints: '轻便',
  });

  assert.equal(result.status, 'pending');
  assert.equal(result.currentNode, 'queued');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    repo.updates.some((entry) => entry.patch.status === 'completed'),
    true
  );
});

test('agent status is scoped to the authenticated user', async () => {
  const repo = createRepo();
  const service = new AgentService(
    repo as never,
    { run: async () => ({}), cancel: () => false } as never
  );
  const result = await service.getStatus('user-1', 'task_1');

  assert.equal(result.taskId, 'task_1');
  assert.equal(result.status, 'completed');
});
