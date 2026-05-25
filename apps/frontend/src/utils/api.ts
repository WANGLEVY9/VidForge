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

// 请求拦截器：自动加 Bearer token
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

// 响应拦截器：401 自动跳登录
apiClient.interceptors.response.use(
  (response) => {
    const duration = Date.now() - ((response.config as any)._startTime || 0);
    logger.info('API', `${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, { duration: `${duration}ms` });
    return response.data;
  },
  (error) => {
    const duration = Date.now() - ((error.config?._startTime || 0));
    const status = error.response?.status;
    logger.error('API', `${status || 'NETWORK'} ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
      duration: `${duration}ms`,
      message: error.message,
    });

    // 401 → 清除本地登录状态，跳登录页
    // 但当请求本身就是登录/注册接口时不要跳，避免登录失败时强制跳转
    if (status === 401) {
      const url = error.config?.url || '';
      const isAuthCall = /\/auth\/(login|register)/.test(url);
      if (!isAuthCall && typeof window !== 'undefined') {
        localStorage.removeItem('vidforge_token');
        localStorage.removeItem('vidforge_user');
        const cur = window.location.pathname + window.location.search;
        // 避免循环跳
        if (!cur.startsWith('/auth/')) {
          const redirect = encodeURIComponent(cur);
          window.location.href = `/auth/login?redirect=${redirect}`;
        }
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
