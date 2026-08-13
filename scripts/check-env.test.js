import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('project environment checker accepts the repository configuration', () => {
  const result = spawnSync(process.execPath, ['scripts/check-env.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /根package\.json配置正确/);
  assert.match(result.stdout, /环境检查完成/);
});
