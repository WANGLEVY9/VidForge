import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { validateComposeShots } from './composer.service';

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
