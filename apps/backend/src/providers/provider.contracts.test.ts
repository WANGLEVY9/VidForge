import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { ArkTextService } from '../modules/ai/services/ark-text.service';
import { ArkVideoService } from '../modules/ai/services/ark-video.service';
import { FfmpegService } from '../modules/media/services/ffmpeg.service';
import { OssService } from '../modules/media/services/oss.service';
import { TtsService } from '../modules/media/services/tts.service';

test('concrete adapters expose stable provider capabilities', () => {
  assert.equal(new ArkTextService({} as never, {} as never).capability, 'text');
  assert.equal(new ArkVideoService({} as never).capability, 'video');
  assert.equal(new FfmpegService().capability, 'media');
  assert.equal(new OssService().capability, 'storage');
  assert.equal(new TtsService({} as never).capability, 'tts');
});
