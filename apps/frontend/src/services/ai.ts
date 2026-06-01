import apiClient from '../utils/api';

export interface ArkFingerprint {
  length: number;
  masked: string;
  issues: string[];
}

export interface ArkConfigPublic {
  key: string;
  type: 'text' | 'video';
  name: string;
  endpointId: string;
  apiKey: string; // 已脱敏前 4 + 后 4
  isPrimary: boolean;
  description?: string;
  rateLimit?: string;
  apiKeySource?: 'db' | 'env' | 'builtin' | 'builtin-fallback';
  endpointSource?: 'db' | 'env' | 'builtin';
  blockedEnvKey?: string;
  apiKeyFingerprint?: ArkFingerprint;
  endpointFingerprint?: ArkFingerprint;
}

export interface ArkDiagnoseResult {
  ok: boolean;
  stage: 'config' | 'call';
  endpointId?: string;
  durationMs?: number;
  reason?: string;
  sample?: string;
  keySource?: 'db' | 'env' | 'builtin' | 'builtin-fallback';
  endpointSource?: 'db' | 'env' | 'builtin';
  envBlocked?: boolean;
  blockedEnvKey?: string;
  hint?: string;
  apiKeyFingerprint?: ArkFingerprint;
  endpointFingerprint?: ArkFingerprint;
}

export interface UpdateArkConfigPayload {
  endpointId?: string;
  apiKey?: string;
}

export const aiApi = {
  getConfigs() {
    return apiClient.get<any, ArkConfigPublic[]>('/ai/ark/configs');
  },
  diagnose() {
    return apiClient.get<any, ArkDiagnoseResult>('/ai/ark/diagnose', {
      timeout: 60000,
    });
  },
  updateConfig(modelKey: string, payload: UpdateArkConfigPayload) {
    return apiClient.patch<any, ArkConfigPublic>(
      `/ai/ark/configs/${modelKey}`,
      payload,
    );
  },
  clearOverride(modelKey: string) {
    return apiClient.delete<any, ArkConfigPublic>(
      `/ai/ark/configs/${modelKey}/override`,
    );
  },
};
