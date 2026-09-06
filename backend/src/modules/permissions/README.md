# 权限管理模块 - 集成指南

## 快速开始

### 1. 数据库迁移

```bash
# 推送schema到数据库
npx prisma db push

# 生成Prisma客户端
npx prisma generate
```

### 2. 初始化权限数据

```bash
npx ts-node src/modules/permissions/seeds/permissions.seed.ts
```

### 3. 在现有Controller中集成权限守卫

#### 示例：Tickets Controller

```typescript
// src/modules/tickets/tickets.controller.ts
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';

@Controller('api/v1/tickets')
@UseGuards(JwtAuthGuard, PermissionsGuard)  // 添加权限守卫
export class TicketsController {
  
  @Post()
  @RequirePermissions('ticket:create')  // 添加权限要求
  create(@Body() createDto: CreateTicketDto) {
    return this.ticketsService.create(createDto);
  }

  @Get()
  @RequirePermissions('ticket:read')
  findAll(@Query() query: QueryTicketsDto) {
    return this.ticketsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('ticket:read')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(BigInt(id));
  }

  @Patch(':id')
  @RequirePermissions('ticket:update')
  update(@Param('id') id: string, @Body() updateDto: UpdateTicketDto) {
    return this.ticketsService.update(BigInt(id), updateDto);
  }

  @Delete(':id')
  @RequirePermissions('ticket:delete')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(BigInt(id));
  }

  @Post(':id/assign')
  @RequirePermissions('ticket:assign')
  assign(@Param('id') id: string, @Body() assignDto: AssignTicketDto) {
    return this.ticketsService.assign(BigInt(id), assignDto);
  }

  @Post(':id/close')
  @RequirePermissions('ticket:close')
  close(@Param('id') id: string) {
    return this.ticketsService.close(BigInt(id));
  }
}
```

#### 示例：Logs Controller

```typescript
// src/modules/logs/logs.controller.ts
import { Controller, Get, Post, Patch, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';

@Controller('api/v1/tickets/:ticketId/logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LogsController {
  
  @Get()
  @RequirePermissions('comment:read')
  findAll(@Param('ticketId') ticketId: string) {
    return this.logsService.findAll(BigInt(ticketId));
  }

  @Post()
  @RequirePermissions('comment:create')
  create(@Param('ticketId') ticketId: string, @Body() createDto: CreateLogDto) {
    return this.logsService.create(BigInt(ticketId), createDto);
  }

  @Patch(':id')
  @RequirePermissions('comment:update')
  update(@Param('id') id: string, @Body() updateDto: UpdateLogDto) {
    return this.logsService.update(BigInt(id), updateDto);
  }

  @Delete(':id')
  @RequirePermissions('comment:delete')
  remove(@Param('id') id: string) {
    return this.logsService.remove(BigInt(id));
  }
}
```

#### 示例：Statistics Controller

```typescript
// src/modules/statistics/statistics.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermissions } from '../permissions/decorators/require-permissions.decorator';

@Controller('api/v1/statistics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StatisticsController {
  
  @Get('overview')
  @RequirePermissions('statistics:view')
  getOverview() {
    return this.statisticsService.getOverview();
  }

  @Get('tickets')
  @RequirePermissions('statistics:view')
  getTicketStatistics(@Query() query: QueryStatisticsDto) {
    return this.statisticsService.getTicketStatistics(query);
  }

  @Get('users')
  @RequirePermissions('statistics:view', 'user:read')
  getUserStatistics() {
    return this.statisticsService.getUserStatistics();
  }
}
```

### 4. 权限列表速查表

| 场景 | 所需权限 | 示例 |
|------|---------|------|
| 创建工单 | `ticket:create` | 普通用户创建工单 |
| 查看工单列表 | `ticket:read` | 查看所有工单 |
| 查看工单详情 | `ticket:read` | 查看单个工单 |
| 更新工单 | `ticket:update` | 修改工单信息 |
| 删除工单 | `ticket:delete` | 删除工单（慎用） |
| 分配工单 | `ticket:assign` | 将工单分配给处理人员 |
| 关闭工单 | `ticket:close` | 关闭已解决的工单 |
| 添加评论 | `comment:create` | 在工单中添加评论 |
| 查看评论 | `comment:read` | 查看工单评论 |
| 编辑评论 | `comment:update` | 修改自己的评论 |
| 删除评论 | `comment:delete` | 删除评论 |
| 查看统计 | `statistics:view` | 查看统计报表 |
| 管理用户 | `user:manage` | 用户管理功能 |
| 查看用户 | `user:read` | 查看用户信息 |
| 管理角色 | `role:manage` | 角色权限管理 |

