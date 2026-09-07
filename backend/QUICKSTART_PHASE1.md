# 方案B第一阶段 - 快速开始指南

## 🚀 快速启动

### 1. 初始化数据库

```bash
# 生成Prisma Client
npm run prisma:generate

# 应用数据库schema
npx prisma db push

# 初始化角色和权限
npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts

# 创建测试用户
npx ts-node src/modules/approval/seeds/test-users.seed.ts
```

### 2. 启动服务器

```bash
# 开发模式
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

### 3. 运行集成测试

```bash
chmod +x test-integration-phase1.sh
./test-integration-phase1.sh
```

---

## 👥 测试账号

| 用户名 | 密码 | 角色 | 权限 |
|--------|------|------|------|
| reporter1 | Test1234 | 报修人 | 创建工单 |
| vice_director1 | Test1234 | 副主任/主管 | 审核报修、预算，发起立项 |
| dept_manager1 | Test1234 | 部门主管 | 立项一级审核 |
| vice_leader1 | Test1234 | 分管领导 | 立项二级审核 |
| top_leader1 | Test1234 | 一把手 | 立项终审 |
| contractor1 | Test1234 | 乙方维修人员 | 编制预算 |

---

## 📖 API文档

### 认证

```bash
# 登录
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "reporter1",
  "password": "Test1234"
}

