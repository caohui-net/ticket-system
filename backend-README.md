# 工单管理系统 - 后端服务

## 项目简介

工单管理系统后端服务，基于 NestJS + Prisma + PostgreSQL 构建。

## 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 15+
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI 3.0

## 项目结构

```
src/
├── main.ts                     # 应用入口
├── app.module.ts               # 根模块
├── prisma/                     # Prisma配置
│   ├── prisma.module.ts
│   ├── prisma.service.ts
│   └── schema.prisma           # 数据模型
└── modules/                    # 业务模块
    └── auth/                   # 认证模块
        ├── auth.module.ts
        ├── auth.controller.ts
        ├── auth.service.ts
        ├── auth.service.spec.ts
        ├── dto/                # 数据传输对象
        ├── guards/             # 守卫
        ├── strategies/         # Passport策略
        ├── decorators/         # 装饰器
        └── interfaces/         # 接口定义
```

## 快速开始

### 1. 环境要求

- Node.js >= 18.x
- PostgreSQL >= 15.x
- npm >= 9.x

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

**重要配置项**:

```env
# 数据库连接
DATABASE_URL="postgresql://用户名:密码@localhost:5432/ticket_system?schema=public"

# JWT密钥（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
```

### 4. 初始化数据库

```bash
# 生成Prisma Client
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate

# 或者直接执行SQL脚本
psql -U postgres -d ticket_system -f database/schema-postgres.sql
psql -U postgres -d ticket_system -f database/init-data.sql
```

### 5. 启动开发服务器

```bash
npm run start:dev
```

服务将在 `http://localhost:3000` 启动。

### 6. 访问API文档

打开浏览器访问：`http://localhost:3000/api/docs`

## 已实现功能

### ✅ 阶段2：用户认证与权限模块

#### 1. 数据库实体类（Entity）
- ✅ User（用户实体）- 通过 Prisma Schema 定义
- ✅ Role（角色实体）- 通过 Prisma Schema 定义
- ✅ UserRole（用户角色关联）- 通过 Prisma Schema 定义

#### 2. 数据访问层
- ✅ Prisma Service（全局数据库服务）
- ✅ 自动生成的 Repository 方法

#### 3. Service层

**AuthService**:
- ✅ `register()` - 用户注册（密码BCrypt加密）
- ✅ `login()` - 用户登录验证
  - ✅ 账号状态检查
  - ✅ 账号锁定机制（5次失败锁定15分钟）
  - ✅ 密码验证
  - ✅ 失败次数记录
- ✅ `refreshToken()` - Token刷新
- ✅ `getMe()` - 获取当前用户信息

#### 4. Controller层

**AuthController**:
- ✅ `POST /api/v1/auth/register` - 用户注册
- ✅ `POST /api/v1/auth/login` - 用户登录
- ✅ `POST /api/v1/auth/logout` - 用户登出
- ✅ `POST /api/v1/auth/refresh` - 刷新Token
- ✅ `GET /api/v1/auth/me` - 获取当前用户信息

#### 5. Security配置

- ✅ JwtStrategy - JWT认证策略
- ✅ JwtAuthGuard - JWT守卫
- ✅ BCrypt密码加密（10轮）
- ✅ Token机制
  - Access Token: 15分钟有效期
  - Refresh Token: 7天有效期

#### 6. 单元测试

- ✅ `auth.service.spec.ts` - AuthService单元测试
  - ✅ 用户注册测试（成功/用户名冲突/邮箱冲突）
  - ✅ 用户登录测试（成功/用户不存在/账号禁用/账号锁定/密码错误/多次失败锁定）
  - ✅ Token刷新测试（成功/Token无效）
  - ✅ 获取用户信息测试（成功/用户不存在）

**测试覆盖率目标**: ≥80%

## API使用示例

### 1. 用户注册

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "Password123!",
    "realName": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "department": "技术部"
  }'
```

### 2. 用户登录

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "password": "Password123!"
  }'
```

**响应示例**:
```json
{
  "user": {
    "id": "1",
    "username": "zhangsan",
    "realName": "张三",
    "email": "zhangsan@example.com",
    "role": "handler",
    "department": "技术部"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### 3. 获取当前用户信息

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

### 4. 刷新Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

## 开发命令

```bash
# 开发模式
npm run start:dev

# 调试模式
npm run start:debug

# 生产模式构建
npm run build
npm run start:prod

# 代码格式化
npm run format

# 代码检查
npm run lint
npm run lint:fix

# 运行测试
npm run test

# 测试覆盖率
npm run test:cov

# 监听模式测试
npm run test:watch

# Prisma操作
npm run prisma:generate    # 生成客户端
npm run prisma:migrate     # 数据库迁移
npm run prisma:studio      # 可视化管理
```

## 测试验证

### 运行单元测试

```bash
npm run test
```

### 查看测试覆盖率

```bash
npm run test:cov
```

### 集成测试（待实现）

```bash
npm run test:e2e
```

## 安全特性

1. **密码加密**: 使用 BCrypt（10轮）加密存储
2. **JWT认证**: 双Token机制（Access + Refresh）
3. **账号锁定**: 5次登录失败锁定15分钟
4. **Token过期**: 
   - Access Token: 15分钟
   - Refresh Token: 7天
5. **输入验证**: 使用 class-validator 进行参数验证
6. **SQL注入防护**: Prisma ORM 自动防护

## 后续开发计划

### 阶段3：工单管理模块
- [ ] 工单CRUD操作
- [ ] 工单状态流转
- [ ] 工单分配机制
- [ ] 工单审核功能

### 阶段4：通知模块
- [ ] 系统通知
- [ ] 邮件通知
- [ ] WebSocket实时推送

### 阶段5：统计报表
- [ ] 工单统计
- [ ] 性能指标
- [ ] 数据导出

## 故障排查

### 数据库连接失败

检查 `.env` 中的 `DATABASE_URL` 配置是否正确。

```bash
# 测试数据库连接
psql -U postgres -d ticket_system -c "SELECT 1;"
```

### Prisma Client未生成

```bash
npm run prisma:generate
```

### 端口被占用

修改 `.env` 中的 `PORT` 配置。

## 参考文档

- [NestJS官方文档](https://docs.nestjs.com/)
- [Prisma文档](https://www.prisma.io/docs/)
- [API接口设计文档](./docs/API接口设计文档.md)
- [数据库设计文档](./docs/数据库设计文档.md)
- [后端开发规范](./docs/后端开发规范.md)

## 许可证

UNLICENSED - 仅供内部使用
