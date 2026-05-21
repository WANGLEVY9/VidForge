import request from '@/utils/request';

export enum TTSVoiceType {
  ZH_FEMALE_WARM = 'zh_female_warm',
  ZH_FEMALE_SWEET = 'zh_female_sweet',
  ZH_FEMALE_PROFESSIONAL = 'zh_female_professional',
  ZH_MALE_MAGNETIC = 'zh_male_magnetic',
  ZH_MALE_ENERGETIC = 'zh_male_energetic',
  EN_FEMALE = 'en_female',
  EN_MALE = 'en_male',
  JA_FEMALE = 'ja_female',
  KO_FEMALE = 'ko_female',
}

export interface TTSOptions {
  text: string;
  voiceType?: TTSVoiceType;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'pcm';
}

export interface TTSResult {
  audioUrl: string;
  duration: number;
}

export interface VoiceOption {
  value: TTSVoiceType;
  label: string;
  language: string;
}

// 生成TTS语音
export function generateTTS(options: TTSOptions): Promise<TTSResult> {
  return request.post('/ai/tts/generate', options);
}

// 获取音色列表
export function getVoiceList(): Promise<VoiceOption[]> {
  return request.get('/ai/tts/voices');
}
