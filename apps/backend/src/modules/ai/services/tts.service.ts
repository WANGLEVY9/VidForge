import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { OssService } from '../../common/services/oss.service';

export enum TTSVoiceType {
  // 中文女声
  ZH_FEMALE_WARM = 'zh_female_warm', // 温暖女声
  ZH_FEMALE_SWEET = 'zh_female_sweet', // 甜美女声
  ZH_FEMALE_PROFESSIONAL = 'zh_female_professional', // 专业女声
  // 中文男声
  ZH_MALE_MAGNETIC = 'zh_male_magnetic', // 磁性男声
  ZH_MALE_ENERGETIC = 'zh_male_energetic', // 活力男声
  // 英文
  EN_FEMALE = 'en_female', // 英文女声
  EN_MALE = 'en_male', // 英文男声
  // 多语种
  JA_FEMALE = 'ja_female', // 日语女声
  KO_FEMALE = 'ko_female', // 韩语女声
}

export const TTSVoiceMap = {
  [TTSVoiceType.ZH_FEMALE_WARM]: 'BV001',
  [TTSVoiceType.ZH_FEMALE_SWEET]: 'BV002',
  [TTSVoiceType.ZH_FEMALE_PROFESSIONAL]: 'BV003',
  [TTSVoiceType.ZH_MALE_MAGNETIC]: 'BV004',
  [TTSVoiceType.ZH_MALE_ENERGETIC]: 'BV005',
  [TTSVoiceType.EN_FEMALE]: 'BV006',
  [TTSVoiceType.EN_MALE]: 'BV007',
  [TTSVoiceType.JA_FEMALE]: 'BV008',
  [TTSVoiceType.KO_FEMALE]: 'BV009',
};

export interface TTSOptions {
  text: string;
  voiceType?: TTSVoiceType;
  speed?: number; // 语速 0.5-2.0，默认1.0
  pitch?: number; // 音调 0.5-2.0，默认1.0
  volume?: number; // 音量 0-100，默认50
  format?: 'mp3' | 'wav' | 'pcm'; // 格式，默认mp3
}

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly region: string;
  private readonly endpoint: string;

  constructor(
    private configService: ConfigService,
    private ossService: OssService,
  ) {
    this.accessKey = this.configService.get('VOLC_ENGINE_ACCESS_KEY') || 'YOUR_VOLC_ENGINE_ACCESS_KEY';
    this.secretKey = this.configService.get('VOLC_ENGINE_SECRET_KEY') || 'YOUR_VOLC_ENGINE_SECRET_KEY';
    this.region = this.configService.get('VOLC_ENGINE_REGION') || 'cn-beijing';
    this.endpoint = `https://openspeech.bytedance.com/api/v1/tts`;
  }

  /**
   * 生成语音
   */
  async generateSpeech(options: TTSOptions): Promise<{ audioUrl: string; duration: number }> {
    const {
      text,
      voiceType = TTSVoiceType.ZH_FEMALE_WARM,
      speed = 1.0,
      pitch = 1.0,
      volume = 50,
      format = 'mp3',
    } = options;

    try {
      // Mock生成，实际对接火山引擎TTS API
      this.logger.log(`生成TTS语音，文本：${text.substring(0, 50)}...，音色：${voiceType}`);

      // 构造请求参数
      const requestBody = {
        app: {
          appid: 'your_app_id',
          token: this.generateSignature(),
          cluster: 'volcano_tts',
        },
        user: {
          uid: 'vidforge_user',
        },
        audio: {
          voice_type: TTSVoiceMap[voiceType],
          language: 'zh',
          speed,
          pitch,
          volume,
          format,
          sample_rate: 16000,
          speech_rate: speed,
        },
        request: {
          reqid: crypto.randomUUID(),
          text,
          text_type: 'plain',
          operation: 'query',
        },
      };

      // TODO: 实际调用火山引擎API，这里返回Mock地址
      // const response = await axios.post(this.endpoint, requestBody, {
      //   headers: { 'Content-Type': 'application/json' },
      //   responseType: 'arraybuffer',
      // });

      // Mock音频文件，实际应上传API返回的音频内容
      const mockAudioBuffer = Buffer.from('mock audio content');
      const fileName = `tts/${crypto.randomUUID()}.${format}`;
      
      // 上传到OSS
      const { url } = await this.ossService.uploadFile({
        buffer: mockAudioBuffer,
        originalname: `${text.substring(0, 10)}.${format}`,
        mimetype: `audio/${format}`,
        size: mockAudioBuffer.length,
      } as any);

      // Mock时长，根据文本长度估算
      const duration = Math.round(text.length / 3); // 每秒3个字

      return {
        audioUrl: url,
        duration,
      };
    } catch (error) {
      this.logger.error('TTS生成失败:', error);
      throw new Error(`语音生成失败: ${error.message}`);
    }
  }

  /**
   * 生成签名（火山引擎API要求）
   */
  private generateSignature(): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(`${this.accessKey}${timestamp}`)
      .digest('hex');
    return signature;
  }
}
