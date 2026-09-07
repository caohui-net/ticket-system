# 第二阶段审批功能测试文档

## 功能概述

第二阶段实现了更灵活的审批引擎，支持：
1. **并行审批** - 多人同时审批
2. **条件分支** - 根据工单数据（金额、优先级等）动态选择审批路径
3. **审批模板** - 数据库驱动的灵活配置

---

## 1. 审批模板管理

### 1.1 创建审批模板

**接口**: `POST /api/v1/approval/templates`

**请求示例**:
```json
{
  "name": "立项审批模板（条件分支）",
  "description": "根据金额自动选择审批路径",
  "type": "PROJECT_APPROVAL",
  "isActive": true,
  "config": {
    "steps": [
      {
        "stepNumber": 1,
        "stepName": "部门主管审核",
        "stepType": "SEQUENTIAL",
        "approverRole": "DEPT_MANAGER"
      },
      {
        "stepNumber": 2,
        "stepName": "财务审核",
        "stepType": "SEQUENTIAL",
        "approverRole": "FINANCE",
        "condition": {
          "field": "amount",
          "operator": ">",
          "value": 10000
        }
      },
      {
        "stepNumber": 3,
        "stepName": "分管领导和财务总监联合审核",
        "stepType": "PARALLEL",
        "approvers": ["VICE_LEADER", "FINANCE_DIRECTOR"],
        "requireAllApprove": true,
        "condition": {
          "field": "amount",
          "operator": ">",
          "value": 50000
        }
      },
      {
        "stepNumber": 4,
        "stepName": "一把手终审",
        "stepType": "SEQUENTIAL",
        "approverRole": "TOP_LEADER"
      }
    ]
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "name": "立项审批模板（条件分支）",
    "type": "PROJECT_APPROVAL",
    "isActive": true,
    "config": { ... },
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  },
  "message": "模板创建成功"
}
```

---

### 1.2 查询模板列表

**接口**: `GET /api/v1/approval/templates`

**查询参数**:
- `type`: 审批类型（可选）
- `isActive`: 是否启用（可选）

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "立项审批模板（条件分支）",
      "type": "PROJECT_APPROVAL",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 1.3 启用/停用模板

**接口**: `POST /api/v1/approval/templates/:id/toggle`

---

## 2. 条件审批流程

### 2.1 使用模板创建流程

**接口**: `POST /api/v1/approvals/template/:templateId/ticket/:ticketId`

**场景1**: 金额 = 8000元（低于10000）
- 只执行：部门主管审核 → 一把手终审（跳过财务审核和联合审核）

**场景2**: 金额 = 30000元（10000 < 金额 < 50000）
- 执行：部门主管审核 → 财务审核 → 一把手终审（跳过联合审核）

**场景3**: 金额 = 80000元（高于50000）
- 执行全部步骤：部门主管审核 → 财务审核 → **并行审批**（分管领导+财务总监）→ 一把手终审

---

## 3. 并行审批

### 3.1 并行审批通过

**接口**: `POST /api/v1/approvals/:flowId/steps/:stepNumber/approve/parallel`

**请求体**:
```json
{
  "comment": "同意立项"
}
```

**流程说明**:
1. 第一个审批人提交后，步骤状态仍为 `PENDING`
2. 第二个审批人提交后（如果 `requireAllApprove: true`），步骤状态变为 `APPROVED`
3. 自动推进到下一步

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": "1",
    "currentStep": 3,
    "steps": [
      {
        "stepNumber": 3,
        "stepName": "分管领导和财务总监联合审核",
        "stepType": "PARALLEL",
        "status": "PENDING",
        "approvedBy": [
          {
            "userId": 10,
            "decision": "APPROVED",
            "comment": "同意立项",
            "time": "2024-01-01T10:00:00Z"
          }
        ]
      }
    ]
  },
  "message": "审批已提交"
}
```

---

### 3.2 并行审批驳回

**接口**: `POST /api/v1/approvals/:flowId/steps/:stepNumber/reject/parallel`

**请求体**:
```json
{
  "comment": "预算不合理，需要重新评估"
}
```

**流程说明**:
- 任何一人驳回，整个步骤立即驳回
- 退回到上一步（或第一步时驳回整个流程）

---

## 4. 测试场景

### 场景1: 低金额立项（顺序审批）

**步骤**:
1. 创建工单，预算金额 = 8000元
2. 提交预算
3. 使用模板创建立项流程
   ```
   POST /api/v1/approvals/template/1/ticket/123
   ```
4. 验证只有2个步骤：
   - 步骤1: 部门主管审核
   - 步骤2: 一把手终审

**预期结果**: 跳过财务审核和并行审批步骤

---

### 场景2: 高金额立项（包含并行审批）

**步骤**:
1. 创建工单，预算金额 = 80000元
2. 提交预算
3. 使用模板创建立项流程
4. 验证有4个步骤，第3步为并行审批

**并行审批测试**:
```bash
# 分管领导审批（第一个人）
curl -X POST http://localhost:3000/api/v1/approvals/1/steps/3/approve/parallel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "同意"}'

