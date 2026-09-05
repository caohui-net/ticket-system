# 工单管理系统 - API接口设计文档

**文档类型**: API接口设计文档  
**文档版本**: v1.0  
**创建日期**: 2026-09-06  
**设计者**: Backend Architect Agent  
**项目名称**: 工单管理系统  
**API规范**: RESTful API + OpenAPI 3.0

---

## 目录

1. [API设计规范](#1-api设计规范)
2. [认证与鉴权](#2-认证与鉴权)
3. [通用响应格式](#3-通用响应格式)
4. [错误码定义](#4-错误码定义)
5. [接口清单](#5-接口清单)
6. [接口详细定义](#6-接口详细定义)

---

## 1. API设计规范

### 1.1 基础规范

| 规范项 | 说明 |
|--------|------|
| **协议** | HTTPS（生产环境强制） |
| **域名** | `https://api.example.com` |
| **版本** | URL路径版本：`/api/v1/` |
| **格式** | 请求和响应均为JSON格式 |
| **字符编码** | UTF-8 |
| **时间格式** | ISO 8601：`2026-09-06T10:15:30.123Z` |
| **分页** | 游标分页（cursor）或偏移分页（page） |
| **排序** | 查询参数：`?sort=createdAt:desc` |
| **筛选** | 查询参数：`?status=processing&priority=high` |

### 1.2 RESTful规范

#### HTTP方法语义

| 方法 | 语义 | 幂等性 | 安全性 |
|------|------|--------|--------|
| GET | 获取资源 | ✅ | ✅ |
| POST | 创建资源 | ❌ | ❌ |
| PUT | 完整更新资源 | ✅ | ❌ |
| PATCH | 部分更新资源 | ❌ | ❌ |
| DELETE | 删除资源 | ✅ | ❌ |

#### URL命名规范

```
✅ 正确示例：
GET    /api/v1/tickets              # 获取工单列表
GET    /api/v1/tickets/:id          # 获取工单详情
POST   /api/v1/tickets              # 创建工单
PATCH  /api/v1/tickets/:id          # 更新工单
DELETE /api/v1/tickets/:id          # 删除工单
POST   /api/v1/tickets/:id/assign   # 分配工单（子资源操作）

❌ 错误示例：
GET /api/v1/getTickets               # 不要在URL中使用动词
POST /api/v1/tickets/create          # 不要用POST+create，直接POST
GET /api/v1/ticket                   # 使用复数形式
```

### 1.3 请求头规范

```http
# 通用请求头
Content-Type: application/json
Accept: application/json
Authorization: Bearer <access_token>
X-Request-ID: <uuid>                  # 请求追踪ID（可选）

# 分页请求头
X-Page: 1
X-Limit: 20

# 语言请求头（国际化）
Accept-Language: zh-CN
```

### 1.4 响应头规范

```http
# 通用响应头
Content-Type: application/json; charset=utf-8
X-Request-ID: <uuid>                  # 回传请求ID
X-RateLimit-Limit: 100               # 限流总数
X-RateLimit-Remaining: 95            # 剩余请求数
X-RateLimit-Reset: 1694000000        # 重置时间戳

# 分页响应头
X-Total-Count: 150                   # 总记录数
X-Page: 1                            # 当前页
X-Per-Page: 20                       # 每页数量
```

---

## 2. 认证与鉴权

### 2.1 JWT Token认证

#### 认证流程

```
1. 用户登录 → 服务器验证 → 返回Access Token + Refresh Token
2. 后续请求携带Access Token：Authorization: Bearer <token>
3. Token过期 → 使用Refresh Token刷新 → 获取新Access Token
```

#### Token结构

**Access Token（短期，15分钟）**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_123",
    "userId": "user_123",
    "username": "zhangsan",
    "role": "handler",
    "iat": 1694000000,
    "exp": 1694000900
  }
}
```

**Refresh Token（长期，7天）**:
```json
{
  "payload": {
    "sub": "user_123",
    "tokenId": "refresh_abc123",
    "iat": 1694000000,
    "exp": 1694604800
  }
}
```

### 2.2 权限控制

#### 基于角色的访问控制（RBAC）

| 角色 | 代码 | 说明 |
|------|------|------|
| 创建者 | `creator` | 创建工单，查看自己的工单 |
| 处理人 | `handler` | 处理分配给自己的工单 |
| 审核人/主管 | `reviewer` | 审核工单 |
| 领导 | `leader` | 最终审批 |
| 管理员 | `admin` | 全部权限 |

#### 权限检查

接口需在文档中标注所需角色：

```
POST /api/v1/tickets/:id/assign
权限：admin
说明：只有管理员可以分配工单
```

---

## 3. 通用响应格式

### 3.1 成功响应

```json
{
  "success": true,
  "data": { /* 业务数据 */ },
  "message": "操作成功",
  "timestamp": "2026-09-06T10:15:30.123Z",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3.2 错误响应

```json
{
  "success": false,
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "工单不存在",
    "details": {
      "ticketId": "TK202609060001"
    }
  },
  "timestamp": "2026-09-06T10:15:30.123Z",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 3.3 分页响应

```json
{
  "success": true,
  "data": {
    "items": [ /* 数据列表 */ ],
    "pagination": {
      "total": 150,
      "page": 1,
      "perPage": 20,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false,
      "nextCursor": "eyJpZCI6IjEyMyJ9"
    }
  },
  "message": "查询成功",
  "timestamp": "2026-09-06T10:15:30.123Z"
}
```

---

## 4. 错误码定义

### 4.1 HTTP状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功，无返回内容 |
| 400 | Bad Request | 参数错误、验证失败 |
| 401 | Unauthorized | 未认证、Token无效 |
| 403 | Forbidden | 无权限访问 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突（重复创建） |
| 422 | Unprocessable Entity | 业务逻辑错误 |
| 429 | Too Many Requests | 请求过于频繁 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用 |

### 4.2 业务错误码

```typescript
enum ErrorCode {
  // 认证相关（1000-1099）
  INVALID_CREDENTIALS = 'AUTH_1001',       // 用户名或密码错误
  TOKEN_EXPIRED = 'AUTH_1002',             // Token已过期
  TOKEN_INVALID = 'AUTH_1003',             // Token无效
  ACCOUNT_LOCKED = 'AUTH_1004',            // 账号已锁定
  INSUFFICIENT_PERMISSIONS = 'AUTH_1005',  // 权限不足

  // 用户相关（2000-2099）
  USER_NOT_FOUND = 'USER_2001',            // 用户不存在
  USER_ALREADY_EXISTS = 'USER_2002',       // 用户已存在
  USER_DISABLED = 'USER_2003',             // 用户已禁用

  // 工单相关（3000-3099）
  TICKET_NOT_FOUND = 'TICKET_3001',        // 工单不存在
  TICKET_STATUS_INVALID = 'TICKET_3002',   // 工单状态不允许此操作
  TICKET_ALREADY_ASSIGNED = 'TICKET_3003', // 工单已被分配
  TICKET_NOT_ASSIGNED = 'TICKET_3004',     // 工单未分配
  TICKET_CANNOT_EDIT = 'TICKET_3005',      // 工单不可编辑（已锁定）

  // 分配相关（4000-4099）
  ASSIGNEE_NOT_FOUND = 'ASSIGN_4001',      // 处理人不存在
  ASSIGNEE_NOT_AVAILABLE = 'ASSIGN_4002',  // 处理人不可用

  // 审核相关（5000-5099）
  REVIEW_NOT_ALLOWED = 'REVIEW_5001',      // 不允许审核（非待审核状态）
  REVIEW_ALREADY_EXISTS = 'REVIEW_5002',   // 已审核过

  // 文件相关（6000-6099）
  FILE_TOO_LARGE = 'FILE_6001',            // 文件过大
  FILE_TYPE_NOT_ALLOWED = 'FILE_6002',     // 文件类型不允许
  FILE_NOT_FOUND = 'FILE_6003',            // 文件不存在

  // 系统相关（9000-9099）
  INTERNAL_ERROR = 'SYS_9001',             // 系统内部错误
  DATABASE_ERROR = 'SYS_9002',             // 数据库错误
  EXTERNAL_SERVICE_ERROR = 'SYS_9003',     // 外部服务错误
}
```

---

## 5. 接口清单

### 5.1 按模块分类

#### 认证模块（/api/v1/auth）

| 方法 | 路径 | 说明 | 需求编号 |
|------|------|------|----------|
| POST | /auth/register | 用户注册 | - |
| POST | /auth/login | 用户登录 | - |
| POST | /auth/logout | 用户登出 | - |
| POST | /auth/refresh | 刷新Token | - |
| GET | /auth/me | 获取当前用户信息 | - |

#### 用户模块（/api/v1/users）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /users | 用户列表 | admin |
| GET | /users/:id | 用户详情 | admin |
| POST | /users | 创建用户 | admin |
| PATCH | /users/:id | 更新用户 | admin |
| DELETE | /users/:id | 删除用户 | admin |
| GET | /users/:id/tickets | 用户的工单列表 | 本人/admin |

#### 工单模块（/api/v1/tickets）

| 方法 | 路径 | 说明 | 需求编号 | 权限 |
|------|------|------|----------|------|
| GET | /tickets | 工单列表 | REQ-14 | all |
| GET | /tickets/:id | 工单详情 | REQ-15 | 相关人员 |
| POST | /tickets | 创建工单 | REQ-01 | all |
| PATCH | /tickets/:id | 更新工单 | - | creator |
| DELETE | /tickets/:id | 删除工单（草稿） | - | creator |
| POST | /tickets/:id/submit | 提交工单 | REQ-02 | creator |
| POST | /tickets/:id/assign | 分配工单 | REQ-04 | admin |
| POST | /tickets/:id/process | 更新处理进度 | REQ-07 | handler |
| POST | /tickets/:id/submit-result | 提交处理结果 | REQ-08 | handler |
| POST | /tickets/:id/review | 审核工单 | REQ-10 | reviewer |
| POST | /tickets/:id/close | 关闭工单 | REQ-12 | system/admin |
| POST | /tickets/:id/cancel | 强制关闭 | REQ-13 | admin |
| GET | /tickets/:id/logs | 工单操作日志 | - | 相关人员 |
| GET | /tickets/:id/attachments | 工单附件列表 | - | 相关人员 |

#### 附件模块（/api/v1/attachments）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | /attachments/upload | 上传附件 | all |
| GET | /attachments/:id | 下载附件 | 相关人员 |
| DELETE | /attachments/:id | 删除附件 | 上传者/admin |

#### 通知模块（/api/v1/notifications）

| 方法 | 路径 | 说明 | 需求编号 | 权限 |
|------|------|------|----------|------|
| GET | /notifications | 我的通知列表 | REQ-17 | 本人 |
| GET | /notifications/unread-count | 未读数量 | REQ-17 | 本人 |
| PATCH | /notifications/:id/read | 标记已读 | - | 本人 |
| PATCH | /notifications/read-all | 全部标记已读 | - | 本人 |

#### 统计报表模块（/api/v1/reports）

| 方法 | 路径 | 说明 | 需求编号 | 权限 |
|------|------|------|----------|------|
| GET | /reports/dashboard | 统计看板 | REQ-16 | admin/reviewer |
| GET | /reports/tickets-by-status | 按状态统计 | REQ-16 | admin/reviewer |
| GET | /reports/tickets-by-priority | 按优先级统计 | REQ-16 | admin/reviewer |
| GET | /reports/tickets-by-category | 按类别统计 | REQ-16 | admin/reviewer |
| GET | /reports/handler-workload | 处理人工作量 | REQ-16 | admin/reviewer |
| GET | /reports/performance | 性能指标 | REQ-16 | admin |
| POST | /reports/export | 导出报表 | REQ-16 | admin/reviewer |

#### 系统配置模块（/api/v1/config）

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | /config/categories | 工单类别列表 | all |
| GET | /config/priorities | 优先级列表 | all |
| GET | /config/statuses | 状态列表 | all |
| PATCH | /config/system | 更新系统配置 | admin |

---

## 6. 接口详细定义

### 6.1 认证模块

#### 6.1.1 用户登录

**接口**: `POST /api/v1/auth/login`  
**权限**: 无需认证  
**限流**: 5次/分钟/IP

**请求参数**:
```json
{
  "username": "zhangsan",
  "password": "Password123!"
}
```

**请求验证**:
```typescript
class LoginDto {
  @IsString()
  @Length(3, 50)
  username: string;

  @IsString()
  @Length(6, 100)
  password: string;
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "username": "zhangsan",
      "realName": "张三",
      "email": "zhangsan@example.com",
      "role": "handler",
      "department": "技术部"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "message": "登录成功",
  "timestamp": "2026-09-06T10:15:30.123Z"
}
```

**错误响应**:
```json
// 401 - 凭据错误
{
  "success": false,
  "error": {
    "code": "AUTH_1001",
    "message": "用户名或密码错误"
  }
}

// 403 - 账号锁定
{
  "success": false,
  "error": {
    "code": "AUTH_1004",
    "message": "账号已锁定，请15分钟后再试",
    "details": {
      "lockUntil": "2026-09-06T10:30:00.000Z"
    }
  }
}
```

---

#### 6.1.2 刷新Token

**接口**: `POST /api/v1/auth/refresh`  
**权限**: 无需认证

**请求参数**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

---

#### 6.1.3 获取当前用户信息

**接口**: `GET /api/v1/auth/me`  
**权限**: 需要认证

**请求头**:
```
Authorization: Bearer <access_token>
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "username": "zhangsan",
    "realName": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "role": "handler",
    "department": "技术部",
    "status": "active",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

---

### 6.2 工单模块

#### 6.2.1 创建工单（REQ-01）

**接口**: `POST /api/v1/tickets`  
**权限**: 所有角色  
**需求**: REQ-01 工单信息录入

**请求参数**:
```json
{
  "title": "办公电脑无法连接网络",
  "description": "今天早上9点开始，办公电脑无法连接公司内网，已尝试重启路由器，问题依旧存在。",
  "priority": "high",
  "category": "技术支持",
  "expectedFinishTime": "2026-09-07T18:00:00.000Z",
  "attachments": [
    "file_abc123",
    "file_def456"
  ],
  "tags": ["网络", "紧急"]
}
```

**请求验证**:
```typescript
class CreateTicketDto {
  @IsString()
  @Length(1, 100)
  title: string;

  @IsString()
  @Length(1, 2000)
  description: string;

  @IsEnum(Priority)
  priority: Priority; // urgent | high | medium | low

  @IsString()
  @Length(1, 50)
  category: string;

  @IsOptional()
  @IsISO8601()
  expectedFinishTime?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
```

**成功响应（201）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "title": "办公电脑无法连接网络",
    "description": "今天早上9点开始...",
    "priority": "high",
    "category": "技术支持",
    "status": "pending_assign",
    "creator": {
      "id": "user_123",
      "realName": "张三"
    },
    "expectedFinishTime": "2026-09-07T18:00:00.000Z",
    "attachments": [
      {
        "id": "file_abc123",
        "fileName": "screenshot.png",
        "url": "/api/v1/attachments/file_abc123"
      }
    ],
    "createdAt": "2026-09-06T10:15:30.123Z",
    "updatedAt": "2026-09-06T10:15:30.123Z"
  },
  "message": "工单创建成功"
}
```

**错误响应**:
```json
// 400 - 参数验证失败
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数验证失败",
    "details": {
      "title": "标题长度不能超过100个字符",
      "priority": "优先级必须是 urgent、high、medium 或 low"
    }
  }
}
```

---

#### 6.2.2 工单列表（REQ-14）

**接口**: `GET /api/v1/tickets`  
**权限**: 所有角色（按权限过滤）  
**需求**: REQ-14 工单查询

**查询参数**:
```
?page=1
&limit=20
&status=processing,pending_review
&priority=high,urgent
&category=技术支持
&creatorId=user_123
&assigneeId=user_456
&keyword=网络
&startDate=2026-09-01
&endDate=2026-09-06
&sort=createdAt:desc
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | number | 否 | 页码，默认1 |
| limit | number | 否 | 每页数量，默认20，最大100 |
| status | string | 否 | 状态筛选，多个逗号分隔 |
| priority | string | 否 | 优先级筛选 |
| category | string | 否 | 类别筛选 |
| creatorId | string | 否 | 创建人ID |
| assigneeId | string | 否 | 处理人ID |
| keyword | string | 否 | 关键词搜索（标题、描述） |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |
| sort | string | 否 | 排序，格式：字段:方向 |

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "ticket_123abc",
        "ticketNo": "TK202609060001",
        "title": "办公电脑无法连接网络",
        "priority": "high",
        "status": "processing",
        "category": "技术支持",
        "creator": {
          "id": "user_123",
          "realName": "张三"
        },
        "assignee": {
          "id": "user_456",
          "realName": "李四"
        },
        "createdAt": "2026-09-06T10:15:30.123Z",
        "updatedAt": "2026-09-06T11:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "perPage": 20,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

#### 6.2.3 工单详情（REQ-15）

**接口**: `GET /api/v1/tickets/:id`  
**权限**: 相关人员（创建者、处理人、审核人、管理员）  
**需求**: REQ-15 工单详情查看

**路径参数**:
- `id`: 工单ID

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "title": "办公电脑无法连接网络",
    "description": "今天早上9点开始，办公电脑无法连接公司内网...",
    "priority": "high",
    "status": "processing",
    "category": "技术支持",
    "creator": {
      "id": "user_123",
      "realName": "张三",
      "department": "市场部"
    },
    "assignee": {
      "id": "user_456",
      "realName": "李四",
      "department": "技术部"
    },
    "reviewer": null,
    "expectedFinishTime": "2026-09-07T18:00:00.000Z",
    "actualFinishTime": null,
    "processingLogs": [
      {
        "id": "log_001",
        "userId": "user_456",
        "userName": "李四",
        "action": "process",
        "content": "已到现场检查，发现是网线接口松动",
        "progress": 50,
        "createdAt": "2026-09-06T11:30:00.000Z"
      }
    ],
    "reviews": [],
    "attachments": [
      {
        "id": "file_abc123",
        "fileName": "screenshot.png",
        "fileSize": 102400,
        "uploaderId": "user_123",
        "uploaderName": "张三",
        "url": "/api/v1/attachments/file_abc123",
        "createdAt": "2026-09-06T10:15:00.000Z"
      }
    ],
    "timeline": [
      {
        "id": "timeline_001",
        "action": "create",
        "actor": "张三",
        "oldStatus": null,
        "newStatus": "pending_assign",
        "description": "创建工单",
        "createdAt": "2026-09-06T10:15:30.123Z"
      },
      {
        "id": "timeline_002",
        "action": "assign",
        "actor": "管理员",
        "oldStatus": "pending_assign",
        "newStatus": "processing",
        "description": "分配给 李四",
        "createdAt": "2026-09-06T10:20:00.000Z"
      }
    ],
    "createdAt": "2026-09-06T10:15:30.123Z",
    "updatedAt": "2026-09-06T11:30:00.000Z"
  }
}
```

**错误响应**:
```json
// 404 - 工单不存在
{
  "success": false,
  "error": {
    "code": "TICKET_3001",
    "message": "工单不存在"
  }
}

