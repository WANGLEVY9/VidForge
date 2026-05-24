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
  aspectRatio?: string;
  quality?: string;
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

  connectWebSocket(taskId: string, onProgress: (data: any) => void) {
    const socketUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:3001`;
    const socket: Socket = io(`${socketUrl}/creation`, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('subscribe', taskId);
    });

    socket.on('progress', (data) => {
      onProgress(data);
    });

    socket.on('complete', (data) => {
      onProgress(data);
    });

    socket.on('error', (data) => {
      onProgress({ ...data, status: 'failed' });
    });

    return () => {
      socket.disconnect();
    };
  },
};
