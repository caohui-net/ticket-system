# 生产环境部署指南

## 📋 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- PostgreSQL 14+ （如果不使用Docker）
- Redis 7+ （如果不使用Docker）
- Node.js 20+ （开发环境）
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

---

## 🚀 快速部署（Docker Compose）

### 1. 克隆代码

```bash
git clone <repository-url>
cd backend
```

### 2. 配置环境变量

```bash
# 复制生产环境配置模板
cp .env.production .env

# 编辑配置文件
nano .env
```

**⚠️ 重要：必须修改以下配置**

```env
# JWT密钥（至少32字符）
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production_min_32_chars

# 数据库密码
DB_PASSWORD=your_secure_database_password

# 会话密钥
SESSION_SECRET=your_session_secret_change_this_in_production

# CORS配置（设置为实际前端域名）
CORS_ORIGIN=https://yourdomain.com

# 前端URL
FRONTEND_URL=https://yourdomain.com
```

### 3. 启动所有服务

```bash
# 构建并启动所有服务（后台运行）
docker-compose up -d

# 查看启动日志
docker-compose logs -f backend
```

### 4. 执行数据库迁移

```bash
# 进入后端容器
docker-compose exec backend sh

# 执行迁移脚本
sh prisma/scripts/deploy.sh

# 或直接执行
docker-compose exec backend npx prisma db push

# 退出容器
exit
```

### 5. 初始化种子数据（可选）

```bash
# 设置环境变量并执行种子脚本
docker-compose exec backend sh -c "INIT_SEED_DATA=true sh prisma/scripts/deploy.sh"

# 或手动执行
docker-compose exec backend npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts
```

### 6. 验证部署

```bash
# 健康检查
curl http://localhost:3000/health

# 完整健康检查
curl http://localhost:3000/health/all

# 数据库检查
curl http://localhost:3000/health/db

# Redis检查
curl http://localhost:3000/health/redis
```

---

## 🔧 手动部署（非Docker）

### 1. 安装依赖

```bash
# 安装Node.js依赖
npm ci --only=production

# 生成Prisma Client
npx prisma generate
```

### 2. 配置数据库

```bash
# 确保PostgreSQL和Redis已运行
systemctl status postgresql
systemctl status redis

# 创建数据库
sudo -u postgres psql
CREATE DATABASE ticket_system;
CREATE USER ticketuser WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ticket_system TO ticketuser;
\q

# 执行数据库迁移
npx prisma db push
```

### 3. 构建应用

```bash
npm run build
```

### 4. 启动应用

```bash
# 使用PM2（推荐）
npm install -g pm2
pm2 start dist/main.js --name ticket-system

# 或使用systemd
sudo systemctl start ticket-system
```

---

## 🔒 生产环境安全配置

### 1. 使用HTTPS（Nginx反向代理）

参考 `nginx.conf` 配置文件：

```bash
# 复制配置文件
sudo cp nginx.conf /etc/nginx/sites-available/ticket-system
sudo ln -s /etc/nginx/sites-available/ticket-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 2. 配置SSL证书

```bash
# 使用Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 配置防火墙

```bash
# 使用ufw
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# 如果直接暴露应用端口
sudo ufw allow 3000/tcp
```

### 4. 限制数据库访问

```bash
# 编辑PostgreSQL配置
sudo nano /etc/postgresql/14/main/pg_hba.conf

# 只允许本地连接
local   all             all                                     peer
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

---

## 📊 监控和日志

### 1. 查看日志

```bash
# Docker Compose日志
docker-compose logs -f backend
docker-compose logs -f --tail=100 backend

# 应用日志文件
tail -f logs/combined.log
tail -f logs/error.log
tail -f logs/app.log
```

### 2. 日志轮转配置

创建 `/etc/logrotate.d/ticket-system`:

```
/home/caohui/projects/工单项目/backend/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    missingok
    create 0644 nestjs nodejs
}
```

### 3. 集成Sentry（可选）

```bash
# 安装Sentry SDK
npm install @sentry/node

# 在.env中配置
SENTRY_DSN=https://your-sentry-dsn
```

---

## 🔄 维护命令

### Docker Compose环境

```bash
# 停止所有服务
docker-compose stop

# 启动所有服务
docker-compose start

# 重启后端服务
docker-compose restart backend

# 重新构建并启动
docker-compose up -d --build backend

# 查看容器状态
docker-compose ps

# 进入容器
docker-compose exec backend sh
docker-compose exec postgres psql -U ticketuser -d ticket_system