// 403 - 无权查看
{
  "success": false,
  "error": {
    "code": "AUTH_1005",
    "message": "您没有权限查看此工单"
  }
}
```

---

#### 6.2.4 分配工单（REQ-04）

**接口**: `POST /api/v1/tickets/:id/assign`  
**权限**: admin  
**需求**: REQ-04 分配处理人员

**路径参数**:
- `id`: 工单ID

**请求参数**:
```json
{
  "assigneeId": "user_456",
  "note": "该工单需要紧急处理，请优先安排"
}
```

**请求验证**:
```typescript
class AssignTicketDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "status": "processing",
    "assignee": {
      "id": "user_456",
      "realName": "李四",
      "department": "技术部"
    },
    "assignedAt": "2026-09-06T10:20:00.000Z",
    "assignNote": "该工单需要紧急处理，请优先安排"
  },
  "message": "分配成功"
}
```

**错误响应**:
```json
// 422 - 状态不允许
{
  "success": false,
  "error": {
    "code": "TICKET_3002",
    "message": "当前工单状态不允许分配",
    "details": {
      "currentStatus": "closed"
    }
  }
}

// 404 - 处理人不存在
{
  "success": false,
  "error": {
    "code": "ASSIGN_4001",
    "message": "处理人不存在"
  }
}
```

---

#### 6.2.5 更新处理进度（REQ-07）

**接口**: `POST /api/v1/tickets/:id/process`  
**权限**: handler（分配给自己的工单）  
**需求**: REQ-07 工单处理与进度更新

**请求参数**:
```json
{
  "progress": 50,
  "note": "已到现场检查，发现是网线接口松动，正在更换网线",
  "attachments": ["file_xyz789"]
}
```

**请求验证**:
```typescript
class ProcessTicketDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;

  @IsString()
  @Length(1, 2000)
  note: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "status": "processing",
    "progress": 50,
    "log": {
      "id": "log_002",
      "content": "已到现场检查...",
      "progress": 50,
      "createdAt": "2026-09-06T11:45:00.000Z"
    }
  },
  "message": "进度更新成功"
}
```

---

#### 6.2.6 提交处理结果（REQ-08）

**接口**: `POST /api/v1/tickets/:id/submit-result`  
**权限**: handler（分配给自己的工单）  
**需求**: REQ-08 提交处理结果

**请求参数**:
```json
{
  "resultDescription": "已更换新网线并重新配置网络，现在可以正常连接内网。测试访问各系统均正常。",
  "actualWorkHours": 1.5,
  "attachments": ["file_result001"]
}
```

**请求验证**:
```typescript
class SubmitResultDto {
  @IsString()
  @Length(1, 2000)
  resultDescription: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  actualWorkHours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "status": "pending_review",
    "progress": 100,
    "result": {
      "description": "已更换新网线...",
      "actualWorkHours": 1.5,
      "submittedAt": "2026-09-06T12:00:00.000Z"
    }
  },
  "message": "处理结果已提交，等待审核"
}
```

**错误响应**:
```json
// 422 - 进度未完成
{
  "success": false,
  "error": {
    "code": "TICKET_3002",
    "message": "进度必须达到100%才能提交处理结果",
    "details": {
      "currentProgress": 50
    }
  }
}
```

---

#### 6.2.7 审核工单（REQ-10）

**接口**: `POST /api/v1/tickets/:id/review`  
**权限**: reviewer, leader  
**需求**: REQ-10 审核处理结果

**请求参数**:
```json
{
  "result": "approved",
  "comment": "处理及时，问题解决彻底，同意通过。"
}
```

或驳回：
```json
{
  "result": "rejected",
  "comment": "需要补充测试报告，确认其他设备网络是否正常。"
}
```

**请求验证**:
```typescript
class ReviewTicketDto {
  @IsEnum(['approved', 'rejected'])
  result: 'approved' | 'rejected';

