import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  createAgentRetryPolicy,
  isRetryableAgentError,
  nextQualityNode,
  readAgentRuntimeConfig,
} from './agent-runtime.config';

test('agent runtime config clamps unsafe environment values', () => {
  const config = readAgentRuntimeConfig({
    AGENT_MAX_RETRIES: '99',
    AGENT_RETRY_BASE_DELAY_MS: '-1',
    AGENT_QC_MAX_RETRIES: 'not-a-number',
  });

  assert.deepEqual(config, {
    maxRetries: 5,
    retryBaseDelayMs: 100,
    qcMaxRetries: 2,
  });
});

test('agent retry policy avoids retrying cancellation and client errors', () => {
  const policy = createAgentRetryPolicy(readAgentRuntimeConfig({}));
  assert.equal(policy.maxAttempts, 4);
  assert.equal(policy.retryOn?.({ name: 'AbortError' }), false);
  assert.equal(policy.retryOn?.({ status: 422 }), false);
  assert.equal(policy.retryOn?.({ status: 503 }), true);
  assert.equal(isRetryableAgentError(new Error('temporary provider failure')), true);
});

test('quality failures replan from script generation and stop at the retry budget', () => {
  assert.equal(nextQualityNode(false, 0, 2), 'script_generation');
  assert.equal(nextQualityNode(false, 1, 2), 'script_generation');
  assert.equal(nextQualityNode(false, 2, 2), '__end__');
  assert.equal(nextQualityNode(true, 0, 2), '__end__');
});
