import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { FfmpegService } from './ffmpeg.service';
import { SubtitleService } from './subtitle.service';
import { TtsService } from './tts.service';
import { BgmService } from './bgm.service';
import { StorageService } from './storage.service';

export interface ComposeShotInput {
  id: string;
  index: number;
  videoUrl: string;
  duration?: number;
  caption?: string;
  voiceover?: string;
}

export interface ComposeOptions {
  taskId: string;
  title: string;
  ratio: '9:16' | '16:9' | '1:1';
  resolution: '480p' | '720p' | '1080p' | '2160p';
  /** 用于 BGM 风格匹配 */
  style?: string;
  /** 是否烧录字幕 */
  burnSubtitle?: boolean;
  /** 进度回调,0-100 */
  onProgress?: (progress: number, message: string) => void;
}

export interface ComposeResult {
  finalUrl: string;
  finalAbsPath: string;
  durationSec: number;
  fileSize: number;
  hasVoiceover: boolean;
  hasBgm: boolean;
  subtitleBurned: boolean;
}

/**
 * 视频合片协调器
 *
 * 把多个分镜片段拼成最终成片:
 * 1. 下载所有分镜视频到 workdir/segments
 * 2. ffmpeg concat → workdir/concat.mp4
 * 3. (可选)逐分镜 TTS → workdir/voice.mp3
 * 4. (可选)选 BGM
 * 5. mix audio → workdir/with-audio.mp4
 * 6. (可选)烧字幕 → workdir/with-subtitle.mp4
 * 7. publish 到 outputs/creation/<taskId>.mp4
 * 8. cleanup workdir
 */
@Injectable()
export class ComposerService {
  private readonly logger = new Logger(ComposerService.name);

  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly subtitle: SubtitleService,
    private readonly tts: TtsService,
    private readonly bgm: BgmService,
    private readonly storage: StorageService,
  ) {}

  async compose(shots: ComposeShotInput[], opts: ComposeOptions): Promise<ComposeResult> {
    const { taskId, ratio, resolution } = opts;
    const onProgress = opts.onProgress ?? (() => {});

    if (shots.length === 0) throw new Error('compose: 分镜列表为空');

    const workdir = await this.storage.createTaskWorkdir('creation', taskId);
    onProgress(2, '准备合片工作目录');

    try {
      // ── Step 1: 下载所有分镜视频 ───────────────────────────────
      const segmentsDir = path.join(workdir, 'segments');
      const localSegments: string[] = [];
      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        if (!shot.videoUrl) {
          throw new Error(`分镜 ${shot.index} 缺少 videoUrl`);
        }
        const local = path.join(segmentsDir, `seg_${String(i).padStart(2, '0')}.mp4`);
        await this.ffmpeg.downloadTo(shot.videoUrl, local);
        localSegments.push(local);
        onProgress(
          Math.round(2 + ((i + 1) / shots.length) * 20),
          `下载分镜 ${i + 1}/${shots.length}`,
        );
      }

      // ── Step 2: 视频流拼接 ─────────────────────────────────
      const concatPath = path.join(workdir, 'concat.mp4');
      await this.ffmpeg.concatVideos(localSegments, concatPath, ratio, resolution);
      onProgress(45, '视频流拼接完成');

      // ── Step 3: TTS 配音(整段一次合成,简化时间轴对齐) ───────────
      let voicePath: string | undefined;
      let voiceoverDuration = 0;
      const fullVoiceover = shots
        .map((s) => (s.voiceover || '').trim())
        .filter(Boolean)
        .join(' ');
      if (fullVoiceover) {
        const tmpVoice = path.join(workdir, 'voice.mp3');
        const voiceResult = await this.tts.synthesize(fullVoiceover, tmpVoice);
        voicePath = voiceResult.outPath;
        voiceoverDuration = voiceResult.durationSec;
        onProgress(58, `TTS 配音完成 (${voiceResult.mode})`);
      }

      // ── Step 4: BGM 选择 ─────────────────────────────────
      const bgmPath = await this.bgm.pickByStyle(opts.style ?? 'default');
      if (bgmPath) {
        onProgress(63, `BGM 选定: ${path.basename(bgmPath)}`);
      } else {
        onProgress(63, '未配置 BGM,跳过');
      }

      // ── Step 5: 混音 ────────────────────────────────────
      const withAudioPath = path.join(workdir, 'with-audio.mp4');
      await this.ffmpeg.mixAudio(concatPath, voicePath, bgmPath, withAudioPath);
      onProgress(78, '音频混合完成');

      // ── Step 6: 烧字幕(可选) ─────────────────────────────
      let finalLocalPath = withAudioPath;
      let subtitleBurned = false;
      if (opts.burnSubtitle !== false) {
        const lines = this.subtitle.buildLinesFromShots(shots);
        if (lines.length > 0) {
          const srtPath = path.join(workdir, 'caption.srt');
          await this.subtitle.writeSrt(lines, srtPath);
          const burned = path.join(workdir, 'with-subtitle.mp4');
          try {
            await this.ffmpeg.burnSubtitle(withAudioPath, srtPath, burned);
            finalLocalPath = burned;
            subtitleBurned = true;
            onProgress(90, '字幕烧录完成');
          } catch (err: any) {
            // 字幕失败不阻塞主流程,降级为无字幕
            this.logger.warn(`字幕烧录失败,使用无字幕版本: ${err?.message ?? err}`);
            onProgress(90, '字幕烧录失败,跳过');
          }
        }
      }

      // ── Step 7: 发布到 outputs ──────────────────────────────
      const outputName = `${taskId}.mp4`;
      const published = await this.storage.publish(finalLocalPath, 'creation', outputName);
      onProgress(98, '产物已发布');

      // ── Step 8: 探测时长 ────────────────────────────────
      const probe = await this.ffmpeg.probe(published.absPath);

      onProgress(100, '合片完成');

      return {
        finalUrl: published.url,
        finalAbsPath: published.absPath,
        durationSec: probe.durationSec || 0,
        fileSize: published.size,
        hasVoiceover: !!voicePath && voiceoverDuration > 0,
        hasBgm: !!bgmPath,
        subtitleBurned,
      };
    } finally {
      // 清理临时目录
      await this.storage.cleanupTaskWorkdir('creation', taskId);
    }
  }
}
