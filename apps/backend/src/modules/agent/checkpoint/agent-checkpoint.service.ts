import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

/**
 * Owns the LangGraph persistence boundary.
 *
 * The saver is intentionally lazy: creating the application context must not
 * open a database connection until an Agent run actually needs it. Schema
 * creation is also kept out of the request path; run `checkpointer:setup`
 * once during deployment instead.
 */
@Injectable()
export class AgentCheckpointService implements OnApplicationShutdown {
  private readonly logger = new Logger(AgentCheckpointService.name);
  private saver: PostgresSaver | null = null;

  get configured(): boolean {
    return Boolean(resolveDatabaseUrl());
  }

  get(): PostgresSaver | undefined {
    const connectionString = resolveDatabaseUrl();
    if (!connectionString) return undefined;
    if (!this.saver) {
      this.saver = PostgresSaver.fromConnString(connectionString);
      this.logger.log('LangGraph Postgres checkpointer 已启用');
    }
    return this.saver;
  }

  async setup(): Promise<void> {
    const saver = this.get();
    if (!saver) {
      throw new Error(
        'Checkpointer requires DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME'
      );
    }
    await saver.setup();
    this.logger.log('LangGraph checkpointer schema 已完成初始化');
  }

  async hasCheckpoint(threadId: string): Promise<boolean> {
    const saver = this.get();
    if (!saver) return false;
    return Boolean(await saver.getTuple({ configurable: { thread_id: threadId } }));
  }

  async latestCheckpointId(threadId: string): Promise<string | null> {
    const saver = this.get();
    if (!saver) return null;
    const tuple = await saver.getTuple({ configurable: { thread_id: threadId } });
    return typeof tuple?.config?.configurable?.checkpoint_id === 'string'
      ? tuple.config.configurable.checkpoint_id
      : null;
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.saver) return;
    await this.saver.end();
    this.saver = null;
  }
}

function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.DATABASE_URL?.trim()) return env.DATABASE_URL.trim();

  const host = env.DB_HOST?.trim();
  const user = env.DB_USER?.trim();
  const database = env.DB_NAME?.trim();
  if (!host || !user || !database) return undefined;

  const port = env.DB_PORT?.trim() || '5432';
  const password = env.DB_PASSWORD ?? '';
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}

export { resolveDatabaseUrl };