# 查询流程状态 - 应该仍在步骤3，等待第二个人
GET /api/v1/approvals/ticket/123

# 财务总监审批（第二个人）
curl -X POST http://localhost:3000/api/v1/approvals/1/steps/3/approve/parallel \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"comment": "同意"}'

# 查询流程状态 - 应该推进到步骤4
GET /api/v1/approvals/ticket/123
```

**预期结果**: 
- 第一个人审批后，步骤状态仍为 `PENDING`
- 第二个人审批后，步骤状态变为 `APPROVED`，推进到步骤4

---

### 场景3: 并行审批驳回

**步骤**:
1. 在步骤3（并行审批），第一个审批人驳回
   ```bash
   POST /api/v1/approvals/1/steps/3/reject/parallel
   {
     "comment": "预算不合理"
   }
   ```
2. 验证流程退回到步骤2（财务审核）

**预期结果**: 
- 步骤3状态变为 `REJECTED`
- 步骤2状态重置为 `PENDING`
- 通知步骤2的审批人

---

## 5. 数据库验证

### 验证步骤类型

```sql
SELECT 
  step_number,
  step_name,
  step_type,
  approver_role,
  approvers,
  require_all_approve,
  condition
FROM approval_steps
WHERE flow_id = 1
ORDER BY step_number;
```

**预期输出**（金额=80000时）:
```
step_number | step_name                  | step_type   | approvers
------------|----------------------------|-------------|---------------------------
1           | 部门主管审核                | SEQUENTIAL  | NULL
2           | 财务审核                    | SEQUENTIAL  | NULL
3           | 分管领导和财务总监联合审核   | PARALLEL    | [10, 11]
4           | 一把手终审                  | SEQUENTIAL  | NULL
```

---

### 验证并行审批记录

```sql
SELECT 
  step_number,
  step_name,
  approved_by,
  status
FROM approval_steps
WHERE flow_id = 1 AND step_number = 3;
```

**预期输出**（第一个人审批后）:
```json
{
  "approved_by": [
    {
      "userId": 10,
      "decision": "APPROVED",
      "comment": "同意立项",
      "time": "2024-01-01T10:00:00.000Z"
    }
  ],
  "status": "PENDING"
}
```

---

## 6. 注意事项

### 6.1 并行审批权限验证
- 只有在 `approvers` 列表中的用户才能审批
- 已审批的用户不能重复审批

### 6.2 条件评估
- 条件字段：`amount`（金额）、`priority`（优先级）、`type`（类型）
- 支持的操作符：`>`、`>=`、`<`、`<=`、`==`、`!=`、`in`

### 6.3 模板配置验证
- 顺序审批（SEQUENTIAL）必须指定 `approverRole`
- 并行审批（PARALLEL）必须指定 `approvers`
- 步骤编号必须连续

### 6.4 向后兼容
- 第一阶段的顺序审批流程仍然可用
- 旧的 `approve()` 和 `reject()` 方法仍然有效
- 新增的 `approveParallel()` 和 `rejectParallel()` 仅用于并行审批步骤

---

## 7. API权限要求

| 接口 | 权限 |
|------|------|
| 创建/编辑/删除模板 | `approval:manage` |
| 查询模板列表 | `approval:manage` |
| 使用模板创建流程 | 任何已认证用户 |
| 并行审批 | 需要在 `approvers` 列表中 |
| 顺序审批 | 需要对应的角色 |

---

## 8. 错误处理

### 常见错误

1. **审批步骤不存在**
   ```json
   {
     "success": false,
     "message": "审批步骤不存在"
   }
   ```

2. **不在审批人列表中**
   ```json
   {
     "success": false,
     "message": "您不在审批人列表中"
   }
   ```

3. **已经审批过了**
   ```json
   {
     "success": false,
     "message": "您已经审批过了"
   }
   ```

4. **步骤类型不匹配**
   ```json
   {
     "success": false,
     "message": "该步骤不是并行审批"
   }
   ```

---

## 9. 性能考虑

- 并行审批的 `approvedBy` 字段使用JSON存储，避免关联表查询
- 条件评估在应用层完成，减少数据库查询
- 模板配置缓存在应用层，提高查询速度

---

**测试完成标准**:
- ✅ 所有API接口返回正确的数据结构
- ✅ 条件分支正确筛选步骤
- ✅ 并行审批正确记录每个人的决策
- ✅ 并行审批完成后自动推进流程
- ✅ 并行审批驳回后正确退回
- ✅ 数据库约束正常工作
- ✅ 权限验证正确
