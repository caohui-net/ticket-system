# Peppermint项目学习报告

## 📋 项目概况

**项目名称**: Peppermint Ticket Management  
**GitHub**: https://github.com/Peppermint-Lab/peppermint  
**技术栈**: Node.js + React + TypeScript + PostgreSQL + Prisma  
**架构**: Monorepo (Turborepo)  
**定位**: Zendesk/Jira的开源替代品

---

## 🎯 与我们项目的技术栈对比

| 技术组件 | Peppermint | 我们的项目 | 相似度 |
|---------|-----------|-----------|--------|
| 后端框架 | Fastify | NestJS | ⭐⭐⭐⭐ (都是Node.js) |
| 前端框架 | React | React | ⭐⭐⭐⭐⭐ |
| 类型系统 | TypeScript | TypeScript | ⭐⭐⭐⭐⭐ |
| 数据库 | PostgreSQL | PostgreSQL | ⭐⭐⭐⭐⭐ |
| ORM | Prisma | Prisma | ⭐⭐⭐⭐⭐ |
| 认证 | JWT | JWT | ⭐⭐⭐⭐⭐ |

**总体相似度**: 95% ⭐⭐⭐⭐⭐

---

## 💡 值得借鉴的优秀设计

### 1. 后端架构设计

#### 1.1 Fastify vs NestJS

**Peppermint使用Fastify**:
```typescript
// 轻量级、高性能
import { FastifyInstance } from "fastify";

export function ticketRoutes(fastify: FastifyInstance) {
  fastify.post("/api/v1/ticket/create", {
    preHandler: requirePermission(["issue::create"]),
  }, async (request, reply) => {
    // 处理逻辑
  });
}
```

**我们使用NestJS**:
```typescript
// 更完整的企业级框架
@Controller('api/v1/tickets')
export class TicketController {
  @Post('create')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  async create(@Body() dto: CreateTicketDto) {
    // 处理逻辑
  }
}
```

**结论**: 
- ✅ 我们的NestJS更适合学校项目（结构清晰、易维护）
- ✅ 装饰器语法更易读
- ✅ 依赖注入更规范

#### 1.2 权限控制模式

**Peppermint的权限中间件** (可借鉴):
```typescript
// src/lib/roles.ts
export function requirePermission(permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await checkSession(request);
    const hasPermission = user.roles.some(role => 
      role.permissions.includes(permissions[0])
    );
    if (!hasPermission) {
      reply.status(403).send({ error: "Forbidden" });
    }
  };
}
```

**我们可以实现** (NestJS版本):
```typescript
// 创建权限装饰器
@Injectable()
export class PermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    const { user } = context.switchToHttp().getRequest();
    return this.checkPermissions(user, requiredPermissions);
  }
}

// 使用
@RequirePermissions('ticket:create')
@Post('create')
async create() { }
```

**借鉴点**:
- ✅ 权限字符串格式: `resource::action` (如 `issue::create`)
- ✅ 角色-权限关联表设计
- ✅ 权限检查逻辑

### 2. 数据库设计

#### 2.1 Ticket模型 (可借鉴结构)

```prisma
model Ticket {
  id         String       @id @default(uuid())
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @default(now())
  name       String?      // 工单创建者姓名
  title      String       // 工单标题
  detail     String?      // 详情(JSON格式)
  email      String?      // 联系邮箱
  note       String?      // 内部备注
  isComplete Boolean      // 是否完成
  priority   String       // 优先级
  Number     Int          @default(autoincrement()) // 工单编号
  status     TicketStatus @default(needs_support)   // 状态
  type       TicketType   @default(support)         // 类型
  hidden     Boolean      @default(false)
  createdBy  Json?        // 创建者信息(JSON)
  locked     Boolean      @default(false)           // 是否锁定
  following  Json?        // 关注者列表

  // 关联关系
  assignedTo User?   @relation(fields: [userId], references: [id])
  client     Client? @relation(fields: [clientId], references: [id])
  team       Team?   @relation(fields: [teamId], references: [id])
  
  Comment      Comment[]
  TicketFile   TicketFile[]
  TimeTracking TimeTracking[]
}
```

