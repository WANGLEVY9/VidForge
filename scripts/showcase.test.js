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
