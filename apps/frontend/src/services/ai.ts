import apiClient from '../utils/api';

export interface ArkConfigPublic {
  key: string;
  type: 'text' | 'video';
  name: string;
  endpointId: string;
  apiKey: string; // 已脱敏
  isPrimary: boolean;
}

export interface ArkFingerprint {
  length: number;
  masked: string;
  issues: string[];
}

export interface ArkDiagnoseResult {
  ok: boolean;
  stage: 'config' | 'call';
  endpointId?: string;
  durationMs?: number;
  reason?: string;
  sample?: string;
  apiKeyFingerprint?: ArkFingerprint;
  endpointFingerprint?: ArkFingerprint;
}

export const aiApi = {
  getConfigs() {
    return apiClient.get<any, ArkConfigPublic[]>('/ai/ark/configs');
  },
  diagnose() {
    // 自检会真实发一次 ARK 请求，给 60s 超时
    return apiClient.get<any, ArkDiagnoseResult>('/ai/ark/diagnose', {
      timeout: 60000,
    });
  },
};
