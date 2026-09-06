# 统计报表模块

## 概述

统计报表模块提供工单系统的数据统计和可视化支持，包括概览统计、趋势分析、响应时间统计、用户工作量统计等功能。

## 实现说明

本模块基于实际的数据库schema（`./prisma/schema.prisma`）实现，适配了以下特点：

### 数据库Schema特性
- **User.id**: BigInt类型
- **User.status**: Int类型（1=ACTIVE, 0=INACTIVE）
- **Ticket状态**: OPEN, IN_PROGRESS, PENDING, RESOLVED, CLOSED, CANCELLED
- **时间字段**: assignedAt, resolvedAt, closedAt, createdAt, updatedAt
- **创建者**: 通过creatorSnapshot JSON字段存储（无外键关联）

### 响应时间计算
由于没有`processedAt`字段，响应时间使用以下逻辑：
- **响应时间**: assignedAt → resolvedAt（从分配到解决的时间）
- **解决时间**: createdAt → closedAt（从创建到关闭的总时间）

## 功能特性

### 1. 概览统计
- 总工单数
- 各状态工单数量（待分配、处理中、待反馈、已解决、已关闭、已取消）
- 今日/本周/本月新增工单数
- 平均响应时间
- 平均解决时间

### 2. 工单统计
- 按状态统计（含百分比）
- 按优先级统计（含百分比）
- 工单趋势分析（支持自定义天数）

### 3. 响应时间统计
- 平均响应时间（分配到解决）
- 平均解决时间（创建到关闭）
- 按优先级分组的响应时间

### 4. 用户统计
- 活跃用户统计
- 用户工作量统计（创建数、分配数、完成数）
- Top创建者和Top处理者排行

## API端点

### 概览统计
```http
GET /api/v1/statistics/overview
Authorization: Bearer {token}
```

**响应示例：**
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

### 按状态统计
```http
GET /api/v1/statistics/tickets/by-status
Authorization: Bearer {token}
```

**响应示例：**
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

### 按优先级统计
```http
GET /api/v1/statistics/tickets/by-priority
Authorization: Bearer {token}
```

