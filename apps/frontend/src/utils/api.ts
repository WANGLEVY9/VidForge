/// <reference types="vite/client" />

import axios from 'axios';
import { logger } from '../services/logger';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    (config as any)._startTime = Date.now();
    logger.debug('API', `${config.method?.toUpperCase()} ${config.url}`, { params: config.params });
    const token = localStorage.getItem('vidforge_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    logger.error('API', 'Request error', { message: error.message });
    return Promise.reject(error);
  },
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - ((response.config as any)._startTime || 0);
    logger.info('API', `${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, { duration: `${duration}ms` });
    return response.data;
  },
  (error) => {
    const duration = Date.now() - ((error.config?._startTime || 0));
    logger.error('API', `${error.response?.status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      duration: `${duration}ms`,
      message: error.message,
    });
    return Promise.reject(error);
  },
);

export default apiClient;
