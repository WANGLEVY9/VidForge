import { Global, Module, OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { FfmpegService } from './services/ffmpeg.service';
import { SubtitleService } from './services/subtitle.service';
import { TtsService } from './services/tts.service';
import { BgmService } from './services/bgm.service';
import { StorageService } from './services/storage.service';
import { ComposerService } from './services/composer.service';
import { AiModule } from '../ai/ai.module';

/**
 * 媒体处理统一模块
 *
 * 职责:
 * - FFmpeg 命令行封装(concat / scale / subtitle / mix / transcode)
 * - 字幕(SRT)生成
 * - TTS 文转音(火山 OpenSpeech,缺凭证时回落静音占位)
 * - BGM 选择(按风格)
 * - 存储抽象(本地静态托管 / 未来扩展 OSS)
 * - 合片协调(把以上几项编排为完整的端到端管线)
 *
 * Global 修饰符让 Creation/Export/Material 模块可以直接 inject
 */
@Global()
@Module({
  imports: [AiModule],
  providers: [FfmpegService, SubtitleService, TtsService, BgmService, StorageService, ComposerService],
  exports: [FfmpegService, SubtitleService, TtsService, BgmService, StorageService, ComposerService],
})
export class MediaModule implements OnModuleInit {
  private readonly logger = new Logger(MediaModule.name);

  constructor(
    private readonly ffmpeg: FfmpegService,
    private readonly bgm: BgmService,
  ) {}

  async onModuleInit(): Promise<void> {
    const probe = await this.ffmpeg.checkAvailable();
    if (probe.available) {
      this.logger.log(`FFmpeg 可用: ${probe.version?.slice(0, 80)}`);
    } else {
      this.logger.warn(
        'FFmpeg 不可用!视频合片/导出/抽帧将失败。请安装 ffmpeg ≥4.x,或在 Docker 镜像中预装。',
      );
    }
    await this.bgm.ensureSeedReadme();
  }
}
