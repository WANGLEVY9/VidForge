import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可在这里添加token等请求头
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code !== 0) {
      message.error(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    return res.data;
  },
  (error) => {
    const errorMsg = error.response?.data?.message || error.message || '网络错误';
    // 401未授权的情况可以在这里处理跳转到登录页
    if (error.response?.status === 401) {
      message.error('登录已过期，请重新登录');
      // 清除token
      localStorage.removeItem('token');
      // 可以跳转到登录页
    } else {
      message.error(errorMsg);
    }
    return Promise.reject(error);
  }
);

export default request;
