import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { getToken, clearTokens } from '@/utils/token';
import type { ApiError } from '@/types';

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  (response) => {
    const { data } = response;

    // 如果返回的数据已经是标准格式，直接返回data部分
    if (data.success === true) {
      return data.data;
    }

    // 如果success为false，抛出错误
    if (data.success === false) {
      const errorMessage = data.error?.message || data.message || '请求失败';
      message.error(errorMessage);
      return Promise.reject(new Error(errorMessage));
    }

    // 兼容其他格式
    return data;
  },
  (error: AxiosError<ApiError>) => {
    if (error.response) {
      const { status } = error.response;

      switch (status) {
        case 401:
          message.error('未登录或登录已过期，请重新登录');
          clearTokens();
          window.location.href = '/login';
          break;
        case 403:
          message.error('没有权限访问');
          break;
        case 404:
          message.error('请求的资源不存在');
          break;
        case 500:
          message.error('服务器错误，请稍后重试');
          break;
        case 429:
          message.error('请求过于频繁，请稍后再试');
          break;
        default:
          message.error(error.response.data?.error?.message || '请求失败');
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接');
    } else {
      message.error('请求配置错误');
    }

    return Promise.reject(error);
  }
);

export default instance;