**响应示例：**
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
  },
  {
    "priority": "HIGH",
    "count": 40,
    "percentage": 26.67
  },
  {
    "priority": "URGENT",
    "count": 20,
    "percentage": 13.33
  }
]
```

### 工单趋势
```http
GET /api/v1/statistics/tickets/trend?days=7
Authorization: Bearer {token}
```

**查询参数：**
- `days` (可选): 天数，默认7天

**响应示例：**
```json
{
  "labels": ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06", "2026-09-07"],
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

### 响应时间统计
```http
GET /api/v1/statistics/response-time
Authorization: Bearer {token}
```

**响应示例：**
```json
{
  "avgFirstResponseTime": "2.5小时",
  "avgResolutionTime": "1.2天",
  "byPriority": [
    {
      "priority": "LOW",
      "avgResponseTime": "4小时",
      "avgResolutionTime": "2天"
    },
    {
      "priority": "MEDIUM",
      "avgResponseTime": "2小时",
      "avgResolutionTime": "1天"
    },
    {
      "priority": "HIGH",
      "avgResponseTime": "1小时",
      "avgResolutionTime": "12小时"
    },
    {
      "priority": "URGENT",
      "avgResponseTime": "30分钟",
      "avgResolutionTime": "6小时"
    }
  ]
}
```

### 用户工作量统计
```http
GET /api/v1/statistics/users/workload
Authorization: Bearer {token}
```

**响应示例：**
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
  },
  {
    "userId": "2",
    "username": "handler2",
    "realName": "李四",
    "createdCount": 10,
    "assignedCount": 15,
    "completedCount": 12,
    "avgResponseTime": "3.1小时"
  }
]
```

### 活跃用户统计
```http
GET /api/v1/statistics/users/active
Authorization: Bearer {token}
```

**响应示例：**
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

## 技术实现

### 1. 查询优化

#### 并行查询
使用 `Promise.all` 并行执行多个独立查询，减少总响应时间。

```typescript
const [totalTickets, statusCounts, todayNew] = await Promise.all([
  this.prisma.ticket.count(),
  this.prisma.ticket.groupBy({ by: ['status'], _count: true }),
  this.prisma.ticket.count({ where: { createdAt: { gte: todayStart } } }),
]);
```

#### 原生SQL查询
对于复杂的聚合查询（如Top创建者），使用`$queryRaw`执行原生SQL：

```typescript
await this.prisma.$queryRaw<Array<{ user_id: bigint; count: bigint }>>`
  SELECT
    (creator_snapshot->>'userId')::bigint as user_id,
    COUNT(*) as count
  FROM tickets
  WHERE creator_snapshot->>'userId' IS NOT NULL
  GROUP BY creator_snapshot->>'userId'
  ORDER BY count DESC
  LIMIT 5
`;
```

#### JSON字段查询
通过`creatorSnapshot` JSON字段查询创建者：

```typescript
const createdCount = await this.prisma.ticket.count({
  where: {
    creatorSnapshot: {
      path: ['userId'],
      equals: user.id,
    },
  },
});
```

### 2. 数据库索引

依赖Prisma schema中已有的索引：

```prisma
@@index([status])           // 工单状态索引
@@index([assigneeId])       // 分配人索引
@@index([createdAt])        // 创建时间索引
```

### 3. 类型安全

使用Prisma生成的类型确保类型安全：

```typescript
import { TicketPriority, TicketStatus } from '@prisma/client';
```

## 测试

运行单元测试：

```bash
npm test -- statistics.service.spec.ts
```

测试覆盖率目标：≥80%

测试包括：
- 概览统计
- 按状态/优先级统计
- 工单趋势
- 用户工作量
- 活跃用户
- 响应时间统计

## 前端集成建议

### 推荐图表库
- **Chart.js** - 轻量级、易用
- **Recharts** - React原生、组件化
- **ECharts** - 功能强大、样式丰富

### 图表类型建议
1. **概览仪表盘**
   - 数字卡片：总工单数、今日新增等
   - 进度条：各状态占比

2. **状态分布**
   - 饼图或环形图
   - 颜色方案建议：
     - OPEN: 灰色
     - IN_PROGRESS: 蓝色
     - PENDING: 橙色
     - RESOLVED: 绿色
     - CLOSED: 深绿色
     - CANCELLED: 灰色

3. **优先级分布**
   - 柱状图
   - 颜色方案建议：
     - LOW: 绿色
     - MEDIUM: 黄色
     - HIGH: 橙色
     - URGENT: 红色

4. **趋势分析**
   - 折线图或面积图
   - 双Y轴显示新增和完成趋势

5. **用户工作量**
   - 表格 + 迷你图
   - 排序功能

## 注意事项

### Schema限制
1. **没有processedAt字段**: 无法精确计算"首次响应时间"，使用assignedAt→resolvedAt替代
2. **creatorSnapshot是JSON**: 查询创建者需要使用JSON路径查询或原生SQL
3. **User.status是数字**: 需要使用`status: 1`而不是`status: 'ACTIVE'`
4. **ID是BigInt**: 需要转换为字符串传给前端

### 性能考虑
- Top创建者查询使用原生SQL以提高性能
- 趋势统计可能需要多次查询，考虑缓存优化
- 大数据量时考虑分页或限制返回数量

## 扩展功能建议

### 1. 数据导出
添加CSV/Excel导出功能（待实现）

### 2. 缓存优化
使用Redis缓存热门统计数据（待实现）

### 3. 定时任务
生成每日统计报告（待实现）

### 4. 实时推送
WebSocket推送实时统计更新（待实现）

## 版本历史

- v1.0.0 (2026-09-06): 初始版本
  - 基于实际schema实现
  - 概览统计
  - 工单统计（状态、优先级、趋势）
  - 响应时间统计
  - 用户统计

## 维护者

Backend Team

## 许可证

MIT
