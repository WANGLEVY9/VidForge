import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assetTypeForMime, MAX_MEDIA_UPLOAD_BYTES, MEDIA_MIME_TYPES } from './media-upload.config';

test('media upload policy keeps the documented 200 MiB ceiling', () => {
  assert.equal(MAX_MEDIA_UPLOAD_BYTES, 200 * 1024 * 1024);
});

test('media upload policy maps only supported MIME types', () => {
  assert.equal(assetTypeForMime('image/jpeg'), 'image');
  assert.equal(assetTypeForMime('video/mp4'), 'video');
  assert.equal(assetTypeForMime('audio/mpeg'), 'audio');
  assert.equal(assetTypeForMime('application/octet-stream'), undefined);
  assert.deepEqual(Object.keys(MEDIA_MIME_TYPES).sort(), [
    'audio/mp3',
    'audio/mpeg',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
  ]);
});
