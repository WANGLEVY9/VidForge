import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('tracked files exclude local sessions, secrets, and oversized artifacts', () => {
  const result = spawnSync(process.execPath, ['scripts/check-repo-hygiene.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /repository hygiene/);
});
