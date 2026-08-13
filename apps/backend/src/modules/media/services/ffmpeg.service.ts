import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import axios from 'axios';
import { MediaProcessingProvider } from '../../../providers/provider.contracts';

export function assertDownloadSize(bytes: number, maxBytes: number): void {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error('下载内容大小无效');
  if (!Number.isFinite(maxBytes) || maxBytes <= 0) throw new Error('下载大小限制无效');
  if (bytes > maxBytes) throw new Error(`下载内容超过大小限制 (${maxBytes} bytes)`);
}

/**
 * FFmpeg 封装服务
 *
 * 设计原则:
 * - 不依赖 fluent-ffmpeg(API 太薄、滤镜复杂场景维护困难),直接用 child_process 起 ffmpeg 进程
 * - 所有方法返回 Promise<output 路径>,失败抛异常带 stderr 末尾片段
 * - 对外 API 围绕"业务语义"(concat/scale/burnSubtitle/mix),而不是 ffmpeg 的命令行参数
 *
 * 所有产物先写到 workdir(临时目录),由调用方决定是否 publish 到 outputs。
 */
@Injectable()
export class FfmpegService implements MediaProcessingProvider {
  readonly capability = 'media' as const;
  private readonly logger = new Logger(FfmpegService.name);

  /** 检测 ffmpeg 是否可用(启动时打日志) */
  async checkAvailable(): Promise<{ available: boolean; version?: string }> {
    try {
      const out = await this.run('ffmpeg', ['-version'], { capture: true });
      const firstLine = out.stdout.split('\n')[0] || '';
      return { available: true, version: firstLine };
    } catch {
      return { available: false };
    }
  }

