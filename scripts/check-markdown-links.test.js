import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('tracked Markdown documents do not contain broken local links', () => {
  const result = spawnSync(process.execPath, ['scripts/check-markdown-links.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Checked local links/);
});