  @IsString()
  @Length(1, 1000)
  comment: string;
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "status": "completed",  // 或 "rejected"
    "review": {
      "id": "review_001",
      "reviewer": {
        "id": "user_789",
        "realName": "王五"
      },
      "result": "approved",
      "comment": "处理及时，问题解决彻底，同意通过。",
      "reviewedAt": "2026-09-06T14:00:00.000Z"
    }
  },
  "message": "审核完成"
}
```

---

#### 6.2.8 强制关闭工单（REQ-13）

**接口**: `POST /api/v1/tickets/:id/cancel`  
**权限**: admin  
**需求**: REQ-13 强制关闭工单

**请求参数**:
```json
{
  "reason": "重复工单，实际问题已在TK202609060003中处理"
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "id": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "status": "cancelled",
    "cancelReason": "重复工单，实际问题已在TK202609060003中处理",
    "cancelledBy": "admin_001",
    "cancelledAt": "2026-09-06T15:00:00.000Z"
  },
  "message": "工单已强制关闭"
}
```

---

### 6.3 附件模块

#### 6.3.1 上传附件

**接口**: `POST /api/v1/attachments/upload`  
**权限**: 所有角色  
**Content-Type**: `multipart/form-data`

**请求参数**:
```
POST /api/v1/attachments/upload
Content-Type: multipart/form-data

