# 工单管理系统 - 启动指南

## 快速启动

### 方法一: 使用启动脚本 (推荐)

```bash
# 运行启动脚本
./start.sh

# 然后在两个终端分别运行:
# 终端1
cd backend && npm run start:dev

# 终端2
cd frontend && npm run dev
```

### 方法二: 使用Makefile

```bash
# 1. 安装依赖
make install

# 2. 启动数据库
make db-up

# 3. 初始化数据库(首次运行)
make db-init

# 4. 启动后端(终端1)
make backend-dev

# 5. 启动前端(终端2)
make frontend-dev
```

### 方法三: 手动启动

```bash
# 1. 启动数据库
docker-compose up -d postgres redis

# 2. 安装后端依赖
cd backend
npm install

# 3. 初始化数据库(首次运行)
npm run prisma:generate
npm run prisma:migrate

# 4. 启动后端
npm run start:dev

# 5. 在新终端启动前端
cd frontend
npm install
npm run dev
```

## 访问地址

启动成功后,可以访问以下地址:

- **前端应用**: http://localhost:5173
- **后端API**: http://localhost:3000/api
- **API文档**: http://localhost:3000/api/docs (Swagger)
- **Prisma Studio**: 运行 `cd backend && npm run prisma:studio`

## 验证服务状态

### 检查数据库

```bash
# 查看Docker容器状态
docker-compose ps

# 应该看到postgres和redis都在运行
```

### 检查后端

访问: http://localhost:3000/api/health (待实现健康检查端点)

或查看终端日志,应该看到:
```
✅ 数据库连接成功
🚀 应用启动成功！
📍 接口地址: http://localhost:3000/api
📚 API文档: http://localhost:3000/api/docs
```

### 检查前端

访问: http://localhost:5173

应该看到前端页面加载成功。

## 常见问题

### 1. 端口被占用

**问题**: 端口3000或5173已被占用

**解决**:
```bash
# 查看占用端口的进程
lsof -i :3000
lsof -i :5173

# 杀掉进程
kill -9 <PID>
```

或者修改端口:
- 后端: 修改 `backend/.env.development` 中的 `PORT`
- 前端: 修改 `frontend/vite.config.ts` 中的 `server.port`

### 2. 数据库连接失败

**问题**: 无法连接PostgreSQL

**检查**:
```bash
# 检查Docker容器
docker-compose ps

# 查看PostgreSQL日志
docker-compose logs postgres

# 重启数据库
docker-compose restart postgres
```

### 3. Prisma迁移失败

**问题**: 执行 `prisma migrate` 报错

**解决**:
```bash
# 重置数据库(会清空数据)
cd backend
npm run prisma:migrate -- reset

# 或手动删除并重新创建
docker-compose down -v
docker-compose up -d postgres redis
npm run prisma:migrate
```

### 4. 前端API请求失败

**问题**: 前端无法请求后端API

**检查**:
1. 确认后端已启动在3000端口
2. 检查 `frontend/.env.development` 中的 `VITE_API_BASE_URL`
3. 检查浏览器控制台的CORS错误
4. 确认 `backend/src/main.ts` 中的CORS配置

### 5. 依赖安装失败

**问题**: `npm install` 报错

**解决**:
```bash
# 清除缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install

# 或使用pnpm
npm install -g pnpm
pnpm install
```

## 停止服务

```bash
# 停止前端和后端(Ctrl+C)

# 停止数据库
docker-compose down

# 停止并删除数据
docker-compose down -v
```

## 下一步

启动成功后,可以:

1. 查看API文档: http://localhost:3000/api/docs
2. 阅读开发文档: `docs/`目录
3. 开始开发新功能
4. 运行测试: `npm run test`

## 需要帮助?

- 查看完整文档: `ROOT_README.md`
- 后端文档: `backend/README.md`
- 前端文档: `frontend/README.md`
- 架构设计: `docs/系统架构设计文档.md`
