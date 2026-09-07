# 生产环境部署清单

## 📋 部署前检查清单

### 1. 环境准备

- [ ] Docker 20.10+ 已安装
- [ ] Docker Compose 2.0+ 已安装
- [ ] 至少 2GB 可用内存
- [ ] 至少 10GB 可用磁盘空间
- [ ] 端口 3000, 5432, 6379 可用

### 2. 配置文件

- [ ] 已创建 `.env` 文件
- [ ] 已修改 `JWT_SECRET`（至少32字符）
- [ ] 已修改 `JWT_REFRESH_SECRET`（至少32字符）
- [ ] 已修改 `DB_PASSWORD`
- [ ] 已修改 `SESSION_SECRET`
- [ ] 已设置 `CORS_ORIGIN` 为实际域名
- [ ] 已设置 `FRONTEND_URL`
- [ ] `NODE_ENV` 设置为 `production`

### 3. 安全配置

- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 关闭 Swagger 文档（`SWAGGER_ENABLED=false`）
- [ ] 关闭详细错误信息（`SHOW_ERROR_DETAILS=false`）
- [ ] 配置 CORS 白名单
- [ ] 配置限流参数

### 4. SSL/HTTPS

- [ ] 已配置 Nginx 反向代理
- [ ] 已申请 SSL 证书
- [ ] 已配置证书自动续期
- [ ] 已测试 HTTPS 访问

### 5. 数据库

- [ ] 已创建数据库
- [ ] 已创建数据库用户
- [ ] 已授予适当权限
- [ ] 已测试数据库连接
- [ ] 已执行数据库迁移

### 6. 监控和日志

- [ ] 已配置日志目录
- [ ] 已配置日志轮转
- [ ] 已集成监控系统（可选）
- [ ] 已配置告警规则（可选）

### 7. 备份策略

- [ ] 已配置数据库自动备份
- [ ] 已测试备份恢复流程
- [ ] 已配置备份存储位置

### 8. 防火墙

- [ ] 已配置防火墙规则
- [ ] 只开放必要端口（80, 443）
- [ ] 已限制数据库访问（只允许本地）

---

## 🚀 部署步骤

### 快速部署

```bash
# 1. 检查环境
./check-environment.sh

# 2. 执行部署
./deploy-production.sh
```

### 手动部署

```bash
# 1. 克隆代码
git clone <repository-url>
cd backend

# 2. 配置环境
cp .env.production .env
nano .env  # 修改配置

# 3. 启动服务
docker-compose up -d

# 4. 执行迁移
docker-compose exec backend npx prisma db push

# 5. 初始化数据
docker-compose exec backend npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts

# 6. 验证部署
curl http://localhost:3000/health
```

---

## ✅ 部署后验证

### 1. 服务健康检查

```bash
# 基础健康检查
curl http://localhost:3000/health

# 完整健康检查
curl http://localhost:3000/health/all

# 数据库检查
curl http://localhost:3000/health/db

# Redis检查
curl http://localhost:3000/health/redis
```

### 2. API测试

```bash
# 登录测试
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 获取用户列表（需要token）
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer <token>"
```

### 3. 日志检查

```bash
# 查看应用日志
docker-compose logs -f backend

# 查看错误日志
tail -f logs/error.log

# 查看综合日志
tail -f logs/combined.log
```

### 4. 性能测试

```bash
# 使用 ab 进行压力测试
ab -n 1000 -c 10 http://localhost:3000/health

# 使用 wrk 进行性能测试
wrk -t4 -c100 -d30s http://localhost:3000/health
```

---

## 🔧 常见问题处理

### 问题1：容器无法启动

**排查**：
```bash
docker-compose logs backend
docker-compose ps
```

**解决**：
- 检查端口占用
- 检查环境变量配置
- 检查依赖服务是否启动

### 问题2：数据库连接失败

**排查**：
```bash
docker-compose logs postgres
docker-compose exec backend env | grep DATABASE_URL
```

**解决**：
- 检查 DATABASE_URL 格式
- 确认数据库容器运行
- 检查用户名密码

### 问题3：Redis连接失败

**排查**：
```bash
docker-compose logs redis
docker-compose exec redis redis-cli ping
```

**解决**：
- 检查 Redis 容器状态
- 检查 REDIS_HOST 配置
- 检查网络连接

---

## 📊 监控指标

### 关键指标

- **响应时间**：平均 < 200ms
- **错误率**：< 0.1%
- **CPU使用率**：< 70%
- **内存使用率**：< 80%
- **数据库连接数**：< 80% 池大小

### 监控命令

```bash
# 容器资源使用
docker stats

# 应用进程
docker-compose exec backend ps aux

# 数据库连接数
docker-compose exec postgres psql -U ticketuser -d ticket_system -c \
  "SELECT count(*) FROM pg_stat_activity;"
```

---

## 🔄 维护操作

### 日常维护

```bash
# 查看日志
docker-compose logs -f --tail=100 backend

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
docker-compose exec postgres pg_dump -U ticketuser ticket_system \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复数据库
docker-compose exec -T postgres psql -U ticketuser ticket_system \
  < backup_20240101_120000.sql

# 数据库vacuum
docker-compose exec postgres psql -U ticketuser -d ticket_system -c "VACUUM ANALYZE;"
```

### 日志清理

```bash
# 清理旧日志（保留最近7天）
find logs/ -name "*.log" -mtime +7 -delete

# 清理Docker日志
docker-compose logs --no-log-prefix backend 2>/dev/null | tail -1000 > /tmp/latest.log
```

---

## 🔐 安全加固

### 1. 系统层面

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 禁用root登录
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no
```

### 2. 应用层面

- 定期更新依赖：`npm audit fix`
- 使用强密码策略
- 启用限流保护
- 配置 CORS 白名单
- 关闭调试模式

### 3. 数据库层面

```bash
# 修改默认端口
# 限制远程访问
# 启用SSL连接
# 定期更新密码
```

---

## 📞 紧急联系

### 故障响应流程

1. **发现问题**：监控告警 / 用户报告
2. **快速评估**：检查日志和健康状态
3. **临时措施**：重启服务 / 切换备份
4. **根因分析**：详细日志分析
5. **永久修复**：代码修复 / 配置调整
6. **复盘总结**：记录问题和解决方案

### 回滚流程

```bash
# 1. 停止当前版本
docker-compose stop backend

# 2. 切换到旧版本
git checkout <previous-commit>
docker-compose build backend

# 3. 启动旧版本
docker-compose up -d backend

# 4. 数据库回滚（如需要）
docker-compose exec -T postgres psql -U ticketuser ticket_system \
  < backup_before_deploy.sql
```

---

## 📝 变更日志

记录每次部署的变更：

```
## 2024-01-01
- 初始生产部署
- 版本: v1.0.0
- 包含功能: 权限系统Phase1, 工单管理, 统计分析
```

---

**创建日期**: 2024-01-01  
**最后更新**: 2024-01-01  
**维护团队**: Backend Team