file: <binary>
```

**限制**:
- 单个文件 ≤ 10MB
- 允许类型: jpg, png, gif, pdf, doc, docx, xls, xlsx, zip, rar
- 同时上传最多10个文件

**成功响应（201）**:
```json
{
  "success": true,
  "data": {
    "id": "file_abc123",
    "fileName": "screenshot.png",
    "originalName": "屏幕截图 2026-09-06.png",
    "mimeType": "image/png",
    "fileSize": 102400,
    "url": "/api/v1/attachments/file_abc123",
    "uploaderId": "user_123",
    "createdAt": "2026-09-06T10:10:00.000Z"
  },
  "message": "文件上传成功"
}
```

**错误响应**:
```json
// 400 - 文件过大
{
  "success": false,
  "error": {
    "code": "FILE_6001",
    "message": "文件大小不能超过10MB",
    "details": {
      "fileSize": 12582912,
      "maxSize": 10485760
    }
  }
}

// 400 - 文件类型不允许
{
  "success": false,
  "error": {
    "code": "FILE_6002",
    "message": "文件类型不允许",
    "details": {
      "mimeType": "application/x-msdownload",
      "allowedTypes": ["image/jpeg", "image/png", "..."]
    }
  }
}
```

---

#### 6.3.2 下载附件

**接口**: `GET /api/v1/attachments/:id`  
**权限**: 相关人员

**路径参数**:
- `id`: 附件ID

**查询参数**:
```
?download=true        # 强制下载，不预览
&thumbnail=true       # 返回缩略图（仅图片）
```

**成功响应（200）**:
```
Content-Type: image/png
Content-Disposition: inline; filename="screenshot.png"
Content-Length: 102400

