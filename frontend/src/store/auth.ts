import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials, RegisterData, AuthResponse } from '@/types';
import * as authApi from '@/api/auth';
import { saveAuthTokens, clearTokens, getToken } from '@/utils/token';

interface AuthState {
  // 状态
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 操作方法
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // 登录
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response: AuthResponse = await authApi.login(credentials);
          const { user, tokens } = response;

          // 保存tokens到localStorage
          saveAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

          // 更新状态
          set({
            user,
            token: tokens.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // 注册
      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const response: AuthResponse = await authApi.register(data);
          const { user, tokens } = response;

          // 保存tokens到localStorage
          saveAuthTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);

          // 更新状态
          set({
            user,
            token: tokens.accessToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          clearTokens();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      // 更新用户信息
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      // 检查认证状态
      checkAuth: () => {
        const token = getToken();
        if (token) {
          set({ token, isAuthenticated: true });
        } else {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
