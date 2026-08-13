import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  isMediaAspectRatio,
  isMediaExportFormat,
  isMediaResolution,
  MEDIA_ASPECT_RATIOS,
  MEDIA_EXPORT_FORMATS,
  MEDIA_RESOLUTIONS,
} from './media-pipeline.config';

test('media pipeline config exposes the supported public options', () => {
  assert.deepEqual(MEDIA_ASPECT_RATIOS, ['9:16', '16:9', '1:1']);
  assert.deepEqual(MEDIA_RESOLUTIONS, ['480p', '720p', '1080p', '2160p']);
  assert.deepEqual(MEDIA_EXPORT_FORMATS, ['mp4', 'mov', 'webm', 'gif']);
});

test('media pipeline guards reject unsupported values', () => {
  assert.equal(isMediaAspectRatio('9:16'), true);
  assert.equal(isMediaAspectRatio('4:3'), false);
  assert.equal(isMediaResolution('1080p'), true);
  assert.equal(isMediaResolution('8k'), false);
  assert.equal(isMediaExportFormat('webm'), true);
  assert.equal(isMediaExportFormat('avi'), false);
});