**借鉴点**:
- ✅ `Number` 字段用于显示友好的工单编号（自增整数）
- ✅ `detail` 使用JSON存储富文本内容
- ✅ `createdBy` 使用JSON存储快照数据（避免外键约束）
- ✅ `locked` 字段防止并发修改
- ✅ `hidden` 字段实现软隐藏（而非软删除）
- ✅ `following` 字段存储关注者列表

#### 2.2 评论模型

```prisma
model Comment {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  text      String
  public    Boolean   @default(false)  // 公开/内部
  reply     Boolean   @default(false)  // 是否回复
  replyEmail String?
  edited    Boolean   @default(false)  // 是否编辑过
  editedAt  DateTime?
  previous  String?   // 编辑前的内容

  userId   String?
  user     User?   @relation(fields: [userId], references: [id])
  ticketId String
  ticket   Ticket  @relation(fields: [ticketId], references: [id], onDelete: Cascade)
}
```

**借鉴点**:
- ✅ `public` 字段区分公开/内部评论
- ✅ `edited/editedAt/previous` 实现编辑历史追踪
- ✅ `reply/replyEmail` 支持邮件回复功能

#### 2.3 时间追踪模型

```prisma
model TimeTracking {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  title     String
  comment   String?
  time      Int      // 时间（分钟）

  user     User?   @relation(fields: [userId], references: [id])
  client   Client? @relation(fields: [clientId], references: [id])
  ticket   Ticket? @relation(fields: [ticketId], references: [id])
}
```

**借鉴点**:
- ✅ 时间追踪功能（学校项目可选功能）
- ✅ 可关联工单、用户、客户

### 3. API设计模式

#### 3.1 工单创建接口

**Peppermint实现**:
```typescript
fastify.post("/api/v1/ticket/create", {
  preHandler: requirePermission(["issue::create"]),
}, async (request, reply) => {
  const { name, title, detail, priority, email, engineer, type, createdBy } = request.body;
  
  const ticket = await prisma.ticket.create({
    data: {
      name,
      title,
      detail: JSON.stringify(detail), // ✅ JSON序列化
      priority: priority || "low",    // ✅ 默认值
      email,
      type: type ? type.toLowerCase() : "support",
      createdBy: createdBy ? {
        id: createdBy.id,
        name: createdBy.name,
        role: createdBy.role,
        email: createdBy.email,
      } : undefined,
      assignedTo: engineer && engineer.name !== "Unassigned" ? {
        connect: { id: engineer.id }
      } : undefined,
      isComplete: false,
    },
  });

  // ✅ 发送通知邮件
  if (email && validateEmail(email)) {
    await sendTicketCreate(ticket);
  }

  // ✅ 处理分配通知
  if (engineer && engineer.name !== "Unassigned") {
    await sendAssignedEmail(engineer.email);
    await assignedNotification(engineer, ticket, user);
  }

  // ✅ Webhook通知
  const webhooks = await prisma.webhooks.findMany({
    where: { type: "ticket_created" }
  });
  for (const webhook of webhooks) {
    if (webhook.active) {
      await sendWebhookNotification(webhook, {
        event: "ticket_created",
        id: ticket.id,
        title: ticket.title,
        priority: ticket.priority,
      });
    }
  }

  reply.status(200).send({
    message: "Ticket created correctly",
    success: true,
    id: ticket.id,
  });
});
```

**我们可以实现** (NestJS版本):
```typescript
@Post('create')
@UseGuards(JwtAuthGuard)
@RequirePermissions('ticket:create')
async create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
  // 1. 创建工单
  const ticket = await this.ticketService.create({
    ...dto,
    detail: JSON.stringify(dto.detail),
    priority: dto.priority || 'low',
    createdBy: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });

  // 2. 发送通知
  if (dto.email) {
    await this.notificationService.sendTicketCreatedEmail(ticket);
  }

  // 3. 处理分配
  if (dto.assigneeId) {
    await this.ticketService.assign(ticket.id, dto.assigneeId);
    await this.notificationService.sendAssignedEmail(dto.assigneeId, ticket);
  }

  // 4. Webhook
  await this.webhookService.trigger('ticket.created', ticket);

  return {
    message: 'Ticket created successfully',
    data: ticket,
  };
}
```

