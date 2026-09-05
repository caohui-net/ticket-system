import request from './request';
import type { LoginCredentials, RegisterData, AuthResponse, User } from '@/types';

/**
 * 用户登录
 */
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  return request.post('/auth/login', credentials);
};

/**
 * 用户注册
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  return request.post('/auth/register', data);
};

/**
 * 用户登出
 */
export const logout = async (): Promise<void> => {
  return request.post('/auth/logout');
};

/**
 * 刷新Token
 */
export const refreshToken = async (refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> => {
  return request.post('/auth/refresh', { refreshToken });
};

/**
 * 获取当前用户信息
 */
export const getCurrentUser = async (): Promise<User> => {
  return request.get('/auth/me');
};
