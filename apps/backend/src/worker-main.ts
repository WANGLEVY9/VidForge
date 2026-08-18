import { NestFactory } from '@nestjs/core';

async function bootstrap(): Promise<void> {
  // AppModule evaluates QueueModule.forRoot() while it is imported, so this
  // flag must be set before the dynamic import.
  process.env.PROCESS_ROLE = process.env.PROCESS_ROLE || 'agent-worker';
  const { AppModule } = await import('./app.module');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  const shutdown = async (signal: string) => {
    console.log(`[${process.env.PROCESS_ROLE ?? 'worker'}] shutting down on ${signal}`);
    await app.close();
    process.exit(0);
  };
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap().catch((error) => {
  console.error(`[${process.env.PROCESS_ROLE ?? 'worker'}] failed to start`, error);
  process.exitCode = 1;
});
