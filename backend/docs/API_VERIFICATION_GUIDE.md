# 统计报表API快速验证指南

## 前提条件

1. 启动后端服务
```bash
cd ~/projects/工单项目/backend
npm run start:dev
```

2. 获取JWT Token（登录）
```bash
# 登录获取token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your_password"
  }'

# 保存返回的access_token
TOKEN="返回的access_token"
```

## API测试命令

### 1. 概览统计
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/overview
```

**预期响应**：
```json
{
  "totalTickets": 150,
  "pendingAssignTickets": 10,
  "processingTickets": 20,
  "pendingReviewTickets": 15,
  "rejectedTickets": 0,
  "completedTickets": 50,
  "closedTickets": 45,
  "cancelledTickets": 5,
  "todayNew": 5,
  "weekNew": 15,
  "monthNew": 60,
  "avgResponseTime": "2.5小时",
  "avgResolutionTime": "1.2天"
}
```

### 2. 按状态统计
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/tickets/by-status
```

**预期响应**：
```json
[
  {
    "status": "OPEN",
    "count": 10,
    "percentage": 6.67
  },
  {
    "status": "IN_PROGRESS",
    "count": 20,
    "percentage": 13.33
  }
]
```

### 3. 按优先级统计
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/tickets/by-priority
```

**预期响应**：
```json
[
  {
    "priority": "LOW",
    "count": 30,
    "percentage": 20
  },
  {
    "priority": "MEDIUM",
    "count": 60,
    "percentage": 40
  }
]
```

### 4. 工单趋势（最近7天）
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/v1/statistics/tickets/trend?days=7"
```

**预期响应**：
```json
{
  "labels": ["2026-09-01", "2026-09-02", "..."],
  "datasets": [
    {
      "label": "新增工单",
      "data": [5, 8, 3, 10, 6, 9, 4]
    },
    {
      "label": "完成工单",
      "data": [3, 6, 5, 8, 4, 7, 5]
    }
  ]
}
```

### 5. 响应时间统计
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/response-time
```

**预期响应**：
```json
{
  "avgFirstResponseTime": "2.5小时",
  "avgResolutionTime": "1.2天",
  "byPriority": [
    {
      "priority": "LOW",
      "avgResponseTime": "4小时",
      "avgResolutionTime": "2天"
    }
  ]
}
```

### 6. 用户工作量
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/users/workload
```

**预期响应**：
```json
[
  {
    "userId": "1",
    "username": "handler1",
    "realName": "张三",
    "createdCount": 5,
    "assignedCount": 20,
    "completedCount": 18,
    "avgResponseTime": "2.3小时"
  }
]
```

### 7. 活跃用户统计
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/users/active
```

**预期响应**：
```json
{
  "totalUsers": 50,
  "activeUsers": 30,
  "topCreators": [
    {
      "userId": "1",
      "username": "user1",
      "realName": "张三",
      "count": 25
    }
  ],
  "topHandlers": [
    {
      "userId": "2",
      "username": "handler1",
      "realName": "李四",
      "count": 40
    }
  ]
}
```

## 使用Postman/Insomnia测试

### 环境配置
1. **Base URL**: `http://localhost:3000/api/v1`
2. **Authorization**: Bearer Token
3. **Headers**:
   - `Content-Type: application/json`
   - `Authorization: Bearer {{token}}`

### Collection结构
```
工单系统API
├── Auth
│   └── 登录
└── Statistics（统计报表）
    ├── 概览统计
    ├── 按状态统计
    ├── 按优先级统计
    ├── 工单趋势
    ├── 响应时间统计
    ├── 用户工作量
    └── 活跃用户
```

## 访问Swagger文档

打开浏览器访问：
```
http://localhost:3000/api
```

在Swagger UI中：
1. 点击右上角 "Authorize" 按钮
2. 输入格式：`Bearer your_token_here`
3. 点击 "Authorize" 确认
4. 现在可以在Swagger UI中直接测试所有统计API

## 常见问题

### 401 Unauthorized
- **原因**: Token过期或无效
- **解决**: 重新登录获取新的token

### 404 Not Found
- **原因**: 路由未注册或URL错误
- **解决**: 检查URL拼写，确认服务已启动

### 500 Internal Server Error
- **原因**: 数据库连接失败或查询错误
- **解决**: 检查PostgreSQL服务状态，查看后端日志

## 数据准备

如果数据库为空，统计结果会显示0。建议：
1. 运行数据库种子脚本（如果有）
2. 通过工单管理API创建测试数据
3. 或手动在数据库中插入测试数据

## 性能测试

### 并发测试（使用ab工具）
```bash
# 安装apache bench
sudo apt install apache2-utils

# 测试概览API（100个请求，10个并发）
ab -n 100 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/statistics/overview
```

### 预期性能
- **响应时间**: < 200ms（正常数据量）
- **并发处理**: 支持10+ QPS
- **数据库查询**: 并行优化，减少等待时间

## 下一步

验证完成后，可以：
1. ✅ 前端集成：调用这些API显示统计图表
2. ✅ 数据导出：添加CSV/Excel导出功能
3. ✅ 缓存优化：使用Redis缓存热门查询
4. ✅ 实时更新：WebSocket推送统计变化

---

**最后更新**: 2026-09-06
