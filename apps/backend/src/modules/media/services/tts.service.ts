import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ArkConfigService } from '../../ai/services/ark-config.service';
import { TextToSpeechProvider, TtsSynthesisResult } from '../../../providers/provider.contracts';

/**
 * TTS 服务
 *
 * 主路径: 火山引擎 TTS HTTP API
 *   - 端点: https://openspeech.bytedance.com/api/v1/tts
 *   - 鉴权方式与 ARK 不同:走 AppID + Token
 *
 * 由于本项目当前只配置了 ARK 凭证(没有单独的 OpenSpeech Token),
 * 这里使用一个"鲁棒兜底"方案:
 *   1. 读取 VOLC_TTS_APPID / VOLC_TTS_TOKEN 环境变量,有就调真实 TTS
 *   2. 否则生成一段"无声占位音频"(用 ffmpeg anullsrc 生成),保持时间轴对齐
 *
 * 这样使得整条管线在没有 TTS 凭证时也能跑通,只是少了人声;
 * 配置后无缝升级。
 */
@Injectable()
export class TtsService implements TextToSpeechProvider {
  readonly capability = 'tts' as const;
  private readonly logger = new Logger(TtsService.name);
  private readonly appId: string | undefined;
  private readonly token: string | undefined;
  private readonly cluster: string;
  private readonly endpoint = 'https://openspeech.bytedance.com/api/v1/tts';

  constructor(private readonly arkConfig: ArkConfigService) {
    this.appId = process.env.VOLC_TTS_APPID;
    this.token = process.env.VOLC_TTS_TOKEN;
    this.cluster = process.env.VOLC_TTS_CLUSTER || 'volcano_tts';
  }

  hasRealTts(): boolean {
    return !!(this.appId && this.token);
  }

  /**
   * 生成 TTS 音频文件(MP3)
   * @param text 要合成的台词文本
   * @param outPath 输出 MP3 路径
   * @param voiceType 音色,默认温柔女声
   * @param speedRatio 语速 0.8 - 1.2
   * @returns 输出路径
   */
  async synthesize(
    text: string,
    outPath: string,
    voiceType = 'BV700_streaming',
    speedRatio = 1.0
  ): Promise<TtsSynthesisResult> {
    if (!text.trim()) {
      // 没有台词,直接写一段 1s 静音
      await this.writeSilence(outPath, 1);
      return { outPath, durationSec: 1, mode: 'silence' };
    }

    if (!this.hasRealTts()) {
      // 估算时长(中文 4 字/秒 + 0.5s 头尾静音)
      const estDuration = Math.max(2, text.length / 4 + 0.5);
      await this.writeSilence(outPath, estDuration);
      this.logger.warn(`未配置 VOLC_TTS_*,生成 ${estDuration.toFixed(1)}s 静音占位`);
      return { outPath, durationSec: estDuration, mode: 'silence' };
    }

    try {
      const reqId = `vidforge_${Date.now()}`;
      const body = {
        app: { appid: this.appId, token: this.token, cluster: this.cluster },
        user: { uid: 'vidforge' },
        audio: {
          voice_type: voiceType,
          encoding: 'mp3',
          speed_ratio: speedRatio,
          rate: 24000,
        },
        request: {
          reqid: reqId,
          text,
          operation: 'query',
          text_type: 'plain',
        },
      };

      const resp = await axios.post(this.endpoint, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer;${this.token}`,
        },
        timeout: 60000,
      });

      const data = resp.data?.data;
      if (!data) throw new Error(`TTS 响应缺少 data: ${JSON.stringify(resp.data).slice(0, 200)}`);
      const audioBuffer = Buffer.from(data, 'base64');

      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, audioBuffer);
      const stat = await fs.stat(outPath);
      // 简单估算:128k mp3 ~= 16KB/s
      const durationSec = stat.size / 16000;
      return { outPath, durationSec, mode: 'real' };
    } catch (err: any) {
      this.logger.error(`TTS 调用失败,回落到静音: ${err?.message ?? err}`);
      const estDuration = Math.max(2, text.length / 4 + 0.5);
      await this.writeSilence(outPath, estDuration);
      return { outPath, durationSec: estDuration, mode: 'silence' };
    }
  }

  /**
   * 用 ffmpeg 写一段指定时长的静音 MP3
   */
  private async writeSilence(outPath: string, durationSec: number): Promise<void> {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    const { spawn } = await import('child_process');
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'ffmpeg',
        [
          '-y',
          '-f',
          'lavfi',
          '-i',
          `anullsrc=channel_layout=stereo:sample_rate=44100`,
          '-t',
          String(Math.max(0.5, durationSec)),
          '-c:a',
          'libmp3lame',
          '-b:a',
          '96k',
          outPath,
        ],
        { stdio: 'ignore' }
      );
      child.on('error', reject);
      child.on('close', (code) =>
        code === 0 ? resolve() : reject(new Error(`ffmpeg silence exit ${code}`))
      );
    });
  }
}
