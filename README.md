# 工单管理系统

一个生产级的企业工单管理系统，支持工单创建、分配、流转、审批、统计等全流程管理。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D5.0-blue.svg)](https://www.typescriptlang.org/)

---

## 📋 项目概述

### 当前状态
- ✅ **阶段1**: 项目规划和设计（已完成）
- ✅ **阶段2**: 项目脚手架和认证模块（已完成）
- 🚧 **阶段3**: 工单管理核心功能（计划中）

### 完成进度
- **代码量**: 101个文件，30390行代码
- **文档数**: 14个设计文档和报告
- **Git提交**: 17次提交
- **完成度**: 约30%

---

## 🚀 快速开始

### 方式1：Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd 工单项目

# 2. 启动所有服务
docker-compose up -d

# 3. 访问应用
# 前端: http://localhost
# 后端: http://localhost:3000
# API文档: http://localhost:3000/api/docs
```

### 方式2：本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库连接等

# 3. 生成Prisma Client
npm run prisma:generate

# 4. 数据库迁移
npm run prisma:migrate

# 5. 初始化数据
npm run prisma:seed

# 6. 启动后端（开发模式）
npm run start:dev

# 7. 启动前端（新终端）
cd frontend
npm install
npm run dev
```

访问：
- 前端：http://localhost:5173
- 后端：http://localhost:3000
- API文档：http://localhost:3000/api/docs

---

## 🧪 测试账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | Password123! | 系统管理员 |
| zhangsan | Password123! | 工单创建者 |
| lisi | Password123! | 处理人员 |
| wangwu | Password123! | 部门主管 |
| zhaoliu | Password123! | 分管领导 |

---

## 🏗️ 技术栈

### 后端
- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 14+
- **认证**: JWT (jsonwebtoken)
- **加密**: BCrypt
- **文档**: Swagger/OpenAPI

### 前端
- **框架**: React 18.x
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **状态管理**: Zustand
- **UI框架**: Ant Design 5.x
- **HTTP客户端**: Axios
- **路由**: React Router 6.x

### DevOps
- **容器**: Docker + Docker Compose
- **代理**: Nginx
- **进程管理**: PM2
- **代码规范**: ESLint + Prettier

---

## 📚 文档

### 设计文档
- [数据库设计文档](docs/数据库设计文档.md) - 数据模型和关系设计
- [系统架构设计文档](docs/系统架构设计文档.md) - 整体架构和技术选型
- [API接口设计文档](docs/API接口设计文档.md) - RESTful API规范
- [前端架构设计文档](docs/前端架构设计文档.md) - 前端技术架构
- [UI设计规范](docs/UI设计规范.md) - UI设计原则和规范
- [页面设计清单](docs/页面设计清单.md) - 所有页面的设计
- [后端开发规范](docs/后端开发规范.md) - 后端代码规范

### 进度报告
- [阶段1总结报告](docs/阶段1总结报告.md) - 设计阶段总结
- [阶段2完成报告](docs/阶段2完成报告.md) - 脚手架和认证模块
- [阶段3工作计划](docs/阶段3工作计划.md) - 工单核心功能计划
- [项目总结报告](docs/项目总结报告.md) - 完整项目总结

### 使用文档
- [快速开始指南](GETTING_STARTED.md) - 快速启动指南
- [后端使用文档](backend-README.md) - 后端开发文档

---

## ✨ 已实现功能

### 用户认证和授权
- ✅ 用户注册（用户名、邮箱唯一性验证）
- ✅ 用户登录（密码验证、状态检查）
- ✅ JWT Token认证（Access + Refresh双Token）
- ✅ Token自动刷新
- ✅ 用户信息查询
- ✅ 登出功能
- ✅ 前端登录/注册界面
- ✅ 路由保护

### 安全机制
- ✅ BCrypt密码加密（10轮）
- ✅ JWT Token签名验证
- ✅ 账号锁定（5次失败锁定15分钟）
- ✅ 失败登录次数记录
- ✅ 最后登录时间和IP记录
- ✅ SQL注入防护（Prisma ORM）
- ✅ XSS防护（输入验证）

---

## 🚧 待实现功能（阶段3）

### 工单管理
- [ ] 工单CRUD操作
- [ ] 工单状态流转
- [ ] 工单分配和转交
- [ ] 工单列表页面（分页、筛选、排序）
- [ ] 工单详情页面
- [ ] 工单表单页面

### 附件管理
- [ ] 文件上传
- [ ] 文件下载
- [ ] 文件删除
- [ ] 文件类型验证

### 评论和通知
- [ ] 添加评论
- [ ] 评论列表
- [ ] 系统通知
- [ ] 通知列表

### 统计报表
- [ ] 概览统计
- [ ] 按状态/优先级统计
- [ ] 趋势分析
- [ ] 仪表盘页面

详见：[阶段3工作计划](docs/阶段3工作计划.md)

---

## 📁 项目结构

```
工单项目/
├── backend/                    # 后端代码
│   └── src/
│       ├── main.ts            # 应用入口
│       ├── app.module.ts      # 根模块
│       ├── modules/           # 业务模块
│       │   └── auth/          # 认证模块
│       └── prisma/            # Prisma配置
├── frontend/                  # 前端代码
│   └── src/
│       ├── main.tsx           # 应用入口
│       ├── App.tsx            # 根组件
│       ├── pages/             # 页面组件
│       │   └── Auth/          # 认证页面
│       ├── components/        # 通用组件
│       ├── api/               # API层
│       ├── store/             # 状态管理
│       ├── types/             # 类型定义
│       └── utils/             # 工具函数
├── database/                  # 数据库脚本
│   ├── schema-postgres.sql    # PostgreSQL建表
│   ├── schema-mysql.sql       # MySQL建表
│   ├── init-data.sql          # 初始化数据
│   └── test-data.sql          # 测试数据
├── docs/                      # 文档
│   ├── 数据库设计文档.md
│   ├── 系统架构设计文档.md
│   ├── API接口设计文档.md
│   └── ...
├── prisma/                    # Prisma配置
│   ├── schema.prisma          # 数据模型
│   └── seed.ts                # 种子数据
├── docker-compose.yml         # Docker Compose配置
├── Dockerfile.frontend        # 前端Dockerfile
├── Dockerfile.backend         # 后端Dockerfile
├── Makefile                   # Make命令
├── start.sh                   # 启动脚本
├── .env.example               # 环境变量示例
├── package.json               # 后端依赖
└── README.md                  # 本文档
```

---

## 🔧 环境要求

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Docker ≥ 20 (可选)
- Docker Compose ≥ 2 (可选)
- npm ≥ 9 或 pnpm ≥ 8

---

## 📊 开发命令

### 后端
```bash
npm run start          # 启动（生产）
npm run start:dev      # 启动（开发）
npm run start:debug    # 启动（调试）
npm run build          # 构建
npm run test           # 单元测试
npm run test:e2e       # E2E测试
npm run test:cov       # 测试覆盖率
npm run lint           # 代码检查
npm run format         # 代码格式化
```

### Prisma
```bash
npm run prisma:generate   # 生成Client
npm run prisma:migrate    # 数据库迁移
npm run prisma:seed       # 初始化数据
npm run prisma:studio     # 打开Studio
npm run prisma:reset      # 重置数据库
```

### 前端
```bash
cd frontend
npm run dev            # 开发服务器
npm run build          # 生产构建
npm run preview        # 预览构建结果
npm run lint           # 代码检查
```

### Docker
```bash
docker-compose up -d      # 启动所有服务
docker-compose down       # 停止所有服务
docker-compose logs -f    # 查看日志
docker-compose ps         # 查看服务状态
```

### Make命令
```bash
make setup             # 初始化项目
make dev               # 开发模式
make build             # 构建
make test              # 测试
make clean             # 清理
```

---

## 🧪 测试

### 后端测试
```bash
# 单元测试
npm run test

# E2E测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```

### 前端测试
```bash
cd frontend
npm run test
```

---

## 🐛 调试

### 后端调试
1. 使用VS Code调试器
2. 在`.vscode/launch.json`中配置
3. 或运行：`npm run start:debug`

### 前端调试
1. 浏览器DevTools
2. React DevTools扩展
3. Redux DevTools（如使用）

---

## 📈 性能

- API响应时间: <500ms
- 前端首屏加载: <2s
- 数据库查询: 已优化索引
- 代码分割: 自动

---

## 🔒 安全

- BCrypt密码加密（10轮）
- JWT Token认证
- 账号锁定保护
- SQL注入防护
- XSS防护
- CORS配置
- Helmet安全头
- 速率限制

---

## 📝 开发规范

- TypeScript严格模式
- ESLint代码检查
- Prettier代码格式化
- Conventional Commits提交规范
- Git Flow工作流
- Code Review流程

---

## 🤝 贡献

欢迎贡献代码！请遵循以下流程：

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 👥 团队

- **Team Lead** - 项目规划和协调
- **Database Architect** - 数据库设计
- **Backend Architect** - 后端架构设计
- **Frontend Architect** - 前端架构设计
- **DevOps Engineer** - DevOps和部署
- **Backend Developer** - 后端开发
- **Frontend Developer** - 前端开发

---

## 📞 联系方式

如有问题或建议，欢迎通过以下方式联系：

- Issue: [GitHub Issues](issues)
- Email: your-email@example.com

---

## 🙏 致谢

感谢所有参与项目的开发者和贡献者！

---

**最后更新**: 2026-09-06  
**版本**: v0.3.0-alpha  
**状态**: 🚧 开发中
