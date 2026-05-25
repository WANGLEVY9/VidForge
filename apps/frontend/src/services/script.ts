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

export const scriptApi = {
  generate(data: GenerateScriptDto) {
    // 剧本生成走真实 ARK 文本模型，单次可能 30-90s，单独放宽到 150s
    return apiClient.post<any, any>('/script/generate', data, {
      timeout: 150000,
    });
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
};
