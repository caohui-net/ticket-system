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
│   ├── permissions/   # 权限管理 ⭐ NEW
│   ├── tickets/       # 工单管理
│   ├── logs/          # 工单日志(评论)
│   ├── attachments/   # 附件管理
│   ├── statistics/    # 统计报表
│   └── notification/  # 通知系统
├── prisma/            # Prisma配置
│   ├── schema.prisma  # 数据库Schema
│   └── migrations/    # 数据库迁移
├── app.module.ts      # 根模块
└── main.ts            # 应用入口
```

## 权限管理系统 ⭐

本系统采用基于RBAC的细粒度权限控制，权限格式为 `resource:action`。

### 快速开始

```bash
# 1. 初始化权限数据
npx ts-node src/modules/permissions/seeds/permissions.seed.ts

# 2. 验证权限系统
npm test -- permissions.service.spec.ts

# 3. 查看API文档
# 启动服务后访问: http://localhost:3000/api/docs
```

### 使用示例

```typescript
import { Controller, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';

@Controller('tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TicketsController {
  @Post()
  @RequirePermissions('ticket:create')
  create() {
    // 只有拥有 ticket:create 权限的用户才能访问
  }
}
```

### 预置权限

- **工单**: `ticket:create/read/update/delete/assign/close`
- **评论**: `comment:create/read/update/delete`
- **用户**: `user:manage/read`
- **角色**: `role:manage/read`
- **统计**: `statistics:view`
- **超级权限**: `*:*` (所有权限)

### 角色配置

| 角色 | 说明 | 权限数 |
|-----|------|-------|
| ADMIN | 系统管理员 | 所有权限 |
| CREATOR | 工单创建者 | 7个 |
| HANDLER | 处理人员 | 10个 |
| REPORTER | 报表查看者 | 3个 |
| REVIEWER | 部门主管 | 9个 |
| APPROVER | 分管领导 | 7个 |

### 详细文档

- 📘 完整文档: `docs/权限管理模块文档.md`
- 📗 集成指南: `src/modules/permissions/README.md`
- 📝 快速参考: `docs/权限管理快速参考.md`
- ✅ 集成检查: `docs/权限管理集成检查清单.md`

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
