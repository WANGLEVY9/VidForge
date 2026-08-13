import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const backendRoot = resolve(process.cwd());

function findTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) return findTests(absolutePath);
    return entry.isFile() && entry.name.endsWith('.test.ts') ? [absolutePath] : [];
  });
}

const testFiles = findTests(join(backendRoot, 'src')).sort();
if (testFiles.length === 0) {
  console.error('No backend test files found.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ['--test', '--require', 'ts-node/register', ...testFiles],
  { cwd: backendRoot, stdio: 'inherit' }
);

process.exit(result.status ?? 1);
