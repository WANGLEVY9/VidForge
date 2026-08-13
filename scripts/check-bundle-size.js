import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BUDGETS = Object.freeze({
  entryGzipBytes: 360 * 1024,
  chunkGzipBytes: 430 * 1024,
});

export function measureJavaScriptBundles(distDir) {
  const indexHtml = readFileSync(join(distDir, 'index.html'), 'utf8');
  const entryMatches = [...indexHtml.matchAll(/<script[^>]+src="\/assets\/([^"?]+\.js)"/g)];
  const entryFiles = new Set(entryMatches.map((match) => match[1]));
  const assetsDir = join(distDir, 'assets');

  return readdirSync(assetsDir)
    .filter((file) => file.endsWith('.js'))
    .map((file) => {
      const bytes = gzipSync(readFileSync(join(assetsDir, file))).byteLength;
      return { file, bytes, entry: entryFiles.has(file) };
    })
    .sort((left, right) => right.bytes - left.bytes);
}

export function findBudgetViolations(bundles, budgets = DEFAULT_BUDGETS) {
  return bundles.filter(({ bytes, entry }) =>
    entry ? bytes > budgets.entryGzipBytes : bytes > budgets.chunkGzipBytes
  );
}

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}

function main() {
  const distDir = resolve('apps/frontend/dist');
  const bundles = measureJavaScriptBundles(distDir);
  const violations = findBudgetViolations(bundles);
  const largest = bundles.slice(0, 5);

  console.log('Largest compressed JavaScript bundles:');
  for (const bundle of largest) {
    console.log(`- ${bundle.entry ? 'entry' : 'lazy '} ${bundle.file}: ${formatKiB(bundle.bytes)}`);
  }

  if (violations.length > 0) {
    console.error('\nBundle budget exceeded:');
    for (const bundle of violations) {
      const budget = bundle.entry ? DEFAULT_BUDGETS.entryGzipBytes : DEFAULT_BUDGETS.chunkGzipBytes;
      console.error(`- ${bundle.file}: ${formatKiB(bundle.bytes)} > ${formatKiB(budget)}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Frontend bundle budgets passed.');
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main();
