import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';
import * as path from 'node:path';
import { assertDownloadSize, FfmpegService } from './ffmpeg.service';

test('download size guard accepts values within the limit', () => {
  assert.doesNotThrow(() => assertDownloadSize(10, 10));
});

test('download size guard rejects invalid and oversized values', () => {
  assert.throws(() => assertDownloadSize(11, 10), /超过大小限制/);
  assert.throws(() => assertDownloadSize(1, 0), /大小限制无效/);
  assert.throws(() => assertDownloadSize(Number.NaN, 10), /内容大小无效/);
});

test('local media inputs cannot escape the backend storage root', async () => {
  const service = new FfmpegService();
  const outsideStorage = path.resolve(process.cwd(), '..', 'outside-fixture.mp4');

  await assert.rejects(
    () => service.downloadTo(pathToFileURL(outsideStorage).href, path.join('/tmp', 'copy.mp4')),
    /必须位于 storage 目录内/
  );
});
