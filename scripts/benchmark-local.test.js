import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

test('local benchmark is offline and reports a stable baseline shape', () => {
  const output = execFileSync(process.execPath, ['scripts/benchmark-local.mjs'], {
    env: { ...process.env, BENCHMARK_ITERATIONS: '100' },
    encoding: 'utf8',
  });
  const result = JSON.parse(output);

  assert.equal(result.benchmark, 'vidforge-local-baseline-v1');
  assert.equal(result.iterations, 100);
  assert.equal(result.providerCalls, 0);
  assert.equal(result.estimatedCostCents.text, 0.32);
  assert.equal(result.estimatedCostCents.video5s, 18);
  assert.equal(typeof result.latencyMs.p95, 'number');
});
