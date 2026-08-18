import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { CreationService } from '../creation/creation.service';
import { ExportService } from '../export/export.service';

test('creation API enqueues a serializable shot job with a stable id', async () => {
  const jobs: Array<Record<string, unknown>> = [];
  const repo = {
    create: (value: Record<string, unknown>) => ({ ...value, id: 'creation-1' }),
    save: async (value: Record<string, unknown>) => value,
    update: async () => undefined,
  };
  const queueRunner = {
    enqueue: async (
      queueName: string,
      jobName: string,
      data: unknown,
      _fallback: () => Promise<void>,
      options: Record<string, unknown>
    ) => {
      jobs.push({ queueName, jobName, data, ...options });
      return { mode: 'queue' as const, jobId: String(options.jobId) };
    },
  };
  const service = new CreationService(
    repo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    queueRunner as never
  );

  await service.createTask('user-1', {
    title: 'demo',
    storyboard: [{ description: 'shot 1' }],
  });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.queueName, 'creation-shot');
  assert.equal(jobs[0]?.jobName, 'generate-shot');
  assert.equal(jobs[0]?.jobId, 'creation-shot:creation-1');
  assert.deepEqual(jobs[0]?.data, {
    taskId: 'creation-1',
    dto: { title: 'demo', storyboard: [{ description: 'shot 1' }] },
  });
});

test('export API enqueues an encode job and does not execute FFmpeg in the API path', async () => {
  const jobs: Array<Record<string, unknown>> = [];
  const exportRepo = {
    create: (value: Record<string, unknown>) => ({ ...value, id: 'export-1' }),
    save: async (value: Record<string, unknown>) => value,
    update: async () => undefined,
  };
  const creationRepo = {
    findOne: async () => ({
      id: 'creation-1',
      userId: 'user-1',
      status: 'completed',
      result: { url: 'file:///published.mp4' },
    }),
  };
  const queueRunner = {
    enqueue: async (
      queueName: string,
      jobName: string,
      data: unknown,
      _fallback: () => Promise<void>,
      options: Record<string, unknown>
    ) => {
      jobs.push({ queueName, jobName, data, ...options });
      return { mode: 'queue' as const, jobId: String(options.jobId) };
    },
  };
  const service = new ExportService(
    exportRepo as never,
    creationRepo as never,
    {} as never,
    {} as never,
    queueRunner as never
  );

  await service.create('user-1', { creationTaskId: 'creation-1', format: 'mp4' });

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.queueName, 'export-encode');
  assert.equal(jobs[0]?.jobName, 'encode-export');
  assert.equal(jobs[0]?.jobId, 'export-encode:export-1');
  assert.deepEqual(jobs[0]?.data, {
    taskId: 'export-1',
    sourceUrl: 'file:///published.mp4',
  });
});
