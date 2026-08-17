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
    update: async (id: unknown, patch: Record<string, unknown>) => {
      updates.push({ id: String(id), patch });
      return { affected: 1 };
    },
    findOne: async (options: {
      where?: { id?: string; userId?: string; idempotencyKey?: string };
    }) => {
      if (options.where?.idempotencyKey) return null;
      if (options.where?.id && !options.where?.userId) {
        return {
          id: 'task_1',
          userId: 'user-1',
          status: 'pending',
          currentNode: 'queued',
          progress: 0,
          input: { productName: '商品', category: '家居', sellingPoints: '轻便' },
          graphThreadId: 'task_1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          startedAt: null,
        };
      }
      return {
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
      };
    },
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

test('agent run returns the existing task for a repeated idempotency key', async () => {
  const existing = {
    id: 'task-existing',
    userId: 'user-1',
    status: 'running',
    currentNode: 'script_generation',
    progress: 50,
    result: null,
    errorMessage: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    startedAt: new Date('2026-01-01T00:00:01.000Z'),
    completedAt: null,
  };
  let saved = false;
  const repo = {
    create: (value: Record<string, unknown>) => value,
    save: async () => {
      saved = true;
      throw new Error('should not create a second run');
    },
    findOne: async (options: { where?: { idempotencyKey?: string } }) =>
      options.where?.idempotencyKey ? existing : null,
  };
  const service = new AgentService(
    repo as never,
    { run: async () => ({}), cancel: () => false } as never
  );

  const result = await service.run(
    { userId: 'user-1', productName: '商品', category: '家居', sellingPoints: '轻便' },
    ' request-123 '
  );

  assert.equal(result.taskId, 'task-existing');
  assert.equal(result.status, 'running');
  assert.equal(saved, false);
});

test('agent run rejects an oversized idempotency key instead of truncating it', async () => {
  const repo = {
    findOne: async () => null,
    create: (value: Record<string, unknown>) => value,
    save: async () => undefined,
  };
  const service = new AgentService(
    repo as never,
    { run: async () => ({}), cancel: () => false } as never
  );

  await assert.rejects(
    service.run(
      { userId: 'user-1', productName: '商品', category: '家居', sellingPoints: '轻便' },
      'x'.repeat(201)
    ),
    /200 characters or fewer/
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

test('agent worker requeues expired leases for checkpoint resume', async () => {
  const previousRole = process.env.PROCESS_ROLE;
  process.env.PROCESS_ROLE = 'agent-worker';
  const updates: Array<{ id: unknown; patch: Record<string, unknown> }> = [];
  const repo = {
    find: async (options: { where: { status: string } }) =>
      options.where.status === 'running'
        ? [
            {
              id: 'task-interrupted',
              status: 'running',
              userId: 'user-1',
              input: {},
              createdAt: new Date('2026-01-01T00:00:00.000Z'),
            },
          ]
        : [],
    update: async (id: unknown, patch: Record<string, unknown>) => {
      updates.push({ id, patch });
    },
  };
  const service = new AgentService(
    repo as never,
    { run: async () => ({}), cancel: () => false } as never
  );

  await service.onModuleInit();
  service.onModuleDestroy();
  if (previousRole === undefined) delete process.env.PROCESS_ROLE;
  else process.env.PROCESS_ROLE = previousRole;

  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.patch, {
    status: 'pending',
    currentNode: 'recovery_pending',
    errorMessage: 'worker lease expired; resuming from the latest LangGraph checkpoint',
    workerId: null,
    leaseUntil: null,
    heartbeatAt: null,
    completedAt: null,
  });
});

test('agent startup leaves a worker-owned run alone while its lease is valid', async () => {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const repo = {
    find: async (options: { where: { status: string } }) =>
      options.where.status === 'running'
        ? [
            {
              id: 'task-active',
              status: 'running',
              userId: 'user-1',
              input: {},
              leaseUntil: new Date(Date.now() + 60_000),
            },
          ]
        : [],
    update: async (id: string | string[], patch: Record<string, unknown>) => {
      updates.push({ id: String(id), patch });
    },
  };
  const service = new AgentService(
    repo as never,
    { run: async () => ({}), cancel: () => false } as never
  );

  await service.onModuleInit();

  assert.deepEqual(updates, []);
});
