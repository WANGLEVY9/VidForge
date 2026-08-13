import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { ComposerService } from './composer.service';
import { FfmpegService } from './ffmpeg.service';

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

test(
  'composer renders a local fixture into a playable artifact without paid providers',
  { skip: !hasFfmpeg },
  async () => {
    await mkdir(path.join(process.cwd(), 'storage', 'tmp'), { recursive: true });
    const workspace = await mkdtemp(path.join(process.cwd(), 'storage', 'tmp', 'smoke-'));
    const fixture = path.join(workspace, 'fixture.mp4');
    const outputDir = path.join(workspace, 'published');
    const rendered = path.join(outputDir, 'smoke-task.mp4');

    try {
      const generated = spawnSync(
        'ffmpeg',
        [
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=0x152238:s=320x568:r=24',
          '-t',
          '1',
          '-an',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          fixture,
        ],
        { stdio: 'ignore' }
      );
      assert.equal(generated.status, 0, 'ffmpeg fixture generation failed');

      const ffmpeg = new FfmpegService();
      const storage = {
        createTaskWorkdir: async (_scope: string, taskId: string) =>
          mkdtemp(path.join(workspace, `${taskId}-`)),
        cleanupTaskWorkdir: async (scope: string, taskId: string) => {
          void scope;
          void taskId;
        },
        publish: async (localPath: string, _scope: string, name: string) => {
          await mkdir(outputDir);
          const finalPath = path.join(outputDir, name);
          await rename(localPath, finalPath);
          const file = await stat(finalPath);
          return {
            url: `/static/outputs/creation/${name}`,
            absPath: finalPath,
            size: file.size,
            sha256: 'fixture-sha256',
          };
        },
      };
      const subtitle = { buildLinesFromShots: () => [] };
      const tts = { synthesize: async () => ({ outPath: '', durationSec: 0, mode: 'fallback' }) };
      const bgm = { pickByStyle: async () => undefined };
      const composer = new ComposerService(
        ffmpeg,
        subtitle as never,
        tts as never,
        bgm as never,
        storage as never
      );

      const result = await composer.compose(
        [
          {
            id: 'fixture-shot',
            index: 1,
            videoUrl: pathToFileURL(fixture).href,
            duration: 1,
            caption: 'VidForge smoke fixture',
          },
        ],
        {
          taskId: 'smoke-task',
          title: 'VidForge smoke fixture',
          ratio: '9:16',
          resolution: '480p',
          burnSubtitle: false,
        }
      );

      const artifact = await stat(rendered);
      const metadata = await ffmpeg.probe(rendered);
      assert.equal(result.finalUrl, '/static/outputs/creation/smoke-task.mp4');
      assert.equal(result.finalAbsPath, rendered);
      assert.equal(result.fileSize, artifact.size);
      assert.equal(result.checksumSha256, 'fixture-sha256');
      assert.ok(artifact.size > 0);
      assert.ok(metadata.durationSec > 0.5);
      assert.equal(metadata.width, 270);
      assert.equal(metadata.height, 480);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  }
);
