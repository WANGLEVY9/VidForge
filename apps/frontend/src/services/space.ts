import apiClient from '../utils/api';

export interface ProductSpace {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  productName?: string | null;
  category?: string | null;
  coverUrl?: string | null;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSpacePayload {
  name: string;
  description?: string;
  productName?: string;
  category?: string;
  coverUrl?: string;
}

export const spaceApi = {
  list() {
    return apiClient.get<any, ProductSpace[]>('/spaces');
  },
  create(data: CreateSpacePayload) {
    return apiClient.post<any, ProductSpace>('/spaces', data);
  },
  findOne(id: string) {
    return apiClient.get<any, ProductSpace>(`/spaces/${id}`);
  },
  update(id: string, data: Partial<CreateSpacePayload>) {
    return apiClient.patch<any, ProductSpace>(`/spaces/${id}`, data);
  },
  archive(id: string) {
    return apiClient.delete<any, void>(`/spaces/${id}`);
  },
  setDefault(id: string) {
    return apiClient.patch<any, void>(`/spaces/${id}/default`);
  },
};
