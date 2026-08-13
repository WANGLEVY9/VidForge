import assert from 'node:assert/strict';
import test from 'node:test';

import { findBudgetViolations } from './check-bundle-size.js';

test('bundle budgets distinguish entry points from lazy chunks', () => {
  const budgets = { entryGzipBytes: 100, chunkGzipBytes: 200 };
  const bundles = [
    { file: 'entry.js', bytes: 101, entry: true },
    { file: 'lazy-ok.js', bytes: 200, entry: false },
    { file: 'lazy-large.js', bytes: 201, entry: false },
  ];

  assert.deepEqual(
    findBudgetViolations(bundles, budgets).map(({ file }) => file),
    ['entry.js', 'lazy-large.js']
  );
});
