import apiClient from '../utils/api';
import { io, Socket } from 'socket.io-client';

export interface CreationTask {
  id: string;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  storyboard?: Record<string, any>[];
  progress: number;
  result?: any;
  errorMessage?: string;
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  scriptId?: string;
  storyboard?: Record<string, any>[];
  aspectRatio?: '9:16' | '16:9' | '1:1' | '4:3' | '3:4' | '21:9';
  /** 720p / 1080p / 480p */
  quality?: string;
  modelKey?: string;
}

export interface ProgressEvent {
  progress: number;
  status: string;
  message?: string;
}

export interface ShotProgressEvent {
  shotId: string;
  progress: number;
  status: string;
  message?: string;
}

export interface CompleteEvent {
  progress: number;
  status: string;
  result?: any;
}

export interface ErrorEvent {
  message: string;
}

export interface CreationSocketHandlers {
  onProgress?: (data: ProgressEvent) => void;
  onShotProgress?: (data: ShotProgressEvent) => void;
  onComplete?: (data: CompleteEvent) => void;
  onError?: (data: ErrorEvent) => void;
  onConnectError?: (err: Error) => void;
}

function resolveSocketUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) return explicit;
  // 与 API 同源
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) return apiBase;
  // 本地开发
  return `http://${window.location.hostname}:3001`;
}

export const creationApi = {
  createTask(data: CreateTaskDto) {
    return apiClient.post<any, CreationTask>('/creation/task', data);
  },

  getList() {
    return apiClient.get<any, CreationTask[]>('/creation/task');
  },

  getById(id: string) {
    return apiClient.get<any, CreationTask>(`/creation/task/${id}`);
  },

  /**
   * 订阅指定任务的实时进度
   * 返回断开连接的清理函数
   */
  subscribe(taskId: string, handlers: CreationSocketHandlers): () => void {
    const baseUrl = resolveSocketUrl();
    const socket: Socket = io(`${baseUrl}/creation`, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      socket.emit('subscribe', taskId);
    });

    socket.on('connect_error', (err) => {
      handlers.onConnectError?.(err as any);
    });

    if (handlers.onProgress) {
      socket.on('progress', handlers.onProgress);
    }
    if (handlers.onShotProgress) {
      socket.on('shot-progress', handlers.onShotProgress);
    }
    if (handlers.onComplete) {
      socket.on('complete', handlers.onComplete);
    }
    if (handlers.onError) {
      socket.on('error', handlers.onError);
    }

    return () => {
      socket.disconnect();
    };
  },
};
