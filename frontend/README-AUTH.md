# 前端认证功能实现说明

## 已完成功能

### 1. 类型定义 (src/types/)
- ✅ `user.ts` - 用户相关类型（User, UserRole, LoginCredentials, RegisterData, AuthResponse）
- ✅ `api.ts` - API通用类型（ApiResponse, ApiError, PaginationResponse）

### 2. 工具函数 (src/utils/)
- ✅ `token.ts` - Token管理工具
  - saveToken() - 保存访问令牌
  - getToken() - 获取访问令牌
  - saveRefreshToken() - 保存刷新令牌
  - getRefreshToken() - 获取刷新令牌
  - saveTokenExpiry() - 保存过期时间
  - isTokenExpired() - 检查是否过期
  - clearTokens() - 清除所有令牌
  - saveAuthTokens() - 保存完整认证信息

### 3. API服务 (src/api/)
- ✅ `request.ts` - Axios实例配置
  - 请求拦截器：自动添加Authorization头
  - 响应拦截器：统一处理错误（401自动跳转登录）
- ✅ `auth.ts` - 认证API封装
  - login() - 用户登录
  - register() - 用户注册
  - logout() - 用户登出
  - refreshToken() - 刷新Token
  - getCurrentUser() - 获取当前用户信息

### 4. 状态管理 (src/store/)
- ✅ `auth.ts` - 认证状态管理（Zustand）
  - 状态：user, token, isAuthenticated, isLoading
  - 方法：login(), register(), logout(), updateUser(), checkAuth()
  - 持久化：使用localStorage持久化用户信息

### 5. 页面组件 (src/pages/Auth/)
- ✅ `Login.tsx` - 登录页面
  - 用户名/密码表单
  - 表单验证（必填、最小长度）
  - "记住我"功能
  - 错误提示
  - 跳转到注册页链接
  
- ✅ `Register.tsx` - 注册页面
  - 完整注册表单（用户名、真实姓名、邮箱、手机号、密码、确认密码）
  - 密码强度实时检测（弱/中/强）
  - 表单验证（格式校验、密码一致性）
  - 用户协议勾选
  - 跳转到登录页链接

### 6. 路由配置 (src/router/)
- ✅ `index.tsx` - 路由配置
  - 公开路由：/login, /register
  - 受保护路由：/tickets (需要认证)
  - 错误页面：/403, /404

### 7. 路由守卫 (src/components/)
- ✅ `ProtectedRoute.tsx` - 权限路由组件
  - 未登录自动跳转登录页
  - 支持角色权限检查
  - 保存来源页面，登录后返回

### 8. 样式 (src/pages/Auth/)
- ✅ `Auth.css` - 认证页面样式
  - 居中布局，渐变背景
  - 卡片式表单设计
  - 响应式适配（移动端友好）

## 技术栈

- **React 18.3** - UI框架
- **TypeScript 5.3** - 类型安全
- **Zustand 4.4** - 状态管理
- **React Router 6.21** - 路由管理
- **Ant Design 5.12** - UI组件库
- **Axios 1.6** - HTTP客户端
- **React Hook Form 7.49** - 表单管理（待集成）
- **Zod 3.22** - 数据校验（待集成）

## 项目结构

```
frontend/
├── src/
│   ├── api/              # API接口
│   │   ├── request.ts   # Axios封装
│   │   └── auth.ts      # 认证接口
│   ├── store/           # 状态管理
│   │   └── auth.ts      # 认证Store
│   ├── types/           # TypeScript类型
│   │   ├── user.ts      # 用户类型
│   │   ├── api.ts       # API类型
│   │   └── index.ts     # 统一导出
│   ├── utils/           # 工具函数
│   │   └── token.ts     # Token管理
│   ├── pages/           # 页面组件
│   │   └── Auth/        # 认证页面
│   │       ├── Login.tsx
│   │       ├── Register.tsx
│   │       ├── Auth.css
│   │       └── index.ts
│   ├── components/      # 通用组件
│   │   └── ProtectedRoute.tsx
│   └── router/          # 路由配置
│       └── index.tsx
```

## 使用说明

### 启动开发服务器

```bash
npm install
npm run dev
```

访问：http://localhost:5173

### 登录流程

1. 访问 `/login` 页面
2. 输入用户名和密码
3. 点击"登录"按钮
4. 成功后跳转到工单列表页 (`/tickets`)
5. Token自动保存到localStorage
6. 后续请求自动携带Token

### 注册流程

1. 访问 `/register` 页面
2. 填写注册信息
   - 用户名：4-20位，字母数字下划线
   - 真实姓名：2-20位
   - 邮箱：有效邮箱格式
   - 密码：6-20位，包含字母和数字
   - 确认密码：与密码一致
3. 实时显示密码强度
4. 勾选用户协议
5. 点击"注册"按钮
6. 成功后自动登录并跳转

### 路由守卫

受保护的路由会自动检查登录状态：

```tsx
<ProtectedRoute>
  <TicketList />
</ProtectedRoute>
```

带角色权限检查：

```tsx
<ProtectedRoute requiredRole={[UserRole.ADMIN, UserRole.REVIEWER]}>
  <Dashboard />
</ProtectedRoute>
```

### Token管理

Token过期处理：
- 响应拦截器自动检测401错误
- 清除本地Token
- 跳转到登录页
- 保存来源页面，登录后自动返回

## API对接

后端API基础URL配置在 `.env.development`:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

所需后端接口：

1. `POST /api/auth/login` - 登录
2. `POST /api/auth/register` - 注册
3. `POST /api/auth/logout` - 登出
4. `POST /api/auth/refresh` - 刷新Token
5. `GET /api/auth/me` - 获取当前用户信息

响应格式参考 `docs/API接口设计文档.md`

## 测试

### 手动测试清单

- [ ] 登录页面显示正常
- [ ] 注册页面显示正常
- [ ] 登录表单验证正常
- [ ] 注册表单验证正常
- [ ] 密码强度显示正常
- [ ] 未登录访问受保护路由自动跳转登录页
- [ ] 登录成功后跳转到来源页面
- [ ] Token过期自动跳转登录页
- [ ] 登出功能正常
- [ ] 响应式布局在移动端正常显示

## 下一步计划

1. 添加"忘记密码"功能
2. 集成React Hook Form优化表单性能
3. 添加单元测试（Login.test.tsx, Register.test.tsx）
4. 添加E2E测试（Playwright）
5. 优化错误提示信息
6. 添加加载状态优化用户体验

## 相关文档

- [前端架构设计文档](../../docs/前端架构设计文档.md)
- [页面设计清单](../../docs/页面设计清单.md)
- [API接口设计文档](../../docs/API接口设计文档.md)
- [UI设计规范](../../docs/UI设计规范.md)
