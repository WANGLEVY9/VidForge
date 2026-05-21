import { VideoAspectRatio, VideoResolution } from '@vidforge/common';
import { Script } from './script';

export enum VideoTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  GENERATING_SCRIPT = 'generating_script',
  GENERATING_ASSETS = 'generating_assets',
  RENDERING = 'rendering',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ExportFormat {
  MP4 = 'mp4',
  MOV = 'mov',
  AVI = 'avi',
  WEBM = 'webm',
}

export const ExportFormatText = {
  [ExportFormat.MP4]: 'MP4',
  [ExportFormat.MOV]: 'MOV',
  [ExportFormat.AVI]: 'AVI',
  [ExportFormat.WEBM]: 'WebM',
};

export const VideoTaskStatusText = {
  [VideoTaskStatus.PENDING]: '等待中',
  [VideoTaskStatus.PROCESSING]: '处理中',
  [VideoTaskStatus.GENERATING_SCRIPT]: '生成剧本中',
  [VideoTaskStatus.GENERATING_ASSETS]: '生成素材中',
  [VideoTaskStatus.RENDERING]: '渲染中',
  [VideoTaskStatus.SUCCESS]: '已完成',
  [VideoTaskStatus.FAILED]: '失败',
  [VideoTaskStatus.CANCELLED]: '已取消',
};

export const VideoTaskStatusColor = {
  [VideoTaskStatus.PENDING]: 'default',
  [VideoTaskStatus.PROCESSING]: 'processing',
  [VideoTaskStatus.GENERATING_SCRIPT]: 'processing',
  [VideoTaskStatus.GENERATING_ASSETS]: 'processing',
  [VideoTaskStatus.RENDERING]: 'processing',
  [VideoTaskStatus.SUCCESS]: 'success',
  [VideoTaskStatus.FAILED]: 'error',
  [VideoTaskStatus.CANCELLED]: 'warning',
};

export const VideoResolutionText = {
  [VideoResolution.RESOLUTION_720P]: '720P',
  [VideoResolution.RESOLUTION_1080P]: '1080P',
  [VideoResolution.RESOLUTION_2K]: '2K',
  [VideoResolution.RESOLUTION_4K]: '4K',
};

export const VideoAspectRatioText = {
  [VideoAspectRatio.RATIO_9_16]: '9:16 竖版',
  [VideoAspectRatio.RATIO_16_9]: '16:9 横版',
  [VideoAspectRatio.RATIO_1_1]: '1:1 正方形',
};

export interface VideoTask {
  id: string;
  name: string;
  scriptId: string;
  script?: Script;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  exportFormat: ExportFormat;
  status: VideoTaskStatus;
  progress: number;
  errorMessage?: string;
  videoUrl?: string;
  videoSize?: number;
  duration?: number;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoTaskParams {
  name: string;
  scriptId: string;
  resolution?: VideoResolution;
  aspectRatio?: VideoAspectRatio;
  exportFormat?: ExportFormat;
}

export interface TaskProgress {
  status: VideoTaskStatus;
  progress: number;
  videoUrl?: string;
  errorMessage?: string;
}