# 清理未使用的资源
docker system prune -a
```

### 数据库维护

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U ticketuser ticket_system > backup_$(date +%Y%m%d).sql

# 恢复数据库
docker-compose exec -T postgres psql -U ticketuser ticket_system < backup_20240101.sql

# 手动备份（非Docker）
pg_dump -U ticketuser ticket_system > backup.sql
```

### 更新应用

```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build backend

# 重启服务
docker-compose up -d backend

# 执行新的数据库迁移
docker-compose exec backend npx prisma db push
```

---

## 🐛 故障排查

### 问题1：数据库连接失败

**症状**：`Error: P1001: Can't reach database server`

**排查步骤**：

```bash
# 检查数据库容器是否运行
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 测试数据库连接
docker-compose exec postgres psql -U ticketuser -d ticket_system

# 检查DATABASE_URL配置
docker-compose exec backend env | grep DATABASE_URL
```

**解决方案**：

1. 确认PostgreSQL容器已启动
2. 检查DATABASE_URL格式是否正确
3. 确认用户名和密码正确
4. 检查网络连接

### 问题2：应用无法启动

**症状**：容器反复重启

**排查步骤**：

```bash
# 查看容器日志
docker-compose logs --tail=100 backend

# 检查健康检查状态
docker inspect ticket-system-backend | grep -A 10 Health

# 检查端口占用
sudo netstat -tulpn | grep 3000
```

**解决方案**：

1. 检查环境变量配置
2. 确认依赖服务已启动
3. 查看应用日志定位错误
4. 检查端口冲突

### 问题3：Redis连接失败

**症状**：`Error: connect ECONNREFUSED 127.0.0.1:6379`

**排查步骤**：

```bash
# 检查Redis容器
docker-compose ps redis

# 测试Redis连接
docker-compose exec redis redis-cli ping

# 检查Redis配置
docker-compose exec backend env | grep REDIS
```

**解决方案**：

1. 确认Redis容器已启动
2. 检查REDIS_HOST配置（Docker环境应为"redis"）
3. 检查Redis端口配置

### 问题4：文件上传失败

**症状**：文件上传返回500错误

**排查步骤**：

```bash
# 检查上传目录权限
docker-compose exec backend ls -la uploads/

# 检查磁盘空间
df -h
```

**解决方案**：

```bash
# 创建上传目录并设置权限
docker-compose exec backend mkdir -p uploads
docker-compose exec backend chown -R nestjs:nodejs uploads
```

### 问题5：性能问题

**症状**：响应慢、超时

**排查步骤**：

```bash
# 检查容器资源使用
docker stats

# 检查数据库连接数
docker-compose exec postgres psql -U ticketuser -d ticket_system -c "SELECT count(*) FROM pg_stat_activity;"

# 检查慢查询
docker-compose exec backend cat logs/app.log | grep "slow"
```

**解决方案**：

1. 增加容器资源限制
2. 优化数据库查询
3. 添加数据库索引
4. 启用Redis缓存
5. 调整连接池大小

---

## 📈 性能优化

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created_at ON tickets(created_at);
CREATE INDEX idx_users_email ON users(email);

-- 分析表
ANALYZE tickets;
ANALYZE users;
```

### 2. Redis缓存

在代码中启用缓存装饰器：

```typescript
@UseInterceptors(CacheInterceptor)
@CacheTTL(300) // 5分钟
@Get()
findAll() {
  // ...
}
```

### 3. Docker资源限制

在 `docker-compose.yml` 中添加：

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 2G
      reservations:
        cpus: '1'
        memory: 1G
```

---

## 🔐 安全检查清单

- [ ] 修改所有默认密码
- [ ] 启用HTTPS
- [ ] 配置CORS白名单
- [ ] 关闭Swagger文档（生产环境）
- [ ] 启用限流保护
- [ ] 配置防火墙规则
- [ ] 定期更新依赖
- [ ] 配置日志审计
- [ ] 实施备份策略
- [ ] 监控异常登录
- [ ] 限制数据库访问
- [ ] 使用环境变量管理敏感信息

---

## 📞 技术支持

如遇问题，请提供以下信息：

1. 错误日志（`docker-compose logs backend`）
2. 系统信息（`docker version`, `docker-compose version`）
3. 环境配置（脱敏后的.env）
4. 重现步骤

---

## 📝 版本记录

- v1.0.0 - 初始部署版本
- 包含完整的权限系统（Phase 1）
- 包含工单管理系统
- 包含统计分析模块

---

**最后更新**: 2024-01-01  
**维护团队**: Backend Team
