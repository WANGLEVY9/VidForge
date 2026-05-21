import request from '@/utils/request';
import { VideoTask, CreateVideoTaskParams, TaskProgress } from '@/types/creation';
import { VideoTaskStatus } from '@/types/creation';
import { VideoAspectRatio, VideoResolution } from '@vidforge/common';

export interface VideoTaskListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: VideoTaskStatus;
}

export interface VideoTaskListResult {
  list: VideoTask[];
  total: number;
  page: number;
  pageSize: number;
}

// 创建视频生成任务
export function createVideoTask(params: CreateVideoTaskParams): Promise<VideoTask> {
  return request.post('/creation/task', params);
}

// 获取任务列表
export function getVideoTaskList(params: VideoTaskListQuery): Promise<VideoTaskListResult> {
  return request.get('/creation/task', { params });
}

// 获取任务详情
export function getVideoTaskDetail(id: string): Promise<VideoTask> {
  return request.get(`/creation/task/${id}`);
}

// 获取任务进度
export function getTaskProgress(id: string): Promise<TaskProgress> {
  return request.get(`/creation/task/${id}/progress`);
}

// 删除任务
export function deleteVideoTask(id: string): Promise<{ success: boolean }> {
  return request.delete(`/creation/task/${id}`);
}

// 重试失败的任务
export function retryVideoTask(id: string): Promise<VideoTask> {
  return request.post(`/creation/task/${id}/retry`);
}
