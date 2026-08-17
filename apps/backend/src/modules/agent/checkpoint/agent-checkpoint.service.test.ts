import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { resolveDatabaseUrl } from './agent-checkpoint.service';

test('checkpointer resolves an explicit DATABASE_URL first', () => {
  assert.equal(
    resolveDatabaseUrl({ DATABASE_URL: ' postgresql://db.example/vidforge ' }),
    'postgresql://db.example/vidforge'
  );
});

test('checkpointer builds a URL from discrete database settings', () => {
  assert.equal(
    resolveDatabaseUrl({
      DB_HOST: 'db.example',
      DB_PORT: '5433',
      DB_USER: 'video user',
      DB_PASSWORD: 'p@ssword',
      DB_NAME: 'vidforge db',
    }),
    'postgresql://video%20user:p%40ssword@db.example:5433/vidforge%20db'
  );
});

test('checkpointer stays disabled when database settings are incomplete', () => {
  assert.equal(resolveDatabaseUrl({ DB_HOST: 'localhost', DB_USER: 'vidforge' }), undefined);
});
