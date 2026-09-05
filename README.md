# 学校工单管理系统

一个基于 NestJS + React + TypeScript + PostgreSQL 的工单管理系统，适用于学校、企业等场景的工单提交、分配、处理和跟踪。

## 📋 项目概述

本项目是一个全栈工单管理系统，提供完整的工单生命周期管理功能，包括工单创建、分配、处理、评论、附件管理、通知等核心功能。

**技术栈**: NestJS + React + TypeScript + PostgreSQL + Prisma  
**项目状态**: 开发中 (已完成15%)  
**开始日期**: 2026-09-06

## ✨ 核心功能

### 已规划功能

- ✅ **用户管理**: 注册、登录、个人信息管理
- 🔄 **工单管理**: 创建、查询、更新、删除工单
- 🔄 **工单流转**: 工单状态流转、分配、处理
- 🔄 **评论系统**: 工单评论、编辑历史追踪
- 🔄 **附件管理**: 上传、下载、删除附件
- ⏳ **通知系统**: 应用内通知、邮件通知
- ⏳ **统计报表**: 工单统计、图表展示
- ⏳ **权限管理**: 角色管理、权限分配

### 功能特色

- 🎯 **友好的工单编号**: 自增整数编号（#1, #2, #3...），便于口头交流
- 📝 **评论编辑历史**: 追踪评论的修改历史
- 🔒 **权限控制**: 基于 `resource:action` 格式的细粒度权限
- 📦 **数据快照**: 使用JSON存储创建者信息，避免外键约束问题
- 🔔 **多渠道通知**: 应用内 + 邮件 + Webhook
- 📊 **实时统计**: 工单数量、状态分布、处理时长等

## 🏗️ 项目结构

```
工单项目/
├── backend/              # 后端代码 (NestJS + Prisma)
│   ├── src/
│   │   ├── auth/        # 认证模块
│   │   ├── tickets/     # 工单模块
│   │   ├── users/       # 用户模块
│   │   ├── logs/        # 评论模块
│   │   └── attachments/ # 附件模块
│   ├── prisma/          # Prisma schema和迁移
│   ├── test/            # 测试文件
│   └── package.json
├── frontend/            # 前端代码 (React + TypeScript)
│   ├── src/
│   │   ├── pages/       # 页面组件
│   │   ├── components/  # 通用组件
│   │   ├── services/    # API服务
│   │   └── utils/       # 工具函数
│   └── package.json
├── docs/                # 项目文档
│   ├── 需求分析.md
│   ├── 技术选型.md
│   ├── 数据库设计.md
│   ├── API设计.md
│   ├── 前端设计.md
│   ├── 部署方案.md
│   ├── 测试计划.md
│   ├── 开发规范.md
│   ├── Peppermint项目学习报告.md
│   └── 项目状态.md
├── database/            # 数据库脚本
│   ├── schema.sql       # 表结构
│   ├── seed.sql         # 测试数据
│   └── init.sql         # 初始化脚本
└── README.md
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0
- PostgreSQL >= 14.0
- pnpm >= 8.0 (推荐) 或 npm >= 9.0

### 安装步骤

```bash
# 1. 克隆项目
cd ~/projects/工单项目

# 2. 安装后端依赖
cd backend
pnpm install

# 3. 配置数据库
cp .env.example .env
# 编辑 .env 文件，配置数据库连接

# 4. 运行数据库迁移
pnpm prisma migrate dev

# 5. 启动后端
pnpm start:dev

# 6. 安装前端依赖
cd ../frontend
pnpm install

# 7. 启动前端
pnpm dev
```

### 访问应用

- **前端**: http://localhost:3000
- **后端API**: http://localhost:3001
- **API文档**: http://localhost:3001/api/docs

## 📚 文档

### 核心文档

- [需求分析](./docs/需求分析.md) - 功能需求和非功能需求
- [技术选型](./docs/技术选型.md) - 技术栈选择理由
- [数据库设计](./docs/数据库设计.md) - 数据表结构设计
- [API设计](./docs/API设计.md) - RESTful API规范
- [前端设计](./docs/前端设计.md) - 页面结构和组件设计
- [部署方案](./docs/部署方案.md) - Docker部署配置
- [测试计划](./docs/测试计划.md) - 测试策略和用例
- [开发规范](./docs/开发规范.md) - 代码规范和Git工作流

### 研究报告

- [Peppermint项目学习报告](./docs/Peppermint项目学习报告.md) - 参考项目研究
- [项目状态](./docs/项目状态.md) - 进度跟踪和决策记录

## 🔧 开发

### 后端开发

```bash
cd backend

# 开发模式
pnpm start:dev

# 生产构建
pnpm build

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:cov

# 代码格式化
pnpm format

# 代码检查
pnpm lint
```

### 前端开发

```bash
cd frontend

# 开发模式
pnpm dev

# 生产构建
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

### 数据库操作

```bash
cd backend

# 创建迁移
pnpm prisma migrate dev --name <migration-name>

# 运行迁移
pnpm prisma migrate deploy

# 重置数据库
pnpm prisma migrate reset

# 打开Prisma Studio
pnpm prisma studio

# 生成Prisma Client
pnpm prisma generate
```

## 🧪 测试

### 测试策略

- **单元测试**: 覆盖率目标 ≥80%
- **集成测试**: API端到端测试
- **E2E测试**: 关键用户流程测试

### 运行测试

```bash
# 后端测试
cd backend
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
pnpm test:cov          # 生成覆盖率报告

# 前端测试
cd frontend
pnpm test              # 运行所有测试
pnpm test:watch        # 监听模式
pnpm test:coverage     # 生成覆盖率报告
```

## 📦 部署

### Docker部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动部署

详见 [部署方案](./docs/部署方案.md)

## 📈 开发进度

| 阶段 | 状态 | 完成度 |
|------|------|--------|
| 阶段1: 项目初始化 | ✅ 完成 | 100% |
| 阶段2: 参考项目研究 | ✅ 完成 | 100% |
| 阶段3: 后端核心功能 | 🔄 准备中 | 0% |
| 阶段4: 前端开发 | ⏳ 未开始 | 0% |
| 阶段5: 通知系统 | ⏳ 未开始 | 0% |
| 阶段6: 统计报表 | ⏳ 未开始 | 0% |
| 阶段7: 权限管理 | ⏳ 未开始 | 0% |
| 阶段8: 部署与文档 | ⏳ 未开始 | 0% |

**总体进度**: 15% (2/8阶段完成)

详细进度请查看 [项目状态](./docs/项目状态.md)

## 🤝 贡献

本项目为学校课程项目，暂不接受外部贡献。

## 📝 开发规范

- **代码规范**: 遵循 ESLint + Prettier
- **提交规范**: 使用 Conventional Commits
- **分支策略**: Git Flow
- **测试要求**: 单元测试覆盖率 ≥80%

详见 [开发规范](./docs/开发规范.md)

## 📄 许可证

本项目仅用于学习和教学目的。

## 📞 联系方式

如有问题或建议，请联系项目维护者。

---

**最后更新**: 2026-09-06  
**项目状态**: 活跃开发中
