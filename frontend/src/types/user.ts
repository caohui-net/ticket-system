// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  REVIEWER = 'reviewer',
  HANDLER = 'handler',
  CREATOR = 'creator',
}

// 用户信息接口
export interface User {
  id: string;
  username: string;
  realName: string;
  email: string;
  phone?: string;
  role: UserRole;
  department?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// 登录凭据
export interface LoginCredentials {
  username: string;
  password: string;
}

// 注册数据
export interface RegisterData {
  username: string;
  realName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

// 认证响应
export interface AuthResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

// 登录请求（API兼容）
export interface LoginRequest {
  username: string;
  password: string;
}

// 注册请求（API兼容）
export interface RegisterRequest {
  username: string;
  password: string;
  realName: string;
  email: string;
  phone?: string;
  department?: string;
}