# 响应
{
  "user": {...},
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### 工单管理

```bash
# 创建工单（报修人）
POST /api/v1/tickets
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "教学楼A栋301教室空调故障",
  "description": "空调无法启动",
  "type": "ISSUE",
  "priority": "HIGH"
}

# 副主任审核报修
POST /api/v1/tickets/{id}/review
Authorization: Bearer {token}
Content-Type: application/json

{
  "approved": true,
  "comment": "同意维修"
}
```

### 预算管理

```bash
# 乙方提交预算
POST /api/v1/budgets/ticket/{ticketId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "amount": 3500.00,
  "description": "空调维修预算明细...",
  "attachments": ["https://example.com/budget.pdf"]
}

# 副主任审核预算
POST /api/v1/budgets/{id}/review
Authorization: Bearer {token}
Content-Type: application/json

{
  "approved": true,
  "comment": "预算合理"
}

# 查询预算
GET /api/v1/budgets/ticket/{ticketId}
Authorization: Bearer {token}
```

### 立项管理

```bash
# 副主任发起立项
POST /api/v1/projects/ticket/{ticketId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "教学楼A栋空调维修立项",
  "plannedStartDate": "2026-09-10",
  "plannedDuration": 3,
  "contractorName": "华建维修公司",
  "description": "空调压缩机及电路板更换"
}

# 查询立项
GET /api/v1/projects/ticket/{ticketId}
Authorization: Bearer {token}

# 更新立项
PATCH /api/v1/projects/ticket/{ticketId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "更新后的标题"
}
```

### 审批流程

```bash
# 查询工单的审批流程
GET /api/v1/approvals/ticket/{ticketId}
Authorization: Bearer {token}

# 查询我的待审批列表
GET /api/v1/approvals/pending
Authorization: Bearer {token}

# 审批通过
POST /api/v1/approvals/{flowId}/steps/{stepNumber}/approve
Authorization: Bearer {token}
Content-Type: application/json

{
  "comment": "同意"  # 可选
}

# 审批驳回
POST /api/v1/approvals/{flowId}/steps/{stepNumber}/reject
Authorization: Bearer {token}
Content-Type: application/json

{
  "comment": "不同意，理由是..."  # 必填
}
```

---

## 🔄 完整流程示例

### 场景：教学楼空调维修

#### 第1步：报修人创建工单
```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer {reporter_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "教学楼A栋301教室空调故障",
    "description": "空调无法启动，请维修",
    "type": "ISSUE",
    "priority": "HIGH"
  }'
```

#### 第2步：副主任审核报修
```bash
curl -X POST http://localhost:3000/api/v1/tickets/1/review \
  -H "Authorization: Bearer {vice_director_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "comment": "同意维修"
  }'
```

#### 第3步：乙方提交预算
```bash
curl -X POST http://localhost:3000/api/v1/budgets/ticket/1 \
  -H "Authorization: Bearer {contractor_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 3500.00,
    "description": "空调维修预算：更换压缩机2000元，人工500元"
  }'
```

#### 第4步：副主任审核预算
```bash
curl -X POST http://localhost:3000/api/v1/budgets/1/review \
  -H "Authorization: Bearer {vice_director_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "approved": true,
    "comment": "预算合理"
  }'
```

#### 第5步：副主任发起立项
```bash
curl -X POST http://localhost:3000/api/v1/projects/ticket/1 \
  -H "Authorization: Bearer {vice_director_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "教学楼A栋空调维修立项",
    "plannedStartDate": "2026-09-10",
    "plannedDuration": 3,
    "contractorName": "华建维修公司"
  }'
```

#### 第6步：查询待审批
```bash
# 部门主管查询待审批
curl -X GET http://localhost:3000/api/v1/approvals/pending \
  -H "Authorization: Bearer {dept_manager_token}"
```

#### 第7步：部门主管一级审核
```bash
curl -X POST http://localhost:3000/api/v1/approvals/1/steps/1/approve \
  -H "Authorization: Bearer {dept_manager_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "项目必要，同意"
  }'
```

#### 第8步：分管领导二级审核
```bash
curl -X POST http://localhost:3000/api/v1/approvals/1/steps/2/approve \
  -H "Authorization: Bearer {vice_leader_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "教学设施重要，同意"
  }'
```

#### 第9步：一把手终审
```bash
curl -X POST http://localhost:3000/api/v1/approvals/1/steps/3/approve \
  -H "Authorization: Bearer {top_leader_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "comment": "同意立项，尽快完成"
  }'
```

#### 第10步：查询最终状态
```bash
curl -X GET http://localhost:3000/api/v1/approvals/ticket/1 \
  -H "Authorization: Bearer {reporter_token}"
```

---

## 🎯 审批流程配置

### 报修审核（单级）
```
报修人 → 副主任审核 → 完成
```

### 预算审核（单级）
```
乙方 → 副主任审核 → 完成
```

### 立项审批（三级）
```
副主任发起 → 部门主管审核 → 分管领导审核 → 一把手终审 → 完成
```

### 逐级驳回示例
```
场景1: 一把手驳回
  当前步骤: 3 (一把手)
  驳回后: 退回到步骤2 (分管领导)
  分管领导重新审核通过后，再次到一把手

场景2: 分管领导驳回
  当前步骤: 2 (分管领导)
  驳回后: 退回到步骤1 (部门主管)
  部门主管重新审核通过后，到分管领导

场景3: 部门主管驳回
  当前步骤: 1 (部门主管)
  驳回后: 流程结束，状态为REJECTED
  通知副主任（发起人）
```

---

## 📊 数据库结构

### 核心表

- **approval_flows**: 审批流程主表
- **approval_steps**: 审批步骤表
- **budgets**: 预算表
- **projects**: 立项表
- **tickets**: 工单表（扩展）

### 关键字段

**tickets**:
- `current_phase`: 当前阶段 (REPAIR, BUDGET, PROJECT, etc.)
- `current_step`: 当前步骤编号

**approval_flows**:
- `type`: 审批类型 (REPAIR_REVIEW, BUDGET_REVIEW, PROJECT_APPROVAL)
- `status`: 流程状态 (PENDING, APPROVED, REJECTED)
- `current_step`: 当前步骤

**approval_steps**:
- `step_number`: 步骤编号 (1, 2, 3, ...)
- `status`: 步骤状态 (PENDING, APPROVED, REJECTED, SKIPPED)
- `approver_id`: 审批人ID
- `comment`: 审批意见

---

## 🛠️ 故障排查

### 问题1: 端口被占用
```bash
# 查找并杀死占用3000端口的进程
lsof -ti:3000 | xargs kill -9
```

### 问题2: 数据库连接失败
```bash
# 检查PostgreSQL是否运行
docker ps | grep postgres

# 检查.env配置
cat .env | grep DATABASE_URL
```

### 问题3: 角色权限错误
```bash
# 重新初始化角色和权限
npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts
```

### 问题4: 审批权限不足
确保用户已分配正确的角色：
```sql
SELECT u.username, r.name, r.code 
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'vice_director1';
```

---

## 📝 开发注意事项

1. **BigInt类型**: Prisma使用BigInt，需要用`Number()`转换
2. **事务处理**: 所有审批操作必须在事务中执行
3. **驳回原因**: 驳回时comment字段必填
4. **角色验证**: 每个审批操作前验证用户角色
5. **通知发送**: 审批后异步发送通知，不阻塞主流程

---

## 📚 更多文档

- 详细实施总结: `IMPLEMENTATION_SUMMARY_PHASE1.md`
- API文档: Swagger UI at http://localhost:3000/api-docs
- 数据库Schema: `prisma/schema.prisma`

---

## 🎉 功能清单

- ✅ 报修审核（单级）
- ✅ 预算审核（单级）
- ✅ 立项审批（三级）
- ✅ 逐级驳回机制
- ✅ 待审批列表
- ✅ 审批流程查询
- ✅ 基于角色的权限控制
- ✅ 通知集成
- ✅ 完整的API文档

---

**版本**: 1.0  
**日期**: 2026年9月7日
