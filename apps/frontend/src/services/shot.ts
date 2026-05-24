import apiClient from '../utils/api';

export interface ShotData {
  id: string;
  order: number;
  description: string;
  duration: number;
  type: 'text-to-video' | 'image-to-video';
  referenceMaterialId?: string;
  script: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface RegenerateShotDto {
  shotId: string;
  description?: string;
  overrides?: Record<string, any>;
}

export const shotApi = {
  regenerate(taskId: string, data: RegenerateShotDto) {
    return apiClient.patch<any, ShotData>(`/creation/task/${taskId}/shot`, data);
  },
};
