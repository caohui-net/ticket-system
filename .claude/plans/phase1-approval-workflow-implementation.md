# 方案B第一阶段：审批流程核心功能实施计划

**计划版本**: v1.0  
**制定日期**: 2026-09-06  
**预计工期**: 10-12天  
**目标**: 实现核心审批流程，满足湖北经济学院零星报修系统的核心需求

---

## 一、需求确认

### 1.1 第一阶段核心需求（来自用户需求文档）

**必须实现的需求**:
- REQ-02: 副主任审核报修单（P0）
- REQ-04: 预算审核（P0，简化版）
- REQ-05: 发起立项审批（P0）
- REQ-06: 立项单一级审核 - 部门主管（P0）
- REQ-07: 立项单二级审核 - 分管领导（P0）
- REQ-08: 立项单终审 - 一把手（P0）

**核心机制**:
1. **三级逐级审批**: 部门主管 → 分管领导 → 一把手
2. **逐级驳回**: 驳回时退回到上一级，不直接退回源头
3. **角色细分**: 9种角色（报修人、副主任、部门主管、分管领导、一把手、资料员、监察、财务、乙方）

### 1.2 当前系统现状分析

**已有基础**:
- ✅ User表和Role表（使用UserRole关联）
- ✅ Ticket表（工单基础信息）
- ✅ 权限系统（Permission、RolePermission）
- ✅ 通知系统（Notification、NotificationSetting）
- ✅ Prisma ORM + PostgreSQL
- ✅ NestJS模块化架构

**需要扩展**:
- ❌ 审批流程表（ApprovalFlow、ApprovalStep）
- ❌ 预算表（Budget）
- ❌ 立项表（Project）
- ❌ 工单阶段字段（currentPhase、currentStep）
- ❌ 用户角色扩展（employeeId、isExternal）
- ❌ 审批服务和控制器

---

## 二、数据库Schema设计

### 2.1 新增表结构

#### 2.1.1 审批流程表（ApprovalFlow）

```prisma
model ApprovalFlow {
  id              BigInt         @id @default(autoincrement()) @map("approval_flow_id")
  ticketId        BigInt         @unique @map("ticket_id")
  type            ApprovalType   // REPAIR_REVIEW, BUDGET_REVIEW, PROJECT_APPROVAL
  currentStep     Int            @default(1) @map("current_step")
  totalSteps      Int            @map("total_steps")
  status          FlowStatus     @default(PENDING)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)
  completedAt     DateTime?      @map("completed_at") @db.Timestamptz(6)
  
  ticket          Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  steps           ApprovalStep[]
  
  @@index([ticketId])
  @@index([status])
  @@map("approval_flows")
}

enum ApprovalType {
  REPAIR_REVIEW      // 报修审核（副主任）
  BUDGET_REVIEW      // 预算审核（副主任）
  PROJECT_APPROVAL   // 立项审批（三级）
}

enum FlowStatus {
  PENDING     // 进行中
  APPROVED    // 已通过
  REJECTED    // 已驳回
  CANCELLED   // 已取消
}
```

#### 2.1.2 审批步骤表（ApprovalStep）

```prisma
model ApprovalStep {
  id              BigInt         @id @default(autoincrement()) @map("approval_step_id")
  flowId          BigInt         @map("flow_id")
  stepNumber      Int            @map("step_number")  // 1,2,3...
  stepName        String         @map("step_name") @db.VarChar(50)  // "一级审核"/"二级审核"
  approverRole    String         @map("approver_role") @db.VarChar(50)  // 审批角色code
  approverId      BigInt?        @map("approver_id")  // 实际审批人ID
  status          StepStatus     @default(PENDING)
  comment         String?        @db.Text  // 审批意见
  approvedAt      DateTime?      @map("approved_at") @db.Timestamptz(6)
  rejectedAt      DateTime?      @map("rejected_at") @db.Timestamptz(6)
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  
  flow            ApprovalFlow   @relation(fields: [flowId], references: [id], onDelete: Cascade)
  approver        User?          @relation(fields: [approverId], references: [id], onDelete: SetNull)
  
  @@index([flowId, stepNumber])
  @@index([status])
  @@map("approval_steps")
}

enum StepStatus {
  PENDING     // 待审批
  APPROVED    // 已通过
  REJECTED    // 已驳回
  SKIPPED     // 已跳过
}
```

#### 2.1.3 预算表（Budget - 简化版）

