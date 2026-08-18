import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { AgentOutboxEvent } from './agent-outbox-event.entity';
import { AgentOutboxService } from './agent-outbox.service';

function createEvent(): AgentOutboxEvent {
  return {
    id: 'event-1',
    eventType: 'run-agent',
    aggregateId: 'task-1',
    dedupeKey: 'agent-run:task-1:initial',
    payload: { taskId: 'task-1', mode: 'initial' },
    status: 'pending',
    attempts: 0,
    availableAt: new Date(0),
    lockedAt: null,
    lockedBy: null,
    dispatchedAt: null,
    lastError: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

function createRepo(event: AgentOutboxEvent) {
  return {
    find: async () => (event.status === 'pending' || event.status === 'failed' ? [event] : []),
    update: async (_criteria: unknown, patch: Record<string, unknown>) => {
      const normalizedPatch = { ...patch };
      if (typeof patch.attempts === 'function') {
        event.attempts += 1;
        normalizedPatch.attempts = event.attempts;
      }
      Object.assign(event, normalizedPatch);
      return { affected: 1 };
    },
    create: (value: AgentOutboxEvent) => value,
    save: async () => event,
  };
}

test('outbox retries a delivery after a queue failure and preserves the event', async () => {
  const event = createEvent();
  const repo = createRepo(event);
  const queue = {
    enqueue: async () => {
      throw new Error('redis unavailable');
    },
  };
  const service = new AgentOutboxService(repo as never, queue as never);

  await service.flush();

  assert.equal(event.status, 'pending');
  assert.equal(event.attempts, 1);
  assert.equal(event.lastError, 'redis unavailable');
});

test('outbox uses one stable BullMQ job ID across an enqueue/status crash window', async () => {
  const event = createEvent();
  const repo = createRepo(event);
  let failStatusUpdate = true;
  const jobIds: unknown[] = [];
  const queue = {
    enqueue: async (
      _queue: string,
      _name: string,
      _payload: unknown,
      _fallback: unknown,
      options: { jobId?: string }
    ) => {
      jobIds.push(options.jobId);
      return { mode: 'queue' as const, jobId: options.jobId };
    },
  };
  const baseUpdate = repo.update;
  repo.update = async (criteria: unknown, patch: Record<string, unknown>) => {
    if (patch.status === 'dispatched' && failStatusUpdate) {
      failStatusUpdate = false;
      throw new Error('database connection reset');
    }
    return baseUpdate(criteria, patch);
  };
  const service = new AgentOutboxService(repo as never, queue as never);

  await service.flush();
  assert.equal(event.status, 'pending');
  await service.flush();

  assert.equal(event.status, 'dispatched');
  assert.equal(jobIds.length, 2);
  assert.equal(jobIds[0], jobIds[1]);
});
