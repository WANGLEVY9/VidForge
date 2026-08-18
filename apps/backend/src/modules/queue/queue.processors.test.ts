import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { __queueProcessorTestables } from './queue.processors';

test('Agent Worker concurrency is bounded for multi-worker deployments', () => {
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '4' }),
    4
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '0' }),
    1
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '99' }),
    16
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: 'invalid' }),
    2
  );
});
