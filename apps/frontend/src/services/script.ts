import apiClient from '../utils/api';

export interface ScriptItem {
  id: string;
  title: string;
  productName: string;
  category: string;
  sellingPoints: string;
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
}

export const scriptApi = {
  generate(data: GenerateScriptDto) {
    return apiClient.post<any, any>('/script/generate', data);
  },

  save(data: Partial<ScriptItem>) {
    return apiClient.post<any, ScriptItem>('/script', data);
  },

  getList() {
    return apiClient.get<any, ScriptItem[]>('/script');
  },

  getById(id: string) {
    return apiClient.get<any, ScriptItem>(`/script/${id}`);
  },
};