### 5. 常见问题

#### Q: 如何给用户分配角色？

A: 在用户注册时默认分配角色，或通过用户管理接口分配：

```typescript
await prisma.userRole.create({
  data: {
    userId: BigInt(userId),
    roleId: BigInt(roleId),
    assignedBy: BigInt(adminId),
  },
});
```

#### Q: 如何检查用户是否有某个权限？

A: 在Service中通过用户的permissions数组检查：

```typescript
const hasPermission = user.permissions.includes('ticket:update') ||
                     user.permissions.includes('ticket:*') ||
                     user.permissions.includes('*:*');
```

#### Q: 权限守卫在哪里加载用户权限？

A: 在JWT策略的validate方法中，每次请求时自动加载：

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
async validate(payload: JwtPayload) {
  const user = await this.prisma.user.findUnique({
    where: { id: BigInt(payload.userId) },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  // 收集所有权限
  const permissions = [...]; // 去重后的权限列表

  return {
    userId: payload.userId,
    username: payload.username,
    role: payload.role,
    permissions, // 添加到请求的user对象中
  };
}
```

#### Q: 如何实现"只能操作自己创建的资源"？

A: 在Service中添加所有权检查：

```typescript
async updateTicket(id: bigint, userId: bigint, updateDto: UpdateTicketDto) {
  const ticket = await this.prisma.ticket.findUnique({
    where: { id },
  });

  // 检查是否是创建者
  const isOwner = ticket.creatorSnapshot.userId === userId;
  
  // 检查是否有管理员权限
  const hasAdminPermission = user.permissions.includes('ticket:update');

  if (!isOwner && !hasAdminPermission) {
    throw new ForbiddenException('无权更新此工单');
  }

  // 执行更新...
}
```

#### Q: 如何添加新权限？

A: 有两种方式：

1. 通过API创建（需要超级管理员权限）：
```bash
curl -X POST http://localhost:3000/api/v1/permissions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource": "attachment",
    "action": "download",
    "description": "下载附件"
  }'
```

2. 修改种子脚本并重新运行：
```typescript
// 在 permissions.seed.ts 中添加
const permissions = [
  // ... 现有权限
  { resource: 'attachment', action: 'download', code: 'attachment:download', description: '下载附件' },
];
```

### 6. 测试权限

```bash
# 运行单元测试
npm test -- permissions.service.spec.ts

# 运行API测试（需要后端运行中）
chmod +x test-permissions-api.sh
./test-permissions-api.sh
```

### 7. Swagger文档

启动应用后访问：http://localhost:3000/api

在Swagger UI中可以：
- 查看所有权限相关API
- 测试权限验证
- 查看请求/响应格式

### 8. 注意事项

⚠️ **重要**：
1. 所有涉及敏感操作的接口都应添加权限守卫
2. JWT策略已集成权限加载，无需额外配置
3. 权限守卫会自动处理 `*:*` 超级管理员权限
4. 使用 `@UseGuards(JwtAuthGuard, PermissionsGuard)` 时，顺序很重要
5. `@RequirePermissions()` 装饰器可以放在类级别或方法级别

### 9. 性能优化建议

1. **权限缓存**：对于频繁访问的用户权限，可以使用Redis缓存
2. **批量加载**：在一次请求中避免多次查询权限
3. **索引优化**：为role_permissions表的联合主键建立索引（已自动创建）

### 10. 安全建议

1. ✅ 使用HTTPS传输JWT token
2. ✅ 定期轮换JWT密钥
3. ✅ 记录权限变更日志
4. ✅ 实施最小权限原则
5. ✅ 定期审计用户权限

## 完成标志

- [x] 数据库表创建
- [x] 权限初始化脚本
- [x] 权限守卫实现
- [x] JWT策略集成
- [x] 单元测试（覆盖率89.13%）
- [x] API文档
- [x] 集成指南

## 联系支持

如有问题，请参考：
- 完整文档：`docs/权限管理模块文档.md`
- 单元测试：`src/modules/permissions/permissions.service.spec.ts`
- 种子脚本：`src/modules/permissions/seeds/permissions.seed.ts`
