# API 文档

## 访问方式

### Swagger UI
启动服务后访问：http://localhost:3000/api/docs

### Postman Collection
生成Postman导入文件：
```bash
npm run generate:postman
```

然后导入 `postman-collection.json` 到Postman。

## 认证

所有需要认证的API都使用JWT Bearer Token。

### 获取Token

POST /api/v1/auth/login
```json
{
  "username": "reporter1",
  "password": "Test1234"
}
```

响应：
```json
{
  "user": {
    "id": 1,
    "username": "reporter1",
    "name": "张三",
    "role": "REPORTER"
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### 使用Token

在请求头中添加：
```
Authorization: Bearer {accessToken}
```

在Swagger UI中，点击右上角的 `Authorize` 按钮，输入token即可。

## API分类

### 1. 认证 (auth)
- POST /api/v1/auth/register - 注册
- POST /api/v1/auth/login - 登录
- POST /api/v1/auth/refresh - 刷新Token
- POST /api/v1/auth/logout - 登出

### 2. 工单管理 (tickets)
- GET /api/v1/tickets - 查询工单列表
- POST /api/v1/tickets - 创建工单
- GET /api/v1/tickets/:id - 查询工单详情
- PATCH /api/v1/tickets/:id - 更新工单
- DELETE /api/v1/tickets/:id - 删除工单
- POST /api/v1/tickets/:id/review - 审核报修

### 3. 审批流程 (approval)
- GET /api/v1/approvals/ticket/:ticketId - 查询审批流程
- GET /api/v1/approvals/pending - 我的待审批
- POST /api/v1/approvals/:flowId/steps/:stepNumber/approve - 审批通过
- POST /api/v1/approvals/:flowId/steps/:stepNumber/reject - 审批驳回
- POST /api/v1/approvals/:flowId/steps/:stepNumber/approve/parallel - 并行审批通过
- POST /api/v1/approvals/:flowId/steps/:stepNumber/reject/parallel - 并行审批驳回
- POST /api/v1/approvals/template/:templateId/ticket/:ticketId - 使用模板创建审批流程

### 4. 预算管理 (budget)
- POST /api/v1/budgets/ticket/:ticketId - 提交预算
- POST /api/v1/budgets/:id/review - 审核预算
- GET /api/v1/budgets/ticket/:ticketId - 查询预算

### 5. 立项管理 (project)
- POST /api/v1/projects/ticket/:ticketId - 发起立项
- GET /api/v1/projects/ticket/:ticketId - 查询立项
- PATCH /api/v1/projects/ticket/:ticketId - 更新立项

### 6. 签证管理 (visa)
- POST /api/v1/visas/ticket/:ticketId - 提交签证
- POST /api/v1/visas/:id/review - 审核签证
- GET /api/v1/visas/ticket/:ticketId - 查询签证
- GET /api/v1/visas/list - 查询签证列表

### 7. 结算管理 (settlement)
- POST /api/v1/settlements/ticket/:ticketId - 提交结算
- POST /api/v1/settlements/:id/review - 审核结算
- POST /api/v1/settlements/:id/mark-paid - 标记已支付
- GET /api/v1/settlements/ticket/:ticketId - 查询结算
- GET /api/v1/settlements/list - 查询结算列表

### 8. 附件管理 (attachments)
- POST /api/v1/attachments/upload - 上传附件
- GET /api/v1/attachments/:id - 下载附件
- GET /api/v1/attachments/ticket/:ticketId - 查询工单附件列表

### 9. 日志管理 (logs)
- GET /api/v1/logs/ticket/:ticketId - 查询工单操作日志
- GET /api/v1/logs/user/:userId - 查询用户操作日志

### 10. 统计报表 (statistics)
- GET /api/v1/statistics/overview - 概览统计
- GET /api/v1/statistics/approval/efficiency - 审批效率统计
- GET /api/v1/statistics/approval/by-role - 各角色审批量统计
- GET /api/v1/statistics/approval/phase-time - 各阶段耗时分析
- GET /api/v1/statistics/approval/trend - 审批趋势
- GET /api/v1/statistics/cost - 成本统计

### 11. 权限管理 (permissions)
- POST /api/v1/permissions - 创建权限
- GET /api/v1/permissions - 查询权限列表
- PUT /api/v1/permissions/role/:roleId - 更新角色权限

### 12. 通知管理 (notifications)
- GET /api/v1/notifications - 查询通知列表
- PATCH /api/v1/notifications/:id/read - 标记已读
- PATCH /api/v1/notifications/read-all - 全部标记已读
- GET /api/v1/notifications/settings - 查询通知设置
- PATCH /api/v1/notifications/settings - 更新通知设置

### 13. 健康检查 (health)
- GET /health - 系统健康检查
- GET /health/db - 数据库健康检查
- GET /health/redis - Redis健康检查
- GET /health/all - 全部健康检查

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 409 | 冲突（如重复提交） |
| 500 | 服务器错误 |

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

### 分页响应
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

## 常见查询参数

### 分页参数
- `page` - 页码，默认1
- `limit` - 每页数量，默认10，最大100

### 过滤参数
- `status` - 状态筛选
- `type` - 类型筛选
- `startDate` - 开始日期
- `endDate` - 结束日期

### 排序参数
- `sortBy` - 排序字段
- `order` - 排序方向（asc/desc）

## 测试账号

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| reporter1 | Test1234 | REPORTER | 报修人 |
| reviewer1 | Test1234 | REVIEWER | 审核员 |
| budget1 | Test1234 | BUDGET_OFFICER | 预算员 |
| director1 | Test1234 | DIRECTOR | 主任 |
| finance1 | Test1234 | FINANCE | 财务 |
| admin1 | Test1234 | ADMIN | 管理员 |

## 开发建议

### 1. 使用Swagger UI进行测试
- 启动开发服务器：`npm run start:dev`
- 访问 http://localhost:3000/api/docs
- 点击 `Authorize` 按钮输入token
- 展开API端点，点击 `Try it out` 测试

### 2. 使用Postman Collection
- 生成collection：`npm run generate:postman`
- 导入到Postman
- 设置环境变量 `baseUrl` 和 `accessToken`
- 按模块组织的请求更易于管理

### 3. 推荐工作流
1. 注册/登录获取token
2. 在Swagger UI中点击Authorize设置token
3. 按业务流程测试：报修 → 审核 → 预算 → 立项 → 签证 → 结算
4. 使用统计接口查看数据

## 技术栈

- **框架**: NestJS 10.x
- **API文档**: Swagger/OpenAPI 3.0
- **认证**: JWT (JSON Web Token)
- **数据库**: PostgreSQL + Prisma ORM
- **缓存**: Redis
- **实时通信**: Socket.IO

## 更新日志

### v2.0 (2024-01)
- ✅ 完善所有API的Swagger文档
- ✅ 添加详细的请求/响应示例
- ✅ 支持Postman Collection导出
- ✅ 新增签证管理模块
- ✅ 新增结算管理模块
- ✅ 新增并行审批功能
- ✅ 新增条件分支审批

### v1.0 (2023-12)
- ✅ 基础工单管理
- ✅ 审批流程
- ✅ 预算管理
- ✅ 立项管理

## 联系方式

如有问题或建议，请联系开发团队。