<binary data>
```

或下载：
```
Content-Type: image/png
Content-Disposition: attachment; filename="screenshot.png"
Content-Length: 102400

<binary data>
```

---

### 6.4 通知模块

#### 6.4.1 我的通知列表（REQ-17）

**接口**: `GET /api/v1/notifications`  
**权限**: 本人  
**需求**: REQ-17 消息通知机制

**查询参数**:
```
?page=1
&limit=20
&read=false          # 筛选未读
&type=ticket_assigned
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "notif_001",
        "type": "ticket_assigned",
        "title": "新工单分配",
        "content": "您有一个新工单：【办公电脑无法连接网络】，优先级：高",
        "relatedResource": {
          "type": "ticket",
          "id": "ticket_123abc",
          "ticketNo": "TK202609060001"
        },
        "isRead": false,
        "createdAt": "2026-09-06T10:20:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "perPage": 20
    }
  }
}
```

---

#### 6.4.2 未读数量

**接口**: `GET /api/v1/notifications/unread-count`  
**权限**: 本人

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "unreadCount": 5
  }
}
```

---

### 6.5 统计报表模块

#### 6.5.1 统计看板（REQ-16）

**接口**: `GET /api/v1/reports/dashboard`  
**权限**: admin, reviewer  
**需求**: REQ-16 统计报表

