import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TtsService, TTSOptions, TTSVoiceType } from './services/tts.service';

@ApiTags('AI能力')
@Controller('ai')
export class AiController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('tts/generate')
  @ApiOperation({ summary: '生成语音（TTS）' })
  generateTTS(@Body() options: TTSOptions) {
    return this.ttsService.generateSpeech(options);
  }

  @Get('tts/voices')
  @ApiOperation({ summary: '获取支持的音色列表' })
  getVoices() {
    const voices = [
      { value: TTSVoiceType.ZH_FEMALE_WARM, label: '温暖女声', language: 'zh' },
      { value: TTSVoiceType.ZH_FEMALE_SWEET, label: '甜美女声', language: 'zh' },
      { value: TTSVoiceType.ZH_FEMALE_PROFESSIONAL, label: '专业女声', language: 'zh' },
      { value: TTSVoiceType.ZH_MALE_MAGNETIC, label: '磁性男声', language: 'zh' },
      { value: TTSVoiceType.ZH_MALE_ENERGETIC, label: '活力男声', language: 'zh' },
      { value: TTSVoiceType.EN_FEMALE, label: '英文女声', language: 'en' },
      { value: TTSVoiceType.EN_MALE, label: '英文男声', language: 'en' },
      { value: TTSVoiceType.JA_FEMALE, label: '日语女声', language: 'ja' },
      { value: TTSVoiceType.KO_FEMALE, label: '韩语女声', language: 'ko' },
    ];
    return voices;
  }
}
