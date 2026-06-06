import apiClient from '../utils/api';

export interface ScriptItem {
  id: string;
  title: string;
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style: string;
  storyboard: Record<string, any>[];
  voiceover?: string;
  bgmSuggestion?: string;
  tags?: string[];
  duration: number;
  createdAt: string;
}

export interface GenerateScriptDto {
  productName: string;
  category: string;
  sellingPoints: string;
  targetAudience?: string;
  style?: string;
  duration?: number;
  productSpaceId?: string;
}

export interface ComplianceHit {
  word: string;
  category: 'extreme' | 'medical' | 'hype' | 'platform' | 'custom';
  severity: 'low' | 'medium' | 'high';
  reason: string;
  suggestion?: string;
}

export interface ComplianceReport {
  passed: boolean;
  score: number;
  hits: ComplianceHit[];
  llmReviewed: boolean;
  llmFeedback?: string;
}

export interface RagReference {
  id: string;
  hookType: string;
  performance: string;
}

export interface ScriptResult {
  title: string;
  duration: number;
  totalDuration: string;
  shots: Array<{
    index: number;
    duration: number;
    description: string;
    voiceover: string;
    caption: string;
    cameraMovement?: string;
    type?: string;
  }>;
  voiceover: string;
  bgmSuggestion: string;
  tags: string[];
  source: 'ark' | 'fallback';
  fallbackReason?: string;
  ragReferences?: RagReference[];
  compliance?: ComplianceReport;
}

export interface InspireSeed {
  id: string;
  category: string;
  style: string;
  hookType: string;
  shots: { hook: any; demo: any; cta: any };
  keyMessages: string[];
  bgmStyle: string;
  performance: string;
}

export const scriptApi = {
  generate(data: GenerateScriptDto) {
    return apiClient.post<any, ScriptResult>('/script/generate', data, {
      timeout: 150000,
    });
  },

  /** 生成前预览同品类同风格的爆款参考 */
  inspire(category?: string, style?: string) {
    return apiClient.get<any, InspireSeed[]>('/script/inspire', { params: { category, style } });
  },

  save(data: Partial<ScriptItem> & { productSpaceId?: string }) {
    return apiClient.post<any, ScriptItem>('/script', data);
  },

  getList(spaceId?: string) {
    return apiClient.get<any, ScriptItem[]>('/script', { params: { spaceId } });
  },

  getById(id: string) {
    return apiClient.get<any, ScriptItem>(`/script/${id}`);
  },

  updateShots(id: string, shots: Record<string, any>[]) {
    return apiClient.patch<any, ScriptItem>(`/script/${id}/shots`, { shots });
  },

  regenerateShot(id: string, index: number) {
    return apiClient.post<any, any>(`/script/${id}/regenerate-shot`, { index });
  },
};
