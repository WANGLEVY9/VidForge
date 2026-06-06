import api from './api';

export interface Template {
  id: string;
  userId: string;
  name: string;
  category: string;
  style: string;
  shots: Record<string, any>[];
  voiceover: string | null;
  bgmSuggestion: string | null;
  tags: string[];
  duration: number;
  sourceScriptId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateDto {
  name: string;
  category: string;
  style?: string;
  shots: Record<string, any>[];
  voiceover?: string;
  bgmSuggestion?: string;
  tags?: string[];
  duration?: number;
  sourceScriptId?: string;
}

export const templateApi = {
  getList(params?: { category?: string; style?: string }): Promise<Template[]> {
    return api.get('/template', { params }).then((r) => r.data);
  },

  getById(id: string): Promise<Template> {
    return api.get(`/template/${id}`).then((r) => r.data);
  },

  create(dto: CreateTemplateDto): Promise<Template> {
    return api.post('/template', dto).then((r) => r.data);
  },

  remove(id: string): Promise<void> {
    return api.delete(`/template/${id}`).then((r) => r.data);
  },
};
