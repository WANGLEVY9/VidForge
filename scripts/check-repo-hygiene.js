#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenPatterns = [
  /^\.trae\//,
  /^\.superpowers\//,
  /^docs\/memory\//,
  /^\.claude\/settings\.local\.json$/,
  /(^|\/)\.env$/,
  /(^|\/)\.env\.(?!example$)[^/]+$/,
  /\.(pem|p12|pfx|key)$/i,
];

const maxTrackedFileBytes = 5 * 1024 * 1024;
const failures = [];

for (const file of trackedFiles) {
  if (!fs.existsSync(file)) continue;

  if (forbiddenPatterns.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: forbidden local or sensitive path`);
    continue;
  }

  const size = fs.statSync(file).size;
  if (size > maxTrackedFileBytes) {
    failures.push(`${file}: ${(size / 1024 / 1024).toFixed(1)} MiB exceeds the 5 MiB limit`);
  }
}

if (failures.length > 0) {
  console.error(
    `Repository hygiene check failed:\n${failures.map((item) => `- ${item}`).join('\n')}`
  );
  process.exit(1);
}

console.log(`Checked ${trackedFiles.length} tracked files for repository hygiene.`);
