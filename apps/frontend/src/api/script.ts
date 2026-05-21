import request from '@/utils/request';
import { Script, GenerateScriptParams } from '@/types/script';

export interface ScriptListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface ScriptListResult {
  list: Script[];
  total: number;
  page: number;
  pageSize: number;
}

// 生成剧本
export function generateScript(params: GenerateScriptParams): Promise<Script> {
  return request.post('/script/generate', params);
}

// 获取剧本列表
export function getScriptList(params: ScriptListQuery): Promise<ScriptListResult> {
  return request.get('/script', { params });
}

// 获取剧本详情
export function getScriptDetail(id: string): Promise<Script> {
  return request.get(`/script/${id}`);
}

// 删除剧本
export function deleteScript(id: string): Promise<{ success: boolean }> {
  return request.delete(`/script/${id}`);
}

// 更新剧本分镜
export function updateScriptStoryboards(id: string, storyboards: any[]): Promise<Script> {
  return request.put(`/script/${id}/storyboards`, { storyboards });
}

// 重新生成指定分镜
export function regenerateStoryboard(id: string, index: number, prompt?: string): Promise<Script> {
  return request.post(`/script/${id}/storyboards/${index}/regenerate`, { prompt });
}
