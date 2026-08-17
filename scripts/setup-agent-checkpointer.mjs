import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/backend/package.json', import.meta.url));
const { PostgresSaver } = require('@langchain/langgraph-checkpoint-postgres');

const databaseUrl = resolveDatabaseUrl(process.env);
if (!databaseUrl) {
  throw new Error(
    'Checkpointer setup requires DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME'
  );
}

const saver = PostgresSaver.fromConnString(databaseUrl);
try {
  await saver.setup();
  console.log('LangGraph Postgres checkpointer schema is ready.');
} finally {
  await saver.end();
}

function resolveDatabaseUrl(env) {
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();
  const host = env.DB_HOST?.trim();
  const user = env.DB_USER?.trim();
  const database = env.DB_NAME?.trim();
  if (!host || !user || !database) return undefined;
  const port = env.DB_PORT?.trim() || '5432';
  const password = env.DB_PASSWORD ?? '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}
