# Backend - NestJS工单管理系统

## 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7.x
- **认证**: JWT + Passport.js

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env.development` 并根据实际情况修改配置。

### 3. 数据库初始化

```bash
# 生成Prisma客户端
npm run prisma:generate

# 执行数据库迁移
npm run prisma:migrate

# (可选) 查看数据库
npm run prisma:studio
```

### 4. 启动开发服务器

```bash
npm run start:dev
```

服务将在 `http://localhost:3000` 启动。

API文档: `http://localhost:3000/api/docs`

## 可用命令

```bash
# 开发
npm run start:dev          # 启动开发服务器(热重载)
npm run start:debug        # 启动调试模式

# 构建
npm run build              # 构建生产版本
npm run start:prod         # 启动生产服务器

# 代码质量
npm run lint               # 代码检查
npm run format             # 代码格式化

# 测试
npm run test               # 运行单元测试
npm run test:watch         # 监听模式运行测试
npm run test:cov           # 生成测试覆盖率
npm run test:e2e           # 运行端到端测试

# Prisma
npm run prisma:generate    # 生成Prisma客户端
npm run prisma:migrate     # 执行数据库迁移
npm run prisma:studio      # 打开Prisma Studio
```

## 项目结构

```
src/
├── common/              # 公共模块
│   ├── constants/       # 常量定义
│   ├── decorators/      # 自定义装饰器
│   ├── dto/            # 通用DTO
│   ├── filters/        # 异常过滤器
│   ├── guards/         # 守卫(认证、权限)
│   ├── interceptors/   # 拦截器
│   ├── pipes/          # 管道(验证)
│   └── utils/          # 工具函数
├── config/             # 配置模块
├── modules/            # 业务模块
│   ├── auth/          # 认证授权
│   ├── user/          # 用户管理
│   ├── ticket/        # 工单管理
│   ├── assignment/    # 工单分配
│   ├── processing/    # 工单处理
│   ├── review/        # 工单审核
│   ├── notification/  # 通知
│   ├── file/          # 文件管理
│   ├── report/        # 统计报表
│   └── log/           # 操作日志
├── prisma/            # Prisma配置
│   ├── schema.prisma  # 数据库Schema
│   └── migrations/    # 数据库迁移
├── app.module.ts      # 根模块
└── main.ts            # 应用入口
```

## 开发规范

详见: `docs/后端开发规范.md`

核心要点:
- 使用TypeScript严格模式
- 遵循NestJS最佳实践
- 所有API必须有Swagger文档
- 测试覆盖率≥80%
- 提交前运行lint和格式化

## 环境要求

- Node.js >= 20.x
- PostgreSQL >= 15
- Redis >= 7
- npm >= 10 或 pnpm >= 8
