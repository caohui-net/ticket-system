# 生产环境部署文件总览

本目录包含了工单系统后端服务的完整生产环境部署配置。

---

## 📁 文件结构

### 核心部署文件

| 文件 | 说明 | 类型 |
|------|------|------|
| `Dockerfile` | Docker镜像构建配置 | 必需 |
| `docker-compose.yml` | 多容器编排配置 | 必需 |
| `.dockerignore` | Docker构建忽略文件 | 必需 |
| `.env.production` | 生产环境变量模板 | 必需 |

### 数据库相关

| 文件 | 说明 | 类型 |
|------|------|------|
| `init-db.sql` | 数据库初始化脚本 | 必需 |
| `prisma/scripts/deploy.sh` | Prisma迁移部署脚本 | 必需 |
| `backup-database.sh` | 数据库备份脚本 | 推荐 |
| `restore-database.sh` | 数据库恢复脚本 | 推荐 |

### 配置文件

| 文件 | 说明 | 类型 |
|------|------|------|
| `nginx.conf` | Nginx反向代理配置 | 推荐 |
| `ticket-system.service` | Systemd服务配置 | 可选 |

### 脚本工具

| 文件 | 说明 | 类型 |
|------|------|------|
| `check-environment.sh` | 环境检查脚本 | 推荐 |
| `deploy-production.sh` | 自动部署脚本 | 推荐 |

### 文档

| 文件 | 说明 | 类型 |
|------|------|------|
| `DEPLOYMENT.md` | 详细部署指南 | 必需 |
| `DEPLOYMENT_CHECKLIST.md` | 部署检查清单 | 推荐 |
| `PRODUCTION_DEPLOYMENT_FILES.md` | 本文件 | 参考 |

### 应用代码

| 文件/目录 | 说明 |
|----------|------|
| `src/common/logger/winston.config.ts` | Winston日志配置 |
| `src/common/guards/throttle.guard.ts` | API限流守卫 |
| `src/modules/health/` | 健康检查模块（已存在） |

---

## 🚀 快速开始

### 1. 环境检查

```bash
# 运行环境检查脚本
./check-environment.sh
```

### 2. 配置环境变量

```bash
# 复制生产环境配置模板
cp .env.production .env

# 编辑配置（必须修改以下项）
nano .env
```

**必须修改的配置**：
- `JWT_SECRET` - JWT密钥（至少32字符）
- `JWT_REFRESH_SECRET` - 刷新令牌密钥
- `DB_PASSWORD` - 数据库密码
- `SESSION_SECRET` - 会话密钥
- `CORS_ORIGIN` - CORS白名单
- `FRONTEND_URL` - 前端URL

### 3. 部署

```bash
# 自动部署
./deploy-production.sh

# 或手动部署
docker-compose up -d
docker-compose exec backend npx prisma db push
```

### 4. 验证

```bash
# 健康检查
curl http://localhost:3000/health

# 完整检查
curl http://localhost:3000/health/all
```

---

## 📋 部署模式

### 模式1：Docker Compose（推荐）

**适用场景**：单机部署、开发/测试环境

**优点**：
- 一键部署
- 环境隔离
- 易于管理

**文件**：
- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`

**部署命令**：
```bash
docker-compose up -d
```

---

### 模式2：Docker + Nginx

**适用场景**：生产环境、需要HTTPS

**优点**：
- HTTPS支持
- 反向代理
- 负载均衡
- 静态文件优化

**额外文件**：
- `nginx.conf`

**部署步骤**：
```bash
# 1. 启动应用
docker-compose up -d

# 2. 配置Nginx
sudo cp nginx.conf /etc/nginx/sites-available/ticket-system
sudo ln -s /etc/nginx/sites-available/ticket-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 3. 配置SSL
sudo certbot --nginx -d api.yourdomain.com
```

---

### 模式3：Systemd服务

**适用场景**：非Docker环境、传统部署

**优点**：
- 系统级管理
- 开机自启
- 日志集成

**文件**：
- `ticket-system.service`

**部署步骤**：
```bash
# 1. 构建应用
npm ci --only=production
npm run build

# 2. 配置服务
sudo cp ticket-system.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ticket-system
sudo systemctl start ticket-system

# 3. 检查状态
sudo systemctl status ticket-system
```

---

## 🔧 维护操作

### 日常维护

```bash
# 查看日志
docker-compose logs -f backend

# 重启服务
docker-compose restart backend

# 更新应用
git pull
docker-compose build backend
docker-compose up -d backend
```

### 数据库维护

```bash
# 备份数据库
./backup-database.sh

# 恢复数据库
./restore-database.sh backup_ticket_system_20240101_120000.sql.gz

# 手动备份
docker-compose exec postgres pg_dump -U ticketuser ticket_system > backup.sql
```

### 日志管理

```bash
# 查看应用日志
tail -f logs/combined.log
tail -f logs/error.log

# 查看Docker日志
docker-compose logs --tail=100 backend

# 清理旧日志
find logs/ -name "*.log" -mtime +7 -delete
```

---

## 📊 监控

### 健康检查端点

| 端点 | 说明 |
|------|------|
| `/health` | 基础健康检查 |
| `/health/db` | 数据库健康检查 |
| `/health/redis` | Redis健康检查 |
| `/health/all` | 完整健康检查 |

### 监控命令

```bash
# 容器状态
docker-compose ps

# 资源使用
docker stats

# 数据库连接数
docker-compose exec postgres psql -U ticketuser -d ticket_system -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔐 安全配置

### 必需配置

- [ ] 修改所有默认密码
- [ ] 启用HTTPS
- [ ] 配置CORS白名单
- [ ] 关闭Swagger文档（生产环境）
- [ ] 启用API限流
- [ ] 配置防火墙

### 推荐配置

- [ ] 配置Sentry监控
- [ ] 启用日志审计
- [ ] 配置自动备份
- [ ] 设置告警规则
- [ ] 定期更新依赖

---

## 🐛 故障排查

### 常见问题

1. **容器无法启动**
   ```bash
   docker-compose logs backend
   docker-compose ps
   ```

2. **数据库连接失败**
   ```bash
   docker-compose logs postgres
   docker-compose exec backend env | grep DATABASE_URL
   ```

3. **端口冲突**
   ```bash
   sudo lsof -i :3000
   sudo netstat -tulpn | grep 3000
   ```

详细故障排查请参考 `DEPLOYMENT.md`。

---

## 📞 技术支持

### 获取帮助

1. 查看详细文档：`DEPLOYMENT.md`
2. 查看检查清单：`DEPLOYMENT_CHECKLIST.md`
3. 查看应用日志：`docker-compose logs backend`

### 提供反馈

提供以下信息：
- 错误日志
- 系统信息（`docker version`, `docker-compose version`）
- 环境配置（脱敏）
- 重现步骤

---

## 📝 版本信息

- **版本**: v1.0.0
- **创建日期**: 2024-01-01
- **最后更新**: 2024-01-01
- **维护团队**: Backend Team

---

## 🔄 更新日志

### v1.0.0 (2024-01-01)
- 初始生产部署版本
- 完整的Docker化支持
- 自动化部署脚本
- 数据库备份/恢复工具
- Nginx反向代理配置
- 健康检查增强
- API限流保护
- Winston日志系统

---

## 📚 相关文档

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 详细部署指南
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - 部署检查清单
- [README.md](./README.md) - 项目README
- [QUICKSTART_PHASE1.md](./QUICKSTART_PHASE1.md) - 快速开始指南

---

**最后更新**: 2024-01-01  
**文档版本**: 1.0.0
