import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { __checkpointTestables, resolveDatabaseUrl } from './agent-checkpoint.service';

test('checkpointer resolves an explicit DATABASE_URL first', () => {
  assert.equal(
    resolveDatabaseUrl({ DATABASE_URL: ' postgresql://db.example/vidforge ' }),
    'postgresql://db.example/vidforge'
  );
});

test('checkpointer builds a URL from discrete database settings', () => {
  assert.equal(
    resolveDatabaseUrl({
      DB_HOST: 'db.example',
      DB_PORT: '5433',
      DB_USER: 'video user',
      DB_PASSWORD: 'p@ssword',
      DB_NAME: 'vidforge db',
    }),
    'postgresql://video%20user:p%40ssword@db.example:5433/vidforge%20db'
  );
});

test('checkpointer stays disabled when database settings are incomplete', () => {
  assert.equal(resolveDatabaseUrl({ DB_HOST: 'localhost', DB_USER: 'vidforge' }), undefined);
});

test('checkpoint summary exposes runtime state without raw graph channel values', () => {
  const summary = __checkpointTestables.toSummary({
    config: { configurable: { checkpoint_id: 'checkpoint-1' } },
    checkpoint: {
      id: 'ignored-fallback',
      ts: '2026-08-18T00:00:00.000Z',
      channel_values: {
        status: 'running',
        currentNode: 'video_composition',
        progress: 50,
        retryCount: 1,
        productName: 'private product',
        memoryContext: { recalled: ['private memory'] },
      },
    },
    metadata: { source: 'loop', step: 3 },
  });

  assert.deepEqual(summary, {
    checkpointId: 'checkpoint-1',
    createdAt: '2026-08-18T00:00:00.000Z',
    source: 'loop',
    step: 3,
    status: 'running',
    currentNode: 'video_composition',
    progress: 50,
    retryCount: 1,
    nextNodes: ['video_composition'],
  });
});
