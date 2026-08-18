import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  CreationComposeProcessor,
  CreationShotProcessor,
  ExportEncodeProcessor,
  __queueProcessorTestables,
} from './queue.processors';

test('Agent Worker concurrency is bounded for multi-worker deployments', () => {
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '4' }),
    4
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '0' }),
    1
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: '99' }),
    16
  );
  assert.equal(
    __queueProcessorTestables.readAgentWorkerConcurrency({ AGENT_WORKER_CONCURRENCY: 'invalid' }),
    2
  );
});

test('Media Worker concurrency is bounded for FFmpeg and provider workloads', () => {
  assert.equal(
    __queueProcessorTestables.readMediaWorkerConcurrency({ MEDIA_WORKER_CONCURRENCY: '4' }),
    4
  );
  assert.equal(
    __queueProcessorTestables.readMediaWorkerConcurrency({ MEDIA_WORKER_CONCURRENCY: '0' }),
    1
  );
  assert.equal(
    __queueProcessorTestables.readMediaWorkerConcurrency({ MEDIA_WORKER_CONCURRENCY: '99' }),
    8
  );
  assert.equal(
    __queueProcessorTestables.readMediaWorkerConcurrency({ MEDIA_WORKER_CONCURRENCY: 'invalid' }),
    2
  );
});

function moduleRefFor(service: unknown) {
  return { get: () => service };
}

test('Media Worker processors execute domain services instead of acknowledging placeholders', async () => {
  const calls: string[] = [];
  const creation = {
    processShots: async (taskId: string, dto: Record<string, unknown>) => {
      calls.push(`shots:${taskId}:${dto.title}`);
    },
    processComposition: async (taskId: string, dto: Record<string, unknown>) => {
      calls.push(`compose:${taskId}:${dto.title}`);
    },
  };
  const exporter = {
    processExport: async (taskId: string, sourceUrl?: string) => {
      calls.push(`export:${taskId}:${sourceUrl}`);
    },
  };
  const dto = { title: 'demo' };

  const shotResult = await new CreationShotProcessor(moduleRefFor(creation) as never).process({
    id: 'job-shot',
    name: 'generate-shot',
    data: { taskId: 'creation-1', dto },
  } as never);
  const composeResult = await new CreationComposeProcessor(moduleRefFor(creation) as never).process(
    {
      id: 'job-compose',
      name: 'compose-video',
      data: { taskId: 'creation-1', dto },
    } as never
  );
  const exportResult = await new ExportEncodeProcessor(moduleRefFor(exporter) as never).process({
    id: 'job-export',
    name: 'encode-export',
    data: { taskId: 'export-1', sourceUrl: 'file:///source.mp4' },
  } as never);

  assert.deepEqual(calls, [
    'shots:creation-1:demo',
    'compose:creation-1:demo',
    'export:export-1:file:///source.mp4',
  ]);
  assert.deepEqual(shotResult, { ok: true, taskId: 'creation-1' });
  assert.deepEqual(composeResult, { ok: true, taskId: 'creation-1' });
  assert.deepEqual(exportResult, { ok: true, taskId: 'export-1' });
});

test('Media Worker processor propagates business failures for BullMQ retry/DLQ handling', async () => {
  const processor = new ExportEncodeProcessor(
    moduleRefFor({
      processExport: async () => Promise.reject(new Error('ffmpeg crashed')),
    }) as never
  );

  await assert.rejects(
    processor.process({
      id: 'job-export-failed',
      name: 'encode-export',
      data: { taskId: 'export-1' },
    } as never),
    /ffmpeg crashed/
  );
});
