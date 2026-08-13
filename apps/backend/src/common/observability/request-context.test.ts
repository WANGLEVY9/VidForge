import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getRequestId, runWithRequestContext } from './request-context';

test('request context is available through nested asynchronous work', async () => {
  assert.equal(getRequestId(), undefined);
  const requestId = await runWithRequestContext(
    { requestId: 'req_test_123', startedAt: Date.now() },
    async () => {
      await new Promise((resolve) => setImmediate(resolve));
      return getRequestId();
    }
  );

  assert.equal(requestId, 'req_test_123');
  assert.equal(getRequestId(), undefined);
});