```prisma
model Budget {
  id              BigInt         @id @default(autoincrement()) @map("budget_id")
  ticketId        BigInt         @unique @map("ticket_id")
  amount          Decimal        @db.Decimal(10, 2)  // 预算金额
  description     String         @db.Text  // 预算说明
  attachments     String?        @db.Text  // JSON数组，预算文件URL
  status          BudgetStatus   @default(DRAFT)
  createdBy       BigInt         @map("created_by")  // 乙方人员ID
  createdAt       DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  submittedAt     DateTime?      @map("submitted_at") @db.Timestamptz(6)
  reviewedBy      BigInt?        @map("reviewed_by")  // 副主任ID
  reviewedAt      DateTime?      @map("reviewed_at") @db.Timestamptz(6)
  reviewComment   String?        @map("review_comment") @db.Text
  
  ticket          Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  creator         User           @relation("BudgetCreator", fields: [createdBy], references: [id], onDelete: Cascade)
  reviewer        User?          @relation("BudgetReviewer", fields: [reviewedBy], references: [id], onDelete: SetNull)
  
  @@index([ticketId])
  @@index([status])
  @@map("budgets")
}

enum BudgetStatus {
  DRAFT           // 草稿
  SUBMITTED       // 已提交
  APPROVED        // 已批准
  REJECTED        // 已驳回
}
```

#### 2.1.4 立项表（Project）

```prisma
model Project {
  id                  BigInt         @id @default(autoincrement()) @map("project_id")
  ticketId            BigInt         @unique @map("ticket_id")
  title               String         @db.VarChar(200)
  plannedStartDate    DateTime       @map("planned_start_date") @db.Date  // 计划开工日期
  plannedDuration     Int            @map("planned_duration")  // 计划工期(天)
  contractorName      String         @map("contractor_name") @db.VarChar(100)  // 乙方名称
  description         String?        @db.Text  // 立项说明
  status              ProjectStatus  @default(DRAFT)
  createdBy           BigInt         @map("created_by")  // 副主任/主管
  createdAt           DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  submittedAt         DateTime?      @map("submitted_at") @db.Timestamptz(6)
  approvedAt          DateTime?      @map("approved_at") @db.Timestamptz(6)
  
  ticket              Ticket         @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  creator             User           @relation(fields: [createdBy], references: [id], onDelete: Cascade)
  
  @@index([ticketId])
  @@index([status])
  @@map("projects")
}

enum ProjectStatus {
  DRAFT           // 草稿
  PENDING         // 待审批
  APPROVED        // 已批准
  REJECTED        // 已驳回
  IN_PROGRESS     // 施工中（第二阶段）
  COMPLETED       // 已完成（第二阶段）
}
```

### 2.2 扩展现有表

#### 2.2.1 Ticket表扩展

```prisma
// 在现有Ticket表中添加字段
model Ticket {
  // ... 现有字段 ...
  
  // 新增字段
  location         String?        @db.VarChar(200)  // 报修位置
  currentPhase     Phase          @default(REPAIR) @map("current_phase")  // 当前阶段
  currentStep      Int?           @map("current_step")  // 当前步骤
  
  // 新增关联
  approvalFlow     ApprovalFlow?
  budget           Budget?
  project          Project?
}

enum Phase {
  REPAIR      // 报修阶段
  BUDGET      // 预算阶段
  PROJECT     // 立项阶段
  CERTIFICATE // 签证阶段（第二阶段）
  ACCEPTANCE  // 验收阶段（第二阶段）
  COMPLETED   // 已完成
}
```

#### 2.2.2 User表扩展

```prisma
// 在现有User表中添加字段
model User {
  // ... 现有字段 ...
  
  // 新增字段
  employeeId       String?        @map("employee_id") @db.VarChar(20)  // 工号
  isExternal       Boolean        @default(false) @map("is_external")  // 是否外部用户（乙方）
  organization     String?        @db.VarChar(100)  // 所属单位（乙方）
  
  // 新增关联
  approvalSteps    ApprovalStep[]
  budgetsCreated   Budget[]       @relation("BudgetCreator")
  budgetsReviewed  Budget[]       @relation("BudgetReviewer")
  projectsCreated  Project[]
}
```

### 2.3 新增角色定义

需要在Role表中添加以下角色（通过seed脚本）:

