# 通知系统 API 文档

## 概述

通知系统提供应用内通知和邮件通知功能，支持多种通知类型和用户自定义通知设置。

## 通知类型

- `TICKET_CREATED` - 工单创建通知
- `TICKET_ASSIGNED` - 工单分配通知
- `TICKET_STATUS_CHANGED` - 工单状态变更通知
- `TICKET_COMMENTED` - 工单评论通知
- `MENTION` - @提及通知

## API 端点

### 通知管理

#### 1. 获取通知列表

```
GET /api/v1/notifications
```

**查询参数：**
- `unreadOnly` (boolean, 可选) - 是否只查询未读通知
- `page` (number, 可选, 默认: 1) - 页码
- `pageSize` (number, 可选, 默认: 20) - 每页数量

**响应示例：**
```json
{
  "data": [
    {
      "id": "1",
      "userId": "1",
      "type": "TICKET_CREATED",
      "title": "新工单 #123",
      "content": "张三 创建了新工单：系统登录异常",
      "link": "/tickets/123",
      "read": false,
      "readAt": null,
      "createdAt": "2024-01-20T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

#### 2. 获取未读通知数量

```
GET /api/v1/notifications/unread-count
```

**响应示例：**
```json
{
  "count": 5
}
```

#### 3. 标记单个通知为已读

```
PATCH /api/v1/notifications/:id/read
```

**路径参数：**
- `id` (string) - 通知ID

**响应示例：**
```json
{
  "message": "已标记为已读"
}
```

#### 4. 标记所有通知为已读

```
PATCH /api/v1/notifications/read-all
```

**响应示例：**
```json
{
  "message": "所有通知已标记为已读"
}
```

#### 5. 删除通知

```
DELETE /api/v1/notifications/:id
```

**路径参数：**
- `id` (string) - 通知ID

**响应示例：**
```json
{
  "message": "通知已删除"
}
```

### 通知设置

#### 1. 获取用户通知设置

```
GET /api/v1/notification-settings
```

**响应示例：**
```json
{
  "id": "1",
  "userId": "1",
  "inAppEnabled": true,
  "ticketCreated": true,
  "ticketAssigned": true,
  "ticketStatusChanged": true,
  "ticketCommented": true,
  "mention": true,
  "emailEnabled": false,
  "emailTicketCreated": false,
  "emailTicketAssigned": true,
  "emailTicketStatusChanged": false,
  "emailTicketCommented": false,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T10:00:00.000Z"
}
```

#### 2. 更新用户通知设置

```
PUT /api/v1/notification-settings
```

**请求体：**
```json
{
  "inAppEnabled": true,
  "ticketCreated": true,
  "ticketAssigned": true,
  "ticketStatusChanged": false,
  "ticketCommented": true,
  "mention": true,
  "emailEnabled": true,
  "emailTicketCreated": false,
  "emailTicketAssigned": true,
  "emailTicketStatusChanged": false,
  "emailTicketCommented": false
}
```

**响应示例：**
```json
{
  "id": "1",
  "userId": "1",
  "inAppEnabled": true,
  "ticketCreated": true,
  "ticketAssigned": true,
  "ticketStatusChanged": false,
  "ticketCommented": true,
  "mention": true,
  "emailEnabled": true,
  "emailTicketCreated": false,
  "emailTicketAssigned": true,
  "emailTicketStatusChanged": false,
  "emailTicketCommented": false,
  "createdAt": "2024-01-20T10:00:00.000Z",
  "updatedAt": "2024-01-20T11:30:00.000Z"
}
```

## 通知触发机制

### 1. 工单创建通知

**触发时机：** 用户创建新工单时

**通知对象：** 所有管理员和经理角色的用户

**应用内通知：** ✓
**邮件通知：** ✓ (如果用户启用)

### 2. 工单分配通知

**触发时机：** 工单被分配给处理人时

**通知对象：** 被分配的处理人

**应用内通知：** ✓
**邮件通知：** ✓ (如果用户启用)

### 3. 工单状态变更通知

**触发时机：** 工单状态发生变更时

**通知对象：** 工单创建人和处理人

**应用内通知：** ✓
**邮件通知：** ✓ (如果用户启用)

### 4. 工单评论通知

**触发时机：** 用户在工单中发表评论时

**通知对象：** 工单创建人和处理人（不包括评论人自己）

**应用内通知：** ✓
**邮件通知：** ✓ (如果用户启用)

### 5. @提及通知

**触发时机：** 评论内容中包含 @username 格式时

**通知对象：** 被@的用户

**应用内通知：** ✓
**邮件通知：** ✗

## 邮件配置

在 `.env` 文件中配置SMTP参数：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@ticketing.com
```

### Gmail 配置说明

1. 开启两步验证
2. 生成应用专用密码
3. 使用应用专用密码作为 `SMTP_PASS`

### 其他邮箱配置

| 邮箱服务商 | SMTP_HOST | SMTP_PORT |
|-----------|-----------|-----------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp.office365.com | 587 |
| QQ邮箱 | smtp.qq.com | 587 |
| 163邮箱 | smtp.163.com | 465 |

## 通知设置说明

### 应用内通知

- `inAppEnabled`: 应用内通知总开关
- `ticketCreated`: 工单创建通知
- `ticketAssigned`: 工单分配通知
- `ticketStatusChanged`: 状态变更通知
- `ticketCommented`: 评论通知
- `mention`: @提及通知

### 邮件通知

- `emailEnabled`: 邮件通知总开关
- `emailTicketCreated`: 工单创建邮件通知
- `emailTicketAssigned`: 工单分配邮件通知
- `emailTicketStatusChanged`: 状态变更邮件通知
- `emailTicketCommented`: 评论邮件通知

**注意：** @提及通知目前只支持应用内通知，不发送邮件。

## 错误码

- `404` - 通知不存在
- `401` - 未授权
- `500` - 服务器内部错误

## 安全性

- 所有API端点都需要JWT认证
- 用户只能访问自己的通知
- 通知异步发送，不阻塞主流程
- 邮件发送失败不影响核心功能

## 性能优化

- 通知创建前检查用户设置，避免创建不需要的通知
- 邮件发送使用异步队列，避免阻塞
- 数据库索引优化查询性能

## 测试覆盖率

- 单元测试覆盖率：100%
- 测试用例数：14个
- 所有核心功能都有测试覆盖