**查询参数**:
```
?startDate=2026-09-01
&endDate=2026-09-06
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 150,
      "pending": 10,
      "processing": 35,
      "pendingReview": 15,
      "completed": 80,
      "cancelled": 10
    },
    "byPriority": {
      "urgent": 5,
      "high": 30,
      "medium": 80,
      "low": 35
    },
    "byCategory": {
      "技术支持": 60,
      "设备报修": 40,
      "行政事务": 30,
      "其他": 20
    },
    "performance": {
      "avgProcessingTime": 4.5,      // 小时
      "avgReviewTime": 2.1,           // 小时
      "onTimeCompletionRate": 0.85,   // 85%
      "rejectionRate": 0.12           // 12%
    },
    "topHandlers": [
      {
        "userId": "user_456",
        "realName": "李四",
        "ticketCount": 25,
        "avgProcessingTime": 3.8
      }
    ]
  }
}
```

---

#### 6.5.2 导出报表（REQ-16）

**接口**: `POST /api/v1/reports/export`  
**权限**: admin, reviewer  
**需求**: REQ-16 统计报表

**请求参数**:
```json
{
  "reportType": "tickets",
  "format": "excel",
  "filters": {
    "startDate": "2026-09-01",
    "endDate": "2026-09-06",
    "status": ["completed", "closed"]
  }
}
```

