import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { VideoAspectRatio, VideoResolution, generateUUID } from '@vidforge/common';
import { OssService } from '../../common/services/oss.service';

const ffprobe = promisify(ffmpeg.ffprobe);

interface RenderOptions {
  scriptId: string;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  outputPath?: string;
}

interface RenderResult {
  videoUrl: string;
  duration: number;
  size: number;
}

@Injectable()
export class VideoRenderService implements OnModuleInit {
  private readonly logger = new Logger(VideoRenderService.name);
  private tempDir: string;

  constructor(private ossService: OssService) {
    this.tempDir = path.join(process.cwd(), 'temp', 'videos');
  }

  async onModuleInit() {
    // 确保临时目录存在
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * 渲染视频
   */
  async renderVideo(options: RenderOptions & { exportFormat?: string }, onProgress?: (progress: number) => void): Promise<RenderResult> {
    const { resolution, aspectRatio, exportFormat = 'mp4' } = options;
    const outputFileName = `${generateUUID()}.${exportFormat}`;
    const outputPath = path.join(this.tempDir, outputFileName);

    try {
      // 这里是模拟渲染过程，实际实现需要根据分镜、素材、字幕等合成视频
      // 1. 进度0-20%：准备素材
      onProgress?.(20);
      await this.delay(1000);

      // 2. 进度20-60%：渲染画面
      onProgress?.(40);
      await this.delay(1500);
      onProgress?.(60);
      await this.delay(1500);

      // 3. 进度60-90%：合成音频、字幕
      onProgress?.(80);
      await this.delay(1000);

      // 4. 进度90-100%：导出视频
      onProgress?.(90);
      await this.delay(500);

      // 模拟生成一个空的视频文件（实际项目中替换为真实FFmpeg合成逻辑）
      await fs.writeFile(outputPath, Buffer.from('mock video content'));

      // 获取视频信息
      const stats = await fs.stat(outputPath);
      const duration = 15; // 模拟15秒

      // 上传到OSS
      const fileBuffer = await fs.readFile(outputPath);
      const { url } = await this.ossService.uploadFile(
        {
          buffer: fileBuffer,
          originalname: outputFileName,
          mimetype: 'video/mp4',
          size: stats.size,
        } as any,
        'videos'
      );

      // 清理临时文件
      await fs.unlink(outputPath);

      onProgress?.(100);

      return {
        videoUrl: url,
        duration,
        size: stats.size,
      };
    } catch (error) {
      // 清理临时文件
      try {
        await fs.unlink(outputPath);
      } catch {}
      throw error;
    }
  }

  /**
   * 获取视频分辨率尺寸
   */
  getResolutionSize(resolution: VideoResolution, aspectRatio: VideoAspectRatio): { width: number; height: number } {
    const resolutionMap = {
      [VideoResolution.RESOLUTION_720P]: 720,
      [VideoResolution.RESOLUTION_1080P]: 1080,
      [VideoResolution.RESOLUTION_2K]: 1440,
      [VideoResolution.RESOLUTION_4K]: 2160,
    };

    const height = resolutionMap[resolution];
    let width: number;

    switch (aspectRatio) {
      case VideoAspectRatio.RATIO_9_16:
        width = Math.round(height * 9 / 16);
        break;
      case VideoAspectRatio.RATIO_16_9:
        width = Math.round(height * 16 / 9);
        break;
      case VideoAspectRatio.RATIO_1_1:
        width = height;
        break;
      default:
        width = Math.round(height * 9 / 16);
    }

    return { width, height };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
