import request from './request';
import type { ApiResponse } from '@/types/api';
import type { User } from '@/types/user';

/**
 * 用户API
 */
export const userApi = {
  /**
   * 获取用户列表（用于分配工单）
   */
  list: () => {
    return request.get<ApiResponse<User[]>>('/api/v1/users');
  },

  /**
   * 获取当前用户信息
   */
  getProfile: () => {
    return request.get<ApiResponse<User>>('/api/v1/users/profile');
  },

  /**
   * 更新当前用户信息
   */
  updateProfile: (data: Partial<User>) => {
    return request.patch<ApiResponse<User>>('/api/v1/users/profile', data);
  },

  /**
   * 修改密码
   */
  changePassword: (oldPassword: string, newPassword: string) => {
    return request.post<ApiResponse<void>>('/api/v1/users/change-password', {
      oldPassword,
      newPassword,
    });
  },
};