**借鉴点**:
- ✅ 创建工单后立即触发通知
- ✅ Webhook机制支持第三方集成
- ✅ 分配逻辑与创建分离
- ✅ 详情字段存储JSON
- ✅ 默认值处理

### 4. 通知系统设计

#### 4.1 多渠道通知

**Peppermint支持**:
- ✅ 邮件通知 (nodemailer)
- ✅ 应用内通知 (数据库存储)
- ✅ Webhook通知 (第三方集成)

**通知场景**:
```typescript
// 工单创建通知
await sendTicketCreate(ticket);

// 工单分配通知
await sendAssignedEmail(engineer.email);
await assignedNotification(engineer, ticket, user);

// 状态变更通知
await sendTicketStatus(ticket);
await statusUpdateNotification(ticket);

// 评论通知
await sendComment(comment);
await commentNotification(comment, ticket);

// 优先级变更通知
await priorityNotification(ticket);
```

**我们可以实现**:
```typescript
@Injectable()
export class NotificationService {
  async notify(event: NotificationEvent, data: any) {
    // 1. 查询通知配置
    const configs = await this.getNotificationConfigs(event);
    
    // 2. 多渠道发送
    await Promise.all([
      this.sendEmail(configs.email, data),
      this.saveInApp(configs.inApp, data),
      this.triggerWebhook(configs.webhook, data),
    ]);
  }
}
```

**借鉴点**:
- ✅ 多渠道通知架构
- ✅ 用户可配置通知偏好
- ✅ Webhook支持第三方集成

### 5. 前端架构 (暂略)

前端使用React，我们项目也使用React，后续可以详细研究其组件设计。

---

## 🚫 不应照搬的部分

### 1. Fastify vs NestJS

**不照搬原因**:
- ❌ Fastify更轻量，但缺少NestJS的结构化
- ❌ 学校项目更适合NestJS的装饰器语法
- ❌ NestJS生态更完善（测试、文档、社区）

### 2. Monorepo架构

**Peppermint使用Turborepo**:
```
apps/
  api/       (后端API)
  client/    (前端客户端)
  docs/      (文档)
  landing/   (落地页)
packages/
  shared/    (共享代码)
```

**不照搬原因**:
- ❌ 学校项目规模小，不需要Monorepo
- ❌ 我们已有独立的backend/frontend结构
- ❌ Monorepo增加构建复杂度

### 3. 邮件集成 (IMAP)

**Peppermint支持**:
- ❌ 从邮箱自动创建工单
- ❌ 邮件回复转评论

**不照搬原因**:
- ❌ 学校项目不需要邮件集成
- ❌ 增加部署复杂度
- ❌ 需要IMAP/SMTP配置

### 4. 多租户/团队功能

**Peppermint支持**:
- ❌ 多团队管理
- ❌ 客户(Client)管理

**不照搬原因**:
- ❌ 学校项目需求更简单
- ❌ 单租户架构足够

---

## ✅ 推荐立即实施的改进

### 1. 工单编号字段

**当前**: 只有UUID  
**改进**: 添加自增的 `Number` 字段

```prisma
model Ticket {
  id     String @id @default(uuid())
  number Int    @default(autoincrement()) // ✅ 添加
  // ...
}
```