```typescript
const NEW_ROLES = [
  { code: 'REPORTER', name: '报修人', description: '创建报修单' },
  { code: 'VICE_DIRECTOR', name: '副主任/主管', description: '审核报修、预算，发起立项' },
  { code: 'DEPT_MANAGER', name: '部门主管', description: '立项一级审核' },
  { code: 'VICE_LEADER', name: '分管领导', description: '立项二级审核' },
  { code: 'TOP_LEADER', name: '一把手', description: '立项终审' },
  { code: 'DATA_ADMIN', name: '资料员', description: '签证格式审核（第二阶段）' },
  { code: 'INSPECTOR', name: '监察人员', description: '现场验收（第二阶段）' },
  { code: 'FINANCE', name: '财务人员', description: '费用确认（第二阶段）' },
  { code: 'CONTRACTOR', name: '乙方维修人员', description: '编制预算、上传签证' },
];
```

---

## 三、实施步骤详解

### 阶段划分

**Day 1-2**: 数据库设计与迁移  
**Day 3-5**: 审批引擎核心服务  
**Day 6-7**: 立项管理服务  
**Day 8**: 简化预算管理  
**Day 9**: 报修审核  
**Day 10-11**: 前端界面（MVP）  
**Day 12**: 集成测试与部署  

---

### Day 1-2: 数据库设计与迁移

#### 任务1.1: 扩展Prisma Schema

**文件**: `backend/prisma/schema.prisma`

**操作**:
1. 添加新的枚举类型（ApprovalType, FlowStatus, StepStatus, BudgetStatus, ProjectStatus, Phase）
2. 添加新表（ApprovalFlow, ApprovalStep, Budget, Project）
3. 扩展Ticket表（location, currentPhase, currentStep）
4. 扩展User表（employeeId, isExternal, organization）
5. 添加必要的索引和关联关系

**验证**:
- [ ] `npx prisma format` 格式化成功
- [ ] `npx prisma validate` 验证通过
- [ ] 无语法错误

#### 任务1.2: 创建数据库迁移

**命令**:
```bash
cd backend
npx prisma migrate dev --name add_approval_workflow_phase1
```

**验证**:
- [ ] 迁移文件生成成功
- [ ] 迁移执行成功
- [ ] 数据库表创建成功

#### 任务1.3: 创建角色和权限种子数据

**文件**: `backend/src/modules/approval/seeds/roles-phase1.seed.ts`

**内容**:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedRolesPhase1() {
  console.log('开始初始化第一阶段角色...');
  
  const roles = [
    { code: 'REPORTER', name: '报修人', description: '创建报修单' },
    { code: 'VICE_DIRECTOR', name: '副主任/主管', description: '审核报修、预算，发起立项' },
    { code: 'DEPT_MANAGER', name: '部门主管', description: '立项一级审核' },
    { code: 'VICE_LEADER', name: '分管领导', description: '立项二级审核' },
    { code: 'TOP_LEADER', name: '一把手', description: '立项终审' },
    { code: 'CONTRACTOR', name: '乙方维修人员', description: '编制预算' },
  ];
  
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: { ...role, isSystem: 1 },
    });
  }
  
  console.log('角色初始化完成');
  
  // 创建权限
  const permissions = [
    { resource: 'repair', action: 'review', description: '审核报修单' },
    { resource: 'budget', action: 'create', description: '创建预算单' },
    { resource: 'budget', action: 'review', description: '审核预算单' },
    { resource: 'project', action: 'create', description: '发起立项' },
    { resource: 'project', action: 'approve_level1', description: '立项一级审核' },
    { resource: 'project', action: 'approve_level2', description: '立项二级审核' },
    { resource: 'project', action: 'approve_level3', description: '立项终审' },
  ];
  
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { 
        resource_action: { 
          resource: perm.resource, 
          action: perm.action 
        } 
      },
      update: perm,
      create: perm,
    });
  }
  
  console.log('权限初始化完成');
}

