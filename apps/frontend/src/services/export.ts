import apiClient from '../utils/api';

export interface ExportTask {
  id: string;
  creationTaskId: string;
  format: string;
  resolution: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  fileSize?: number;
  createdAt: string;
}

export interface CreateExportDto {
  creationTaskId: string;
  format?: string;
  resolution?: string;
  embedSubtitles?: boolean;
  keepIndividualShots?: boolean;
  generateThumbnail?: boolean;
}

export const exportApi = {
  create(data: CreateExportDto) {
    return apiClient.post<any, ExportTask>('/export', data);
  },
  getList() {
    return apiClient.get<any, ExportTask[]>('/export/list');
  },
  cancel(id: string) {
    return apiClient.delete(`/export/${id}`);
  },
};
