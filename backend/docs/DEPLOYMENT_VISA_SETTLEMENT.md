# 签证和结算模块部署文档

## 概述

本次部署添加了签证（Visa）和结算（Settlement）两个核心模块，完善工单的完整生命周期。

## 工单生命周期

```
报修 → 预算 → 立项 → 执行 → 签证 → 验收 → 结算 → 完成
```

## 数据库变更

### 新增枚举类型

1. **VisaType** - 签证类型
   - `COST_INCREASE`: 费用增加
   - `DURATION_EXTEND`: 工期延长
   - `SCOPE_CHANGE`: 范围变更

2. **VisaStatus** - 签证状态
   - `DRAFT`: 草稿
   - `SUBMITTED`: 已提交
   - `APPROVED`: 已批准
   - `REJECTED`: 已驳回

3. **SettlementStatus** - 结算状态
   - `DRAFT`: 草稿
   - `SUBMITTED`: 已提交
   - `APPROVED`: 已批准
   - `REJECTED`: 已驳回
   - `PAID`: 已支付

### 扩展现有枚举

**Phase** - 工单阶段（新增2个值）
- `EXECUTION`: 执行阶段
- `SETTLEMENT`: 结算阶段

### 新增表

1. **visas** - 签证表
   - 记录执行过程中的变更（费用、工期、范围）
   - 支持多级审批流程
   - 与工单和立项关联

2. **settlements** - 结算表
   - 记录项目完成后的费用结算
   - 包含原预算、签证金额、总金额
   - 支持多级审批流程

## 部署步骤

### 1. 备份数据库

```bash
pg_dump -U postgres -d ticket_system > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 执行数据库迁移

```bash
cd /home/caohui/projects/工单项目/backend

# 方式1: 使用 Prisma Migrate（推荐）
npx prisma migrate deploy

# 方式2: 手动执行SQL（如果方式1失败）
psql -U postgres -d ticket_system -f prisma/migrations/20260906_add_visa_and_settlement/migration.sql
```

### 3. 重新生成 Prisma Client

```bash
npx prisma generate
```

### 4. 重启应用

```bash
# 停止当前应用
pm2 stop ticket-backend

# 重新构建（如果有TypeScript编译）
npm run build

# 启动应用
pm2 start ticket-backend
pm2 logs ticket-backend
```

### 5. 验证部署

#### 5.1 检查数据库表

```sql
-- 检查新表是否创建
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('visas', 'settlements');

-- 检查枚举类型
SELECT typname FROM pg_type 
WHERE typname IN ('VisaType', 'VisaStatus', 'SettlementStatus');

-- 检查Phase枚举是否包含新值
SELECT enum_range(NULL::Phase);
```

#### 5.2 测试API接口

```bash
# 获取访问令牌
TOKEN="your_jwt_token"

# 测试签证接口
curl -X GET http://localhost:3000/visas \
  -H "Authorization: Bearer $TOKEN"

# 测试结算接口
curl -X GET http://localhost:3000/settlements \
  -H "Authorization: Bearer $TOKEN"
```

## API 接口说明

### 签证接口

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/visas/ticket/:ticketId` | 提交签证 |
| POST | `/visas/:id/review` | 审核签证 |
| GET | `/visas/ticket/:ticketId` | 查询工单签证 |
| GET | `/visas` | 查询签证列表 |

### 结算接口

| 方法 | 路径 | 说明 |
|-----|------|------|
| POST | `/settlements/ticket/:ticketId` | 提交结算 |
| POST | `/settlements/:id/review` | 审核结算 |
| PATCH | `/settlements/:id/paid` | 标记为已支付 |
| GET | `/settlements/ticket/:ticketId` | 查询工单结算 |
| GET | `/settlements` | 查询结算列表 |

## 业务规则

### 签证提交条件

1. 工单必须处于 `EXECUTION` 阶段
2. 工单必须有关联的立项
3. 一个工单只能有一个签证

### 签证审批流程

根据变更金额自动确定审批级别：

- **低额签证** (≤10,000): 副主任审核
- **中额签证** (10,000-50,000): 副主任 → 分管领导
- **高额签证** (>50,000): 副主任 → 分管领导 → 一把手

### 结算提交条件

1. 工单必须处于 `ACCEPTANCE` 或 `SETTLEMENT` 阶段（已验收）
2. 工单必须有预算和立项
3. 结算金额不能超过预算+签证总和的110%

### 结算审批流程

根据结算金额自动确定审批级别：

- **低额结算** (≤50,000): 财务审核
- **中额结算** (50,000-100,000): 财务 → 分管领导
- **高额结算** (>100,000): 财务 → 分管领导 → 一把手

## 通知功能

### 签证通知

- 提交时：通知所有副主任角色用户
- 批准时：通知签证创建人
- 驳回时：通知签证创建人（包含驳回原因）

### 结算通知

- 提交时：通知所有财务角色用户
- 批准时：通知结算创建人
- 驳回时：通知结算创建人（包含驳回原因）

## 回滚方案

如果部署出现问题，可以回滚：

```bash
# 1. 恢复数据库
psql -U postgres -d ticket_system < backup_YYYYMMDD_HHMMSS.sql

# 2. 恢复代码
cd /home/caohui/projects/工单项目/backend
git checkout <previous_commit>

# 3. 重新生成 Prisma Client
npx prisma generate

# 4. 重启应用
pm2 restart ticket-backend
```

## 注意事项

1. **数据一致性**: 部署前确保没有未完成的工单操作
2. **权限配置**: 确保VICE_DIRECTOR、FINANCE、VICE_LEADER、TOP_LEADER角色已正确配置
3. **审批流程**: 签证和结算会创建审批流程，确保ApprovalService工作正常
4. **通知服务**: 确保NotificationService工作正常，否则用户收不到通知
5. **Decimal精度**: 金额字段使用Decimal(12,2)，支持最大9,999,999,999.99

## 测试场景

### 场景1: 完整的签证流程

1. 工单处于执行阶段
2. 乙方提交签证（费用增加50,000元）
3. 副主任审核通过
4. 分管领导审核通过
5. 工单进入验收阶段

### 场景2: 完整的结算流程

1. 工单完成验收
2. 乙方提交结算（总金额含签证）
3. 财务审核通过
4. 分管领导审核通过
5. 工单完成，状态变为RESOLVED

### 场景3: 驳回处理

1. 提交签证/结算
2. 审批人驳回
3. 创建人收到驳回通知
4. 工单回退到上一阶段
5. 修改后重新提交

## 监控指标

部署后监控以下指标：

1. 签证提交数量
2. 签证审批通过率
3. 签证平均审批时长
4. 结算提交数量
5. 结算审批通过率
6. 结算平均审批时长
7. 通知发送成功率

## 联系方式

如有问题，请联系开发团队。

---

**文档版本**: 1.0  
**创建日期**: 2026-09-06  
**最后更新**: 2026-09-06