**成功响应（200）**:
```json
{
  "success": true,
  "data": {
    "downloadUrl": "/api/v1/reports/download/report_abc123.xlsx",
    "expiresAt": "2026-09-06T18:00:00.000Z"
  },
  "message": "报表生成成功"
}
```

---

## 7. WebSocket实时通知

### 7.1 连接

**端点**: `wss://api.example.com/ws`  
**认证**: 连接时携带Token

```javascript
const socket = io('wss://api.example.com', {
  auth: {
    token: 'Bearer <access_token>'
  }
});

socket.on('connect', () => {
  console.log('Connected to notification service');
});
```

### 7.2 事件类型

```typescript
// 客户端监听事件
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

socket.on('ticket.updated', (data) => {
  console.log('Ticket updated:', data);
});

socket.on('ticket.assigned', (data) => {
  console.log('Ticket assigned:', data);
});
```

### 7.3 消息格式

```json
{
  "event": "ticket.assigned",
  "data": {
    "ticketId": "ticket_123abc",
    "ticketNo": "TK202609060001",
    "title": "办公电脑无法连接网络",
    "assigneeId": "user_456",
    "message": "您有一个新工单需要处理"
  },
  "timestamp": "2026-09-06T10:20:00.000Z"
}
```

---

## 8. API版本管理