**好处**:
- 用户友好的工单编号 (#1, #2, #3)
- 便于口头交流
- 符合用户习惯

### 2. 评论编辑历史

**当前**: 无编辑功能  
**改进**: 添加编辑追踪

```prisma
model TicketLog {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  text      String
  edited    Boolean  @default(false)  // ✅ 添加
  editedAt  DateTime?                 // ✅ 添加
  previous  String?                   // ✅ 添加
}
```

### 3. 权限字符串格式

**当前**: 角色名称字符串  
**改进**: 资源:操作 格式

```typescript
// 当前
roles: ['ADMIN', 'CREATOR']

// 改进为
permissions: [
  'ticket:create',
  'ticket:read',
  'ticket:update',
  'ticket:delete',
  'ticket:assign',
  'user:manage',
]
```

### 4. JSON字段使用

**当前**: 关联表  
**改进**: 快照数据用JSON

```typescript
// 创建者信息用JSON存储
createdBy: {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
} // 避免用户信息变更影响历史工单
```

### 5. Webhook系统

**当前**: 无  
**改进**: 添加Webhook支持

```prisma
model Webhook {
  id     String  @id @default(uuid())
  url    String
  events String[] // ['ticket.created', 'ticket.updated']
  active Boolean @default(true)
}
```

---

## 📊 功能对比

| 功能 | Peppermint | 我们的项目 | 优先级 |
|------|-----------|-----------|--------|
| 用户认证 | ✅ | ✅ | P0 (已完成) |
| 工单CRUD | ✅ | ⏳ | P0 (下一步) |
| 工单分配 | ✅ | ⏳ | P0 |
| 工单状态流转 | ✅ | ⏳ | P0 |
| 评论功能 | ✅ | ⏳ | P0 |
| 附件上传 | ✅ | ⏳ | P0 |
| 通知系统 | ✅ | ⏳ | P1 |
| 统计报表 | ✅ | ⏳ | P1 |
| 权限管理 | ✅ | ⏳ | P1 |
| 时间追踪 | ✅ | ❌ | P2 (可选) |
| 知识库 | ✅ | ❌ | P2 (可选) |
| 邮件集成 | ✅ | ❌ | P3 (不需要) |
| 多团队 | ✅ | ❌ | P3 (不需要) |
| OAuth/SAML | ✅ | ❌ | P3 (不需要) |

---

## 🎯 下一步行动计划

### 短期（本周）

1. ✅ **完成Peppermint项目研究** (已完成)

2. **数据库Schema优化**
   - [ ] 添加 `ticket.number` 字段
   - [ ] 添加 `ticket_logs.edited/editedAt/previous` 字段
   - [ ] 优化权限表设计

3. **开始阶段3开发**
   - [ ] 工单CRUD基础功能
   - [ ] 工单状态流转
   - [ ] 工单分配逻辑

### 中期（本月）

1. **核心功能实现**
   - [ ] 评论系统
   - [ ] 附件管理
   - [ ] 通知系统（应用内）
   - [ ] 基础统计

2. **前端开发**
   - [ ] 工单列表页
   - [ ] 工单详情页
   - [ ] 工单处理页

3. **测试**
   - [ ] 保持测试覆盖率≥80%
   - [ ] E2E测试

### 长期（本学期）

1. **高级功能**
   - [ ] 权限管理界面
   - [ ] 高级报表
   - [ ] 邮件通知（可选）

2. **部署**
   - [ ] Docker部署
   - [ ] 演示环境

3. **文档**
   - [ ] 用户手册
   - [ ] API文档

---

## 💡 关键学习点总结

### 技术选型验证

✅ **我们的选择是正确的**:
- NestJS更适合学校项目（结构清晰）
- TypeScript全栈提供类型安全
- Prisma ORM简化数据库操作
- React生态成熟

### 架构设计启示

1. **权限控制**: 使用 `resource:action` 格式
2. **数据快照**: 关键数据用JSON存储快照
3. **友好编号**: 添加自增编号字段
4. **通知架构**: 多渠道、可配置
5. **Webhook**: 支持第三方集成

### 实现细节

1. **JSON字段**: 灵活存储复杂数据
2. **编辑历史**: 追踪内容变更
3. **软隐藏**: 使用 `hidden` 而非软删除
4. **默认值**: 接口层提供合理默认
5. **级联删除**: Prisma关系配置

---

## 📚 参考资源

- **GitHub**: https://github.com/Peppermint-Lab/peppermint
- **Prisma Schema**: `/apps/api/src/prisma/schema.prisma`
- **Ticket Controller**: `/apps/api/src/controllers/ticket.ts`
- **Package.json**: `/apps/api/package.json`

---

**报告生成时间**: 2026-09-06  
**版本**: v1.0  
**状态**: 已完成初步研究，建议进入实施阶段

