#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'README.md',
  'README.zh-CN.md',
  'README.ja.md',
  'README.fr.md',
  'README.de.md',
  'README.ru.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'ROADMAP.md',
  'GOVERNANCE.md',
  'CHANGELOG.md',
];
const markdownFiles = [
  ...roots.filter(fs.existsSync),
  ...fs
    .readdirSync('docs', { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join('docs', entry.name)),
];

const failures = [];
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const contents = fs.readFileSync(file, 'utf8');
  for (const match of contents.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    if (/^(https?:|mailto:|#)/i.test(rawTarget)) continue;

    const target = decodeURIComponent(rawTarget.split('#')[0]);
    if (!target) continue;

    const resolved = path.resolve(path.dirname(file), target);
    if (!fs.existsSync(resolved)) failures.push(`${file}: ${rawTarget}`);
  }
}

if (failures.length > 0) {
  console.error(`Broken local Markdown links:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(`Checked local links in ${markdownFiles.length} Markdown files.`);
