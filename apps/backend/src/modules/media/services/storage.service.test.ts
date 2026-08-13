import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { StorageService } from './storage.service';

test('storage publish returns the size and SHA-256 of the published bytes', async () => {
  const storage = new StorageService({ enabled: false } as any);
  await storage.onModuleInit();

  const id = `checksum-${randomUUID()}`;
  const inputPath = path.join(storage.getStorageRoot(), 'tmp', `${id}.mp4`);
  const payload = Buffer.from('VidForge artifact integrity fixture\n', 'utf8');
  const expectedSha256 = createHash('sha256').update(payload).digest('hex');

  await fs.writeFile(inputPath, payload);

  try {
    const published = await storage.publish(inputPath, 'test-checksum', `${id}.mp4`);

    assert.equal(published.size, payload.byteLength);
    assert.equal(published.sha256, expectedSha256);
    assert.equal(await fs.readFile(published.absPath, 'utf8'), payload.toString('utf8'));
  } finally {
    await fs.rm(path.dirname(inputPath), { recursive: true, force: true });
    await fs.rm(path.join(storage.getStorageRoot(), 'outputs', 'test-checksum'), {
      recursive: true,
      force: true,
    });
  }
});
