import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (file) => fs.readFileSync(file, 'utf8');

test('public showcase remains reachable while workspace routes stay protected', () => {
  const app = read('apps/frontend/src/App.tsx');

  assert.match(app, /path="\/"[\s\S]*<LandingPage \/>/);
  assert.match(app, /<RequireAuth>[\s\S]*path="workspace"/);
  assert.match(app, /path="\*"[\s\S]*Navigate to="\/workspace"/);
});

test('public deployment metadata points to the canonical showcase', () => {
  const html = read('apps/frontend/index.html');
  const robots = read('apps/frontend/public/robots.txt');
  const sitemap = read('apps/frontend/public/sitemap.xml');

  assert.match(html, /<meta name="robots" content="index,follow" \/>/);
  assert.match(
    html,
    /<link rel="canonical" href="https:\/\/vid-forge-frontend-nu\.vercel\.app\/" \/>/
  );
  assert.match(html, /vidforge-pipeline-hero\.webp/);
  assert.match(robots, /Sitemap: https:\/\/vid-forge-frontend-nu\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/vid-forge-frontend-nu\.vercel\.app\/<\/loc>/);
});

test('showcase external links use same-tab navigation for embedded browsers', () => {
  const landing = read('apps/frontend/src/pages/landing/LandingPage.tsx');
  const quickStart = read('apps/frontend/src/pages/quick-start/QuickStartPage.tsx');

  assert.doesNotMatch(landing, /target="_blank"/);
  assert.doesNotMatch(quickStart, /target="_blank"/);
  assert.match(landing, /href=\{repositoryUrl\}/);
  assert.match(quickStart, /href="https:\/\/github\.com\/WANGLEVY9\/VidForge"/);
});

test('auth surfaces explain unavailable backend services instead of exposing network errors', () => {
  const api = read('apps/frontend/src/utils/api.ts');
  const auth = read('apps/frontend/src/pages/auth/AuthPage.tsx');

  assert.match(api, /export function getApiFailureMessage/);
  assert.match(api, /无法连接 VidForge 后端服务/);
  assert.match(auth, /getApiFailureMessage\(err/);
});