### 8.1 版本策略

- **当前版本**: v1
- **URL路径版本**: `/api/v1/`
- **向后兼容**: 同一版本内保持兼容
- **废弃通知**: 提前3个月通知

### 8.2 版本升级

当出现以下情况时升级版本：
- 删除字段
- 修改字段类型
- 修改响应结构
- 修改错误码

兼容性变更（不升级版本）：
- 新增字段
- 新增接口
- 新增错误码

---

## 9. 限流策略

### 9.1 全局限流

| 用户角色 | QPS | 突发 |
|----------|-----|------|
| 普通用户 | 100/分钟 | 120 |
| 管理员 | 200/分钟 | 240 |

### 9.2 接口级限流

| 接口 | 限流 | 说明 |
|------|------|------|
| POST /auth/login | 5/分钟/IP | 防暴力破解 |
| POST /attachments/upload | 20/分钟 | 防滥用 |
| GET /tickets | 60/分钟 | 防爬虫 |

### 9.3 限流响应

**HTTP 429 Too Many Requests**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁，请稍后再试",
    "details": {
      "retryAfter": 60
    }
  }
}
```

响应头：
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1694000060
Retry-After: 60
```

---

## 10. API测试

### 10.1 Postman Collection

提供Postman集合文件：`postman_collection.json`

### 10.2 Swagger文档

访问地址：`http://localhost:3000/api/docs`

### 10.3 测试环境

- **开发环境**: `https://dev-api.example.com`
- **测试环境**: `https://test-api.example.com`
- **生产环境**: `https://api.example.com`

---

## 附录

### A. 需求与接口映射表

| 需求编号 | 需求名称 | 接口 |
|----------|----------|------|
| REQ-01 | 工单信息录入 | POST /tickets |
| REQ-02 | 工单提交与校验 | POST /tickets/:id/submit |
| REQ-03 | 工单接收与查看 | GET /tickets |
| REQ-04 | 分配处理人员 | POST /tickets/:id/assign |
| REQ-05 | 自动分配规则 | 内部逻辑，无接口 |
| REQ-06 | 接收工单通知 | WebSocket |
| REQ-07 | 工单处理与进度更新 | POST /tickets/:id/process |
| REQ-08 | 提交处理结果 | POST /tickets/:id/submit-result |
| REQ-09 | 审核工单列表 | GET /tickets?status=pending_review |
| REQ-10 | 审核处理结果 | POST /tickets/:id/review |
| REQ-11 | 二级审批 | POST /tickets/:id/review |
| REQ-12 | 自动关闭工单 | 内部逻辑，无接口 |
| REQ-13 | 强制关闭工单 | POST /tickets/:id/cancel |
| REQ-14 | 工单查询 | GET /tickets |
| REQ-15 | 工单详情查看 | GET /tickets/:id |
| REQ-16 | 统计报表 | GET /reports/* |
| REQ-17 | 消息通知机制 | GET /notifications, WebSocket |
| REQ-18 | 催办提醒机制 | 内部定时任务，WebSocket通知 |

### B. 状态流转规则

```
pending_assign → processing → pending_review → completed → closed
                                      ↓
                                  rejected → processing
任何状态 → cancelled（强制）
```

---

**文档状态**: ✅ 已完成  
**接口总数**: 40+  
**下一步**: 后端开发规范文档编写

**审核人**: _________  
**审核日期**: _________
