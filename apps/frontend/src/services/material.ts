import apiClient from '../utils/api';

export interface MaterialItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url?: string;
  thumbnailUrl?: string;
  size?: number;
  tags?: string[];
  category?: string;
  createdAt: string;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const materialApi = {
  getList(params?: { search?: string; type?: string; tag?: string; page?: number; pageSize?: number }) {
    return apiClient.get<any, PaginatedResult<MaterialItem>>('/material', { params });
  },

  getById(id: string) {
    return apiClient.get<any, MaterialItem>(`/material/${id}`);
  },

  create(data: { name: string; type: string; tags?: string[]; category?: string }) {
    return apiClient.post<any, MaterialItem>('/material', data);
  },

  delete(id: string) {
    return apiClient.delete(`/material/${id}`);
  },
};