seedRolesPhase1()
  .then(() => {
    console.log('种子数据初始化成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('种子数据初始化失败:', error);
    process.exit(1);
  });
```

**执行**:
```bash
npx ts-node src/modules/approval/seeds/roles-phase1.seed.ts
```

**验证**:
- [ ] 6个新角色创建成功
- [ ] 7个新权限创建成功

#### 任务1.4: 准备测试数据

**文件**: `backend/src/modules/approval/seeds/test-users.seed.ts`

**内容**: 创建各角色的测试用户
- 报修人: reporter1 (密码: Test1234)
- 副主任: vice_director1 (密码: Test1234)
- 部门主管: dept_manager1 (密码: Test1234)
- 分管领导: vice_leader1 (密码: Test1234)
- 一把手: top_leader1 (密码: Test1234)
- 乙方人员: contractor1 (密码: Test1234, isExternal: true)

---

### Day 3-5: 审批引擎核心服务

#### 任务2.1: 创建审批模块基础结构

**目录结构**:
```
backend/src/modules/approval/
├── approval.module.ts
├── approval.service.ts
├── approval.service.spec.ts
├── approval.controller.ts
├── dto/
│   ├── create-approval-flow.dto.ts
│   ├── approve-step.dto.ts
│   ├── reject-step.dto.ts
│   └── query-approval.dto.ts
├── interfaces/
│   ├── approval-config.interface.ts
│   └── approval-step-config.interface.ts
├── guards/
│   └── approval-permission.guard.ts
└── seeds/
    ├── roles-phase1.seed.ts
    └── test-users.seed.ts
```

#### 任务2.2: 实现审批服务核心逻辑

**文件**: `backend/src/modules/approval/approval.service.ts`

**核心方法**:

```typescript
@Injectable()
export class ApprovalService {
  constructor(private readonly prisma: PrismaService) {}
  
  /**
   * 创建审批流程
   * @param ticketId 工单ID
   * @param type 审批类型
   * @param steps 审批步骤配置
   */
  async createFlow(
    ticketId: number,
    type: ApprovalType,
    steps: StepConfig[],
  ): Promise<ApprovalFlow> {
    // 实现逻辑：
    // 1. 验证工单存在
    // 2. 检查是否已有审批流程
    // 3. 创建ApprovalFlow记录
    // 4. 批量创建ApprovalStep记录
    // 5. 更新Ticket的currentPhase和currentStep
    // 6. 发送通知给第一个审批人
  }
  
  /**
   * 审批通过
   * @param flowId 流程ID
   * @param stepNumber 当前步骤号
   * @param approverId 审批人ID
   * @param comment 审批意见
   */
  async approve(
    flowId: number,
    stepNumber: number,
    approverId: number,
    comment?: string,
  ): Promise<ApprovalFlow> {
    // 实现逻辑：
    // 1. 验证审批人权限
    // 2. 更新当前步骤状态为APPROVED
    // 3. 记录审批时间和意见
    // 4. 判断是否为最后一步
    //    - 是：更新流程状态为APPROVED，更新Ticket阶段
    //    - 否：推进到下一步，通知下一个审批人
    // 5. 记录操作日志
    // 6. 发送通知
  }
  
  /**
   * 驳回（逐级退回）
   * @param flowId 流程ID
   * @param stepNumber 当前步骤号
   * @param approverId 审批人ID
   * @param comment 驳回原因（必填）
   */
  async reject(
    flowId: number,
    stepNumber: number,
    approverId: number,
    comment: string,
  ): Promise<ApprovalFlow> {
    // 实现逻辑：
    // 1. 验证审批人权限
    // 2. 验证驳回原因必填
    // 3. 更新当前步骤状态为REJECTED
    // 4. 记录驳回时间和原因
    // 5. 逐级退回逻辑：
    //    - 如果是第一步：更新流程状态为REJECTED，通知创建人
    //    - 如果不是第一步：将上一步状态重置为PENDING，通知上一级审批人
    // 6. 更新Ticket的currentStep
    // 7. 记录操作日志
    // 8. 发送驳回通知
  }
  
  /**
   * 查询审批流程
   * @param ticketId 工单ID
   */
  async getFlowByTicketId(ticketId: number): Promise<ApprovalFlow | null> {
    return this.prisma.approvalFlow.findUnique({
      where: { ticketId },
      include: {
        steps: {
          include: { approver: true },
          orderBy: { stepNumber: 'asc' },
        },
        ticket: true,
      },
    });
  }
  
  /**
   * 查询待审批列表（我的待办）
   * @param userId 用户ID
   */
  async getPendingApprovals(userId: number): Promise<ApprovalStep[]> {
    // 根据用户角色查询待审批的步骤
    const userRoles = await this.getUserRoles(userId);
    
    return this.prisma.approvalStep.findMany({
      where: {
        status: StepStatus.PENDING,
        approverRole: { in: userRoles.map(r => r.code) },
      },
      include: {
        flow: {
          include: { ticket: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
  
  /**
   * 获取用户角色
   */
  private async getUserRoles(userId: number): Promise<Role[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return userRoles.map(ur => ur.role);
  }
}
```

**配置接口**: `backend/src/modules/approval/interfaces/approval-config.interface.ts`

```typescript
export interface StepConfig {
  stepNumber: number;
  stepName: string;
  approverRole: string;
}

export const APPROVAL_CONFIGS = {
  // 报修审核配置
  REPAIR_REVIEW: [
    { stepNumber: 1, stepName: '副主任审核', approverRole: 'VICE_DIRECTOR' },
  ],
  
  // 预算审核配置
  BUDGET_REVIEW: [
    { stepNumber: 1, stepName: '副主任审核', approverRole: 'VICE_DIRECTOR' },
  ],
  
  // 立项审批配置（三级）
  PROJECT_APPROVAL: [
    { stepNumber: 1, stepName: '一级审核', approverRole: 'DEPT_MANAGER' },
    { stepNumber: 2, stepName: '二级审核', approverRole: 'VICE_LEADER' },
    { stepNumber: 3, stepName: '终审', approverRole: 'TOP_LEADER' },
  ],
};
```

#### 任务2.3: 实现审批控制器

**文件**: `backend/src/modules/approval/approval.controller.ts`

**API端点**:

```typescript
@Controller('api/v1/approvals')
@UseGuards(JwtAuthGuard)
export class ApprovalController {
  constructor(private readonly approvalService: ApprovalService) {}
  
  // GET /api/v1/approvals/ticket/:ticketId
  // 查询工单的审批流程
  @Get('ticket/:ticketId')
  async getFlowByTicketId(@Param('ticketId') ticketId: string) {
    // ...
  }
  
  // GET /api/v1/approvals/pending
  // 查询我的待审批列表
  @Get('pending')
  async getMyPendingApprovals(@CurrentUser() user) {
    // ...
  }
  
  // POST /api/v1/approvals/:flowId/steps/:stepNumber/approve
  // 审批通过
  @Post(':flowId/steps/:stepNumber/approve')
  async approve(
    @Param('flowId') flowId: string,
    @Param('stepNumber') stepNumber: string,
    @Body() dto: ApproveStepDto,
    @CurrentUser() user,
  ) {
    // ...
  }
  
  // POST /api/v1/approvals/:flowId/steps/:stepNumber/reject
  // 审批驳回
  @Post(':flowId/steps/:stepNumber/reject')
  async reject(
    @Param('flowId') flowId: string,
    @Param('stepNumber') stepNumber: string,
    @Body() dto: RejectStepDto,
    @CurrentUser() user,
  ) {
    // dto.comment 驳回原因必填
  }
}
```

#### 任务2.4: 编写单元测试

**文件**: `backend/src/modules/approval/approval.service.spec.ts`

**测试用例**:
- [ ] 创建审批流程
- [ ] 单级审批通过
- [ ] 三级审批通过（完整流程）
- [ ] 第一级驳回（直接退回创建人）
- [ ] 第二级驳回（退回第一级）
- [ ] 第三级驳回（退回第二级）
- [ ] 重新审批流程
- [ ] 查询待审批列表
- [ ] 权限验证

---

### Day 6-7: 立项管理服务

#### 任务3.1: 创建立项服务

**文件**: `backend/src/modules/project/project.service.ts`

**核心方法**:

```typescript
@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly notificationService: NotificationService,
  ) {}
  
  /**
   * 发起立项审批
   * REQ-05: 副主任/主管发起立项
   */
  async initiateProject(
    ticketId: number,
    dto: InitiateProjectDto,
    userId: number,
  ): Promise<Project> {
    // 1. 验证用户是副主任/主管角色
    // 2. 验证工单状态（必须预算已审核）
    // 3. 创建Project记录
    // 4. 创建审批流程（三级审批）
    // 5. 更新Ticket的currentPhase为PROJECT
    // 6. 通知第一级审批人（部门主管）
  }
  
  /**
   * 查询立项详情
   */
  async getProject(ticketId: number): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { ticketId },
      include: {
        ticket: { include: { approvalFlow: { include: { steps: true } } } },
        creator: true,
      },
    });
  }
  
  /**
   * 更新立项（仅草稿状态可更新）
   */
  async updateProject(
    ticketId: number,
    dto: UpdateProjectDto,
    userId: number,
  ): Promise<Project> {
    // 只有创建人可以更新
    // 只有DRAFT或REJECTED状态可以更新
  }
}
```

**DTO**: `backend/src/modules/project/dto/initiate-project.dto.ts`

```typescript
export class InitiateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  
  @IsDateString()
  plannedStartDate: string;  // YYYY-MM-DD
  
  @IsInt()
  @Min(1)
  @Max(365)
  plannedDuration: number;  // 计划工期(天)
  
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contractorName: string;  // 乙方名称
  
  @IsOptional()
  @IsString()
  description?: string;  // 立项说明
}
```

#### 任务3.2: 创建立项控制器

**文件**: `backend/src/modules/project/project.controller.ts`

**API端点**:

```typescript
@Controller('api/v1/projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  // POST /api/v1/projects/ticket/:ticketId
  // 发起立项审批
  @Post('ticket/:ticketId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('project:create')
  async initiateProject(
    @Param('ticketId') ticketId: string,
    @Body() dto: InitiateProjectDto,
    @CurrentUser() user,
  ) {
    // ...
  }
  
  // GET /api/v1/projects/ticket/:ticketId
  // 查询立项详情
  @Get('ticket/:ticketId')
  async getProject(@Param('ticketId') ticketId: string) {
    // ...
  }
  
  // PATCH /api/v1/projects/ticket/:ticketId
  // 更新立项（仅草稿或被驳回时）
  @Patch('ticket/:ticketId')
  async updateProject(
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user,
  ) {
    // ...
  }
}
```

---

### Day 8: 简化预算管理

#### 任务4.1: 创建预算服务

**文件**: `backend/src/modules/budget/budget.service.ts`

**核心方法**:

```typescript
@Injectable()
export class BudgetService {
  /**
   * 乙方提交预算
   * REQ-03: 乙方接单与预算编制
   */
  async submitBudget(
    ticketId: number,
    dto: SubmitBudgetDto,
    userId: number,
  ): Promise<Budget> {
    // 1. 验证用户是乙方角色
    // 2. 验证工单状态（必须报修已审核）
    // 3. 创建Budget记录
    // 4. 创建审批流程（副主任审核）
    // 5. 更新Ticket的currentPhase为BUDGET
    // 6. 通知副主任审核
  }
  
  /**
   * 副主任审核预算
   * REQ-04: 预算审核
   */
  async reviewBudget(
    budgetId: number,
    approved: boolean,
    comment: string,
    userId: number,
  ): Promise<Budget> {
    // 通过审批服务处理
  }
}
```

**DTO**: `backend/src/modules/budget/dto/submit-budget.dto.ts`

```typescript
export class SubmitBudgetDto {
  @IsNumber()
  @Min(0)
  amount: number;
  
  @IsString()
  @IsNotEmpty()
  description: string;
  
  @IsOptional()
  @IsArray()
  attachments?: string[];  // 预算文件URL数组
}
```

---

### Day 9: 报修审核

#### 任务5.1: 扩展Tickets服务

**文件**: `backend/src/modules/tickets/tickets.service.ts`

**新增方法**:

```typescript
/**
 * 副主任审核报修
 * REQ-02: 副主任审核报修单
 */
async reviewRepair(
  ticketId: number,
  approved: boolean,
  comment: string,
  userId: number,
): Promise<Ticket> {
  // 1. 验证用户是副主任角色
  // 2. 验证工单状态为OPEN
  // 3. 创建审批流程（REPAIR_REVIEW）
  // 4. 如果通过：更新状态，推送给乙方
  // 5. 如果驳回：通知报修人修改
}
```

**新增API端点**:

```typescript
// POST /api/v1/tickets/:id/review
// 副主任审核报修
@Post(':id/review')
@UseGuards(PermissionsGuard)
@RequirePermissions('repair:review')
async reviewRepair(
  @Param('id') id: string,
  @Body() dto: ReviewRepairDto,
  @CurrentUser() user,
) {
  // ...
}
```

---

### Day 10-11: 前端界面（MVP）

#### 前端技术栈确认
- React 18
- TypeScript
- Ant Design (UI组件库)
- React Query (数据管理)
- React Router (路由)

#### 任务6.1: 创建类型定义

**文件**: `frontend/src/types/approval.ts`

```typescript
export interface ApprovalFlow {
  id: string;
  ticketId: string;
  type: 'REPAIR_REVIEW' | 'BUDGET_REVIEW' | 'PROJECT_APPROVAL';
  currentStep: number;
  totalSteps: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  completedAt?: string;
  steps: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  stepNumber: number;
  stepName: string;
  approverRole: string;
  approverId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comment?: string;
  approvedAt?: string;
  rejectedAt?: string;
  approver?: User;
}

export interface Project {
  id: string;
  ticketId: string;
  title: string;
  plannedStartDate: string;
  plannedDuration: number;
  contractorName: string;
  description?: string;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface Budget {
  id: string;
  ticketId: string;
  amount: number;
  description: string;
  attachments?: string[];
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}
```

#### 任务6.2: 创建API服务

**文件**: `frontend/src/services/approvalApi.ts`

```typescript
export const approvalApi = {
  // 查询审批流程
  getFlowByTicketId: (ticketId: string) =>
    axios.get<ApiResponse<ApprovalFlow>>(`/api/v1/approvals/ticket/${ticketId}`),
  
  // 查询待审批列表
  getMyPendingApprovals: () =>
    axios.get<ApiResponse<ApprovalStep[]>>(`/api/v1/approvals/pending`),
  
  // 审批通过
  approve: (flowId: string, stepNumber: number, comment?: string) =>
    axios.post(`/api/v1/approvals/${flowId}/steps/${stepNumber}/approve`, { comment }),
  
  // 审批驳回
  reject: (flowId: string, stepNumber: number, comment: string) =>
    axios.post(`/api/v1/approvals/${flowId}/steps/${stepNumber}/reject`, { comment }),
};

export const projectApi = {
  // 发起立项
  initiateProject: (ticketId: string, data: InitiateProjectDto) =>
    axios.post<ApiResponse<Project>>(`/api/v1/projects/ticket/${ticketId}`, data),
  
  // 查询立项详情
  getProject: (ticketId: string) =>
    axios.get<ApiResponse<Project>>(`/api/v1/projects/ticket/${ticketId}`),
};

export const budgetApi = {
  // 提交预算
  submitBudget: (ticketId: string, data: SubmitBudgetDto) =>
    axios.post<ApiResponse<Budget>>(`/api/v1/budgets/ticket/${ticketId}`, data),
};
```

#### 任务6.3: 创建页面组件

**页面列表**:
1. 待审批列表页 (`frontend/src/pages/Approval/PendingList.tsx`)
2. 立项发起页 (`frontend/src/pages/Project/InitiateProject.tsx`)
3. 立项详情页 (`frontend/src/pages/Project/ProjectDetail.tsx`)
4. 审批历史组件 (`frontend/src/components/ApprovalHistory.tsx`)
5. 审批操作组件 (`frontend/src/components/ApprovalActions.tsx`)

**示例**: 待审批列表页

```typescript
export const PendingApprovalList: React.FC = () => {
  const { data, isLoading } = useQuery('pendingApprovals', 
    () => approvalApi.getMyPendingApprovals()
  );
  
  return (
    <Card title="待审批列表">
      <Table
        loading={isLoading}
        dataSource={data?.data}
        columns={[
          { title: '工单编号', dataIndex: ['flow', 'ticket', 'number'] },
          { title: '工单标题', dataIndex: ['flow', 'ticket', 'title'] },
          { title: '审批环节', dataIndex: 'stepName' },
          { title: '提交时间', dataIndex: 'createdAt', render: formatDate },
          { 
            title: '操作', 
            render: (_, record) => (
              <Space>
                <Button type="primary" onClick={() => handleApprove(record)}>
                  通过
                </Button>
                <Button danger onClick={() => handleReject(record)}>
                  驳回
                </Button>
              </Space>
            )
          },
        ]}
      />
    </Card>
  );
};
```

#### 任务6.4: 创建审批历史组件

**文件**: `frontend/src/components/ApprovalHistory.tsx`

显示审批流程的时间轴，包括：
- 每一步的审批人、时间、意见
- 当前所处步骤
- 审批状态（待审批/已通过/已驳回）

---

### Day 12: 集成测试与部署

#### 任务7.1: 端到端测试

**测试场景**:

1. **完整立项审批流程**:
   - 报修人创建工单
   - 副主任审核报修（通过）
   - 乙方提交预算
   - 副主任审核预算（通过）
   - 副主任发起立项
   - 部门主管审核（通过）
   - 分管领导审核（通过）
   - 一把手终审（通过）
   - 验证工单状态变化

2. **逐级驳回流程**:
   - 一把手驳回 → 退回分管领导
   - 分管领导重新审核通过 → 再次提交一把手
   - 一把手通过

3. **第一级驳回流程**:
   - 部门主管驳回 → 退回副主任
   - 副主任修改后重新提交

**手动测试清单**:
- [ ] 报修审核流程
- [ ] 预算提交和审核
- [ ] 立项发起
- [ ] 立项三级审批
- [ ] 逐级驳回机制
- [ ] 通知推送
- [ ] 权限验证
- [ ] 前端界面交互

#### 任务7.2: API文档更新

更新Swagger文档，确保所有新接口都有完整的文档说明。

#### 任务7.3: 部署准备

1. 数据库迁移脚本准备
2. 环境变量配置
3. 角色和权限初始化脚本
4. 测试用户创建脚本
5. 部署文档更新

---

## 四、关键决策点

### 4.1 逐级驳回实现方案

**选择方案**: 状态重置法

当第N步驳回时：
1. 第N步状态设为REJECTED
2. 第N-1步状态重置为PENDING
3. currentStep回退到N-1
4. 通知第N-1步的审批人重新审批

**优点**:
- 逻辑清晰
- 保留完整审批历史
- 易于追溯

### 4.2 审批人分配方式

**选择方案**: 角色匹配

- 不预先指定具体审批人
- 根据步骤的approverRole，查询该角色的所有用户
- 用户在"待审批列表"中看到属于自己角色的待办
- 谁先审批谁就成为该步骤的实际审批人（approverId）

**优点**:
- 灵活，不需要预先配置审批人
- 支持角色内的多人协作
- 避免审批人不在时的阻塞

### 4.3 通知策略

**通知时机**:
- 审批流程创建 → 通知第一个审批人
- 审批通过 → 通知下一个审批人
- 审批驳回 → 通知上一个审批人或创建人
- 审批完成 → 通知创建人和相关人

**通知方式**:
- 站内通知（必须）
- 邮件通知（可配置）

---

## 五、风险识别与应对

### 5.1 技术风险

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|---------|
| 逐级驳回逻辑复杂 | 中 | 高 | 充分单元测试，画状态流转图 |
| 数据库性能 | 低 | 中 | 添加必要索引，使用explain分析 |
| 通知延迟 | 低 | 低 | 异步处理，监控队列 |
| 前端状态同步 | 中 | 中 | 使用React Query缓存刷新 |

### 5.2 业务风险

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|---------|
| 需求理解偏差 | 中 | 高 | 与用户充分沟通，演示确认 |
| 审批流程变更 | 低 | 中 | 配置化设计，易于调整 |
| 角色权限混乱 | 中 | 中 | 完整的权限测试 |

---

## 六、验收标准

### 6.1 功能验收

- [ ] 副主任可以审核报修单
- [ ] 乙方可以提交预算
- [ ] 副主任可以审核预算
- [ ] 副主任可以发起立项
- [ ] 部门主管可以进行一级审核
- [ ] 分管领导可以进行二级审核
- [ ] 一把手可以进行终审（意见必填）
- [ ] 逐级驳回机制正确运行
- [ ] 审批历史完整记录
- [ ] 通知推送及时

### 6.2 性能验收

- [ ] API响应时间 < 500ms
- [ ] 审批操作响应时间 < 1s
- [ ] 待审批列表加载 < 2s
- [ ] 支持并发审批（不同工单）

### 6.3 安全验收

- [ ] 角色权限正确控制
- [ ] 不能越权审批
- [ ] 审批记录不可篡改
- [ ] 操作日志完整

---

## 七、交付物清单

### 7.1 后端代码
- [ ] 数据库Schema扩展
- [ ] 数据库迁移脚本
- [ ] 审批服务（approval模块）
- [ ] 立项服务（project模块）
- [ ] 预算服务（budget模块）
- [ ] Tickets服务扩展
- [ ] API控制器
- [ ] 单元测试（覆盖率≥80%）
- [ ] 角色和权限种子数据
- [ ] API文档（Swagger）

### 7.2 前端代码
- [ ] 类型定义
- [ ] API服务层
- [ ] 待审批列表页
- [ ] 立项发起页
- [ ] 立项详情页
- [ ] 审批历史组件
- [ ] 审批操作组件
- [ ] 路由配置

### 7.3 文档
- [ ] 数据库设计文档
- [ ] API接口文档
- [ ] 部署文档
- [ ] 测试报告
- [ ] 用户操作手册

---

## 八、下一阶段预告

第二阶段将实现：
- 签证管理（双路并行审核）
- 验收管理（双路并行审核）
- 结案单自动生成
- 催办通知
- 移动端优化

---

**计划制定完成**  
**等待审批启动开发** ✅