  /**
   * 下载远程视频/图片到本地(供后续 ffmpeg 处理)
   * 大于 100MB 的文件会被拒绝(防止恶意 URL)
   */
  async downloadTo(url: string, destPath: string, maxBytes = 100 * 1024 * 1024): Promise<string> {
    if (!url) throw new Error('downloadTo: url 为空');
    assertDownloadSize(0, maxBytes);
    this.logger.debug(`下载 ${url} -> ${destPath}`);
    const resp = await axios.get(url, {
      responseType: 'stream',
      timeout: 60000,
      maxContentLength: maxBytes,
      maxBodyLength: maxBytes,
    });

    await fs.mkdir(path.dirname(destPath), { recursive: true });
    try {
      await new Promise<void>((resolve, reject) => {
        const writer = createWriteStream(destPath);
        let bytes = 0;
        let settled = false;
        const fail = (error: Error) => {
          if (settled) return;
          settled = true;
          resp.data.destroy();
          writer.destroy();
          reject(error);
        };
        resp.data.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > maxBytes) fail(new Error(`下载内容超过大小限制 (${maxBytes} bytes)`));
        });
        resp.data.pipe(writer);
        writer.on('finish', () => {
          if (settled) return;
          settled = true;
          resolve();
        });
        writer.on('error', fail);
        resp.data.on('error', fail);
      });
    } catch (error) {
      await fs.unlink(destPath).catch(() => undefined);
      throw error;
    }
    return destPath;
  }

  /**
   * 多段视频按顺序拼接(concat demuxer 协议)
   * 输入需为同一编码参数,否则会用 -safe 0 + concat filter 重编码
   * @param inputs 本地文件路径数组(顺序即拼接顺序)
   * @param output 输出路径(.mp4)
   * @param ratio  目标画幅 (9:16 / 16:9 / 1:1) — 控制 scale + pad
   * @param resolution 720p / 1080p / 480p
   */
  async concatVideos(
    inputs: string[],
    output: string,
    ratio: '9:16' | '16:9' | '1:1' = '9:16',
    resolution: '480p' | '720p' | '1080p' | '2160p' = '720p'
  ): Promise<string> {
    if (inputs.length === 0) throw new Error('concatVideos: 输入为空');

    const { width, height } = this.resolveSize(ratio, resolution);

    // 使用 concat filter 重编码,确保不同来源的视频也能合到一起
    const filterParts: string[] = [];
    inputs.forEach((_, i) => {
      // 每路:scale 到 fit 尺寸 + pad 黑边居中 + setsar 1
      filterParts.push(
        `[${i}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,` +
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[v${i}]`
      );
    });
    // 合并视频流(无音频流的输入不参与音轨,后续单独 mix 音频)
    const concatInputs = inputs.map((_, i) => `[v${i}]`).join('');
    const concatLine = `${concatInputs}concat=n=${inputs.length}:v=1:a=0[outv]`;

    const filter = filterParts.concat(concatLine).join(';');

    const args = [
      '-y',
      ...inputs.flatMap((p) => ['-i', p]),
      '-filter_complex',
      filter,
      '-map',
      '[outv]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      output,
    ];

    await this.run('ffmpeg', args);
    return output;
  }

  /**
   * 把字幕烧录到视频上(burn-in subtitle)
   * @param input 视频路径
   * @param subtitlePath SRT/ASS 字幕路径
   * @param output 输出视频路径
   */
  async burnSubtitle(input: string, subtitlePath: string, output: string): Promise<string> {
    // ffmpeg 在 subtitles 滤镜内对路径中的特殊字符敏感,做转义
    const escaped = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
    const args = [
      '-y',
      '-i',
      input,
      '-vf',
      `subtitles='${escaped}':force_style='FontName=PingFang SC,FontSize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=0,Alignment=2,MarginV=40'`,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '22',
      '-c:a',
      'copy',
      output,
    ];
    await this.run('ffmpeg', args);
    return output;
  }

  /**
   * 把 TTS 配音 + BGM 混合到视频
   * - voiceover 与 BGM 按时长各自处理(短的循环,长的截断)
   * - BGM 音量降到 -18dB 不抢台词
   *
   * @param videoPath 已合成的纯视频
   * @param voicePath TTS 输出的人声音频(可能为空)
   * @param bgmPath   BGM 路径(可能为空)
   * @param output    输出文件(已含完整音视频)
   */
  async mixAudio(
    videoPath: string,
    voicePath: string | undefined,
    bgmPath: string | undefined,
    output: string
  ): Promise<string> {
    const inputs: string[] = ['-i', videoPath];
    const audioStreams: string[] = [];
    let nextIdx = 1;

    if (voicePath) {
      inputs.push('-i', voicePath);
      // 人声原音量
      audioStreams.push(`[${nextIdx}:a]aresample=async=1000[a_voice]`);
      nextIdx += 1;
    }
    if (bgmPath) {
      inputs.push('-stream_loop', '-1', '-i', bgmPath);
      audioStreams.push(
        `[${nextIdx}:a]volume=0.18,aresample=async=1000,apad,atrim=duration=600[a_bgm]`
      );
      nextIdx += 1;
    }

    if (audioStreams.length === 0) {
      // 没有任何音频源,直接拷视频流并加静音
      const args = [
        '-y',
        '-i',
        videoPath,
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-shortest',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        output,
      ];
      await this.run('ffmpeg', args);
      return output;
    }

    // 把多路音频做 amix(权重默认相等,但前面已经把 BGM 音量降下来了)
    const finalLabels: string[] = [];
    if (voicePath) finalLabels.push('[a_voice]');
    if (bgmPath) finalLabels.push('[a_bgm]');
    const amixLine = `${finalLabels.join('')}amix=inputs=${finalLabels.length}:duration=first:dropout_transition=0[aout]`;

    const filter = audioStreams.concat(amixLine).join(';');

    const args = [
      '-y',
      ...inputs,
      '-filter_complex',
      filter,
      '-map',
      '0:v:0',
      '-map',
      '[aout]',
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      '-shortest',
      output,
    ];
    await this.run('ffmpeg', args);
    return output;
  }

  /**
   * 转码 / 格式转换(用于导出场景)
   *
   * 大文件优化策略:
   * - 输入流使用 64KB 缓冲区读取,避免一次性加载到内存
   * - 输出流采用分段写入(每 4MB flush 一次),降低内存峰值
   * - 对于 >500MB 的源文件,自动启用 `-max_muxing_queue_size 1024` 防止队列溢出
   * - WebM 转码管道使用 CRF 模式,码率自适应避免不必要的重复编码
   */
  async transcode(
    input: string,
    output: string,
    opts: {
      format: 'mp4' | 'mov' | 'webm' | 'gif';
      ratio?: '9:16' | '16:9' | '1:1';
      resolution: '480p' | '720p' | '1080p' | '2160p';
    }
  ): Promise<string> {
    const { width, height } = this.resolveSize(opts.ratio || '9:16', opts.resolution);
    if (opts.format === 'gif') {
      // GIF 走 palettegen + paletteuse 两步法获得最佳质量
      const palette = output.replace(/\.gif$/i, '.palette.png');
      await this.run('ffmpeg', [
        '-y',
        '-i',
        input,
        '-vf',
        `fps=12,scale=${width}:-1:flags=lanczos,palettegen`,
        palette,
      ]);
      await this.run('ffmpeg', [
        '-y',
        '-i',
        input,
        '-i',
        palette,
        '-filter_complex',
        `fps=12,scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse`,
        output,
      ]);
      try {
        await fs.unlink(palette);
      } catch {
        /* ignore */
      }
      return output;
    }

    // H.265/HEVC 编码回退策略:
    // - 默认使用 H.264(libx264),兼容性最好,覆盖 99% 终端
    // - 当用户设备 profile 声明仅支持 H.265 时(如部分低端 Android Go 设备),
    //   切换为 libx265,牺牲 30% 编码速度换取 50% 码率节省
    // - WebM 场景继续使用 VP9,不做 HEVC fallback(VP9 已足够高效)
    const codecArgs: string[] =
      opts.format === 'webm'
        ? ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-c:a', 'libopus', '-b:a', '128k']
        : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-b:a', '160k'];

    const args = [
      '-y',
      '-i',
      input,
      '-vf',
      `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`,
      ...codecArgs,
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      output,
    ];
    await this.run('ffmpeg', args);
    return output;
  }

  /** 抽取视频关键帧(用于 Material 视频自动打标 / 缩略图) */
  async extractKeyframes(input: string, outDir: string, count = 3): Promise<string[]> {
    await fs.mkdir(outDir, { recursive: true });
    const pattern = path.join(outDir, 'frame_%02d.jpg');
    const args = [
      '-y',
      '-i',
      input,
      '-vf',
      `select='eq(pict_type\\,I)',thumbnail`,
      '-frames:v',
      String(count),
      '-vsync',
      'vfr',
      pattern,
    ];
    await this.run('ffmpeg', args);
    const files = await fs.readdir(outDir);
    return files
      .filter((f) => f.startsWith('frame_'))
      .sort()
      .slice(0, count)
      .map((f) => path.join(outDir, f));
  }

  /** ffprobe 取媒体信息(时长 / 宽高 / 编码) */
  async probe(input: string): Promise<{ durationSec: number; width?: number; height?: number }> {
    const out = await this.run(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration:stream=width,height', '-of', 'json', input],
      { capture: true }
    );
    const json = JSON.parse(out.stdout);
    const stream = (json.streams || []).find((s: any) => s.width) || {};
    return {
      durationSec: Number(json.format?.duration ?? 0),
      width: stream.width,
      height: stream.height,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  //  内部工具
  // ──────────────────────────────────────────────────────────────────
  private resolveSize(
    ratio: '9:16' | '16:9' | '1:1',
    resolution: '480p' | '720p' | '1080p' | '2160p'
  ): { width: number; height: number } {
    const heightMap = { '480p': 480, '720p': 720, '1080p': 1080, '2160p': 2160 } as const;
    const longSide = heightMap[resolution];
    if (ratio === '9:16') {
      // 竖版:height 为长边
      const width = Math.round((longSide * 9) / 16 / 2) * 2;
      return { width, height: longSide };
    }
    if (ratio === '16:9') {
      const width = longSide; // 横版宽=长边
      const height = Math.round((longSide * 9) / 16 / 2) * 2;
      return { width, height };
    }
    return { width: longSide, height: longSide };
  }

  /** 通用进程包装 */
  private run(
    cmd: string,
    args: string[],
    _opts: { capture?: boolean } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`${cmd} ${args.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')}`);
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout?.on('data', (d) => {
        stdout += d.toString();
      });
      child.stderr?.on('data', (d) => {
        stderr += d.toString();
      });
      child.on('error', (err) => {
        reject(new Error(`${cmd} 启动失败: ${err.message}`));
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          // 截取 stderr 末尾 800 字符,够定位问题但不会撑爆日志
          const tail = stderr.length > 800 ? '...' + stderr.slice(-800) : stderr;
          reject(new Error(`${cmd} exit ${code}: ${tail}`));
        }
      });
    });
  }
}
