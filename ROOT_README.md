# 工单管理系统

一个基于NestJS + React的企业级工单管理系统。

## 项目简介

本系统用于企业内部工单的创建、分配、处理、审核和关闭全流程管理，支持角色权限控制、实时通知、统计报表等功能。

## 技术栈

### 后端
- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: PostgreSQL 15+
- **缓存**: Redis 7.x
- **认证**: JWT + Passport.js

### 前端
- **框架**: React 18
- **语言**: TypeScript 5.x
- **构建工具**: Vite 5.x
- **UI库**: Ant Design 5.x
- **状态管理**: Zustand 4.x
- **路由**: React Router 6.x

## 快速开始

### 前置要求

- Node.js >= 20.x
- PostgreSQL >= 15
- Redis >= 7
- Docker & Docker Compose (可选)

### 方式一: Docker Compose (推荐)

1. **启动数据库服务**

```bash
docker-compose up -d postgres redis
```

2. **初始化后端**

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

3. **启动后端服务**

```bash
npm run start:dev
```

后端将在 `http://localhost:3000` 启动

4. **启动前端服务**

```bash
cd ../frontend
npm install
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 方式二: 手动安装

#### 1. 安装PostgreSQL和Redis

请参考官方文档安装PostgreSQL 15+和Redis 7+。

#### 2. 配置数据库

创建数据库:
```sql
CREATE DATABASE ticket_dev;
CREATE USER ticket_user WITH PASSWORD 'ticket_pass';
GRANT ALL PRIVILEGES ON DATABASE ticket_dev TO ticket_user;
```

#### 3. 配置环境变量

后端配置 `backend/.env.development`:
```env
DATABASE_URL="postgresql://ticket_user:ticket_pass@localhost:5432/ticket_dev"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
```

前端配置 `frontend/.env.development`:
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

#### 4. 启动服务

```bash
# 启动后端
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev

# 启动前端(新终端)
cd frontend
npm install
npm run dev
```

## 访问地址

- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:3000/api
- **API文档**: http://localhost:3000/api/docs
- **Prisma Studio**: 运行 `npm run prisma:studio` 打开

## 项目结构

```
工单项目/
├── backend/              # 后端服务
│   ├── src/
│   │   ├── common/      # 公共模块
│   │   ├── config/      # 配置
│   │   ├── modules/     # 业务模块
│   │   └── prisma/      # Prisma配置
│   ├── package.json
│   └── README.md
├── frontend/             # 前端应用
│   ├── src/
│   │   ├── api/        # API接口
│   │   ├── components/ # 组件
│   │   ├── pages/      # 页面
│   │   ├── store/      # 状态管理
│   │   └── router/     # 路由配置
│   ├── package.json
│   └── README.md
├── docs/                 # 文档
│   ├── 系统架构设计文档.md
│   ├── 数据库设计文档.md
│   ├── API接口设计文档.md
│   ├── 前端架构设计文档.md
│   └── 后端开发规范.md
├── docker-compose.yml    # Docker编排
└── README.md            # 项目说明
```

## 开发规范

- 后端开发规范: `docs/后端开发规范.md`
- 前端架构文档: `docs/前端架构设计文档.md`
- API接口文档: `docs/API接口设计文档.md`

## 常用命令

### 后端

```bash
# 开发
npm run start:dev        # 启动开发服务器
npm run build            # 构建生产版本
npm run start:prod       # 启动生产服务器

# 数据库
npm run prisma:generate  # 生成Prisma客户端
npm run prisma:migrate   # 执行数据库迁移
npm run prisma:studio    # 打开Prisma Studio

# 代码质量
npm run lint             # 代码检查
npm run format           # 代码格式化
npm run test             # 运行测试
npm run test:cov         # 测试覆盖率
```

### 前端

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览生产构建

# 代码质量
npm run lint             # 代码检查
npm run format           # 代码格式化
```

### Docker

```bash
# 启动所有服务
docker-compose up -d

# 启动数据库服务
docker-compose up -d postgres redis

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v
```

## Makefile快捷命令

```bash
# 安装依赖
make install

# 启动数据库
make db-up

# 初始化数据库
make db-init

# 启动开发环境
make dev

# 停止所有服务
make stop

# 清理数据
make clean
```

## 功能特性

- ✅ 用户认证与授权(JWT)
- ✅ 角色权限控制(RBAC)
- ✅ 工单全流程管理
- ✅ 工单分配与处理
- ✅ 工单审核与驳回
- ✅ 实时通知(WebSocket)
- ✅ 文件上传与管理
- ✅ 统计报表
- ✅ 操作日志审计
- ✅ API文档(Swagger)

## 部署指南

详见部署文档: `docs/部署指南.md` (待创建)

## 许可证

MIT License

## 贡献指南

欢迎提交Issue和Pull Request。

## 联系方式

- 项目负责人: Backend Team
- 技术支持: [邮箱地址]
