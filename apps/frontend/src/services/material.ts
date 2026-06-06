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
  productSpaceId?: string;
  productTags?: Record<string, any>;
  videoTags?: Record<string, any>;
  clipTags?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export const materialApi = {
  getList(params?: {
    search?: string;
    type?: string;
    tag?: string;
    spaceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    return apiClient.get<any, PaginatedResult<MaterialItem>>('/material', { params });
  },

  getById(id: string) {
    return apiClient.get<any, MaterialItem>(`/material/${id}`);
  },

  create(data: {
    name: string;
    type: 'image' | 'video' | 'audio';
    url?: string;
    thumbnailUrl?: string;
    size?: number;
    tags?: string[];
    category?: string;
    productSpaceId?: string;
  }) {
    return apiClient.post<any, MaterialItem>('/material', data);
  },

  /** 文件上传( multipart/form-data ) */
  upload(file: File, extra?: { productSpaceId?: string; category?: string; tags?: string }) {
    const formData = new FormData();
    formData.append('file', file);
    if (extra?.productSpaceId) formData.append('productSpaceId', extra.productSpaceId);
    if (extra?.category) formData.append('category', extra.category);
    if (extra?.tags) formData.append('tags', extra.tags);
    return apiClient.post<any, MaterialItem>('/material/upload', formData);
  },

  delete(id: string) {
    return apiClient.delete(`/material/${id}`);
  },

  /** 触发 ARK 视觉理解,自动写入三层标签 */
  analyze(id: string, dto: { category?: string; description?: string } = {}) {
    return apiClient.patch<any, MaterialItem>(`/material/${id}/analyze`, dto);
  },

  /** 按标签筛选 */
  searchByTags(filters: {
    productCategory?: string;
    videoMood?: string;
    clipObjects?: string;
  }) {
    return apiClient.get<any, MaterialItem[]>('/material/search/tags', { params: filters });
  },

  /** 语义检索 */
  semanticSearch(query: string, limit = 20) {
    return apiClient.post<any, MaterialItem[]>('/material/search/semantic', { query, limit });
  },
};
