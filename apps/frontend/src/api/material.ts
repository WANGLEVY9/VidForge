import request from '@/utils/request';
import { MaterialType } from '@/types/material';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  duration?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MaterialListQuery {
  page?: number;
  pageSize?: number;
  type?: MaterialType;
  keyword?: string;
}

export interface MaterialListResult {
  list: Material[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UploadMaterialParams {
  type: MaterialType;
  name?: string;
  tags?: string[];
  file: File;
}

// 上传素材
export function uploadMaterial(params: UploadMaterialParams, onProgress?: (progress: number) => void) {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('type', params.type);
  if (params.name) formData.append('name', params.name);
  if (params.tags) formData.append('tags', params.tags.join(','));

  return request.post('/material/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
}

// 获取素材列表
export function getMaterialList(params: MaterialListQuery): Promise<MaterialListResult> {
  return request.get('/material', { params });
}

// 获取素材详情
export function getMaterialDetail(id: string): Promise<Material> {
  return request.get(`/material/${id}`);
}

// 删除素材
export function deleteMaterial(id: string): Promise<{ success: boolean }> {
  return request.delete(`/material/${id}`);
}
