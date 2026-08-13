import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  MAX_COMPOSE_MEDIA_DIMENSION,
  validateComposeShots,
  validateMediaMetadata,
} from './composer.service';

test('compose validation accepts usable shots', () => {
  assert.doesNotThrow(() =>
    validateComposeShots([
      { id: 'shot-1', index: 0, videoUrl: 'https://example.com/a.mp4', duration: 2 },
    ])
  );
});

test('compose validation rejects empty URLs and invalid durations', () => {
  assert.throws(
    () => validateComposeShots([{ id: 'shot-1', index: 0, videoUrl: '  ' }]),
    /缺少 videoUrl/
  );
  assert.throws(
    () => validateComposeShots([{ id: 'shot-1', index: 0, videoUrl: 'a.mp4', duration: 0 }]),
    /duration 必须为正数/
  );
});

test('media metadata validation rejects missing, oversized, and malformed video inputs', () => {
  assert.throws(
    () => validateMediaMetadata({ durationSec: 0, width: 1920, height: 1080 }, 'shot-1'),
    /缺少有效视频时长/
  );
  assert.throws(
    () =>
      validateMediaMetadata(
        { durationSec: 1, width: MAX_COMPOSE_MEDIA_DIMENSION + 1, height: 1080 },
        'shot-2'
      ),
    /尺寸超过/
  );
  assert.throws(
    () => validateMediaMetadata({ durationSec: 1, width: 0, height: 1080 }, 'shot-3'),
    /缺少有效视频尺寸/
  );
});
