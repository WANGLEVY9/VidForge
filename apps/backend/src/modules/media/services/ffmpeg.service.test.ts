import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { assertDownloadSize } from './ffmpeg.service';

test('download size guard accepts values within the limit', () => {
  assert.doesNotThrow(() => assertDownloadSize(10, 10));
});

test('download size guard rejects invalid and oversized values', () => {
  assert.throws(() => assertDownloadSize(11, 10), /超过大小限制/);
  assert.throws(() => assertDownloadSize(1, 0), /大小限制无效/);
  assert.throws(() => assertDownloadSize(Number.NaN, 10), /内容大小无效/);
});
