import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 端到端测试：完整审批流程
 * 测试从报修到立项审批完成的完整流程
 */
describe('完整审批流程 E2E测试', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // 存储测试数据
  let tokens = {
    reporter: '',
    viceDirector: '',
    deptManager: '',
    viceLeader: '',
    topLeader: '',
    contractor: '',
  };

  let ticketId: number;
  let budgetId: number;
  let projectId: number;
  let flowId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 应用全局配置（与main.ts保持一致）
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/db', 'health/redis', 'health/all'],
    });

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // 清理测试数据
    if (ticketId) {
      await prisma.ticket.delete({ where: { id: BigInt(ticketId) } }).catch(() => {});
    }

    await app.close();
  });

  describe('步骤1: 用户登录', () => {
    it('报修人登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'reporter1',
          password: 'Test1234',
        })
        .expect(200);

      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      tokens.reporter = response.body.tokens.accessToken;
    });

    it('副主任登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'vice_director1',
          password: 'Test1234',
        })
        .expect(200);

      tokens.viceDirector = response.body.tokens.accessToken;
    });

    it('部门主管登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'dept_manager1',
          password: 'Test1234',
        })
        .expect(200);

      tokens.deptManager = response.body.tokens.accessToken;
    });

    it('分管领导登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'vice_leader1',
          password: 'Test1234',
        })
        .expect(200);

      tokens.viceLeader = response.body.tokens.accessToken;
    });

    it('一把手登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'top_leader1',
          password: 'Test1234',
        })
        .expect(200);

      tokens.topLeader = response.body.tokens.accessToken;
    });

    it('乙方登录', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          username: 'contractor1',
          password: 'Test1234',
        })
        .expect(200);

      tokens.contractor = response.body.tokens.accessToken;
    });
  });

  describe('步骤2: 报修流程', () => {
    it('报修人创建工单', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .send({
          title: 'E2E测试：教学楼空调故障',
          description: '空调无法启动，需要维修',
          type: 'ISSUE',
          priority: 'HIGH',
          location: '教学楼A栋301',
          tags: ['空调', '测试'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      ticketId = response.body.data.id;
    });

    it('副主任审核报修通过', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tickets/${ticketId}/review`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({
          approved: true,
          comment: 'E2E测试：同意维修',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('查询工单状态应为处理中', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .expect(200);

      expect(response.body.data.status).toBe('IN_PROGRESS');
      expect(response.body.data.currentPhase).toBe('BUDGET');
    });
  });

  describe('步骤3: 预算流程', () => {
    it('乙方提交预算', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/ticket/${ticketId}`)
        .set('Authorization', `Bearer ${tokens.contractor}`)
        .send({
          amount: 5000.0,
          description: 'E2E测试：空调维修预算\n1. 更换压缩机：3000元\n2. 人工费：2000元',
          attachments: ['https://example.com/budget.pdf'],
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      budgetId = response.body.data.id;
    });

    it('副主任审核预算通过', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budgetId}/review`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({
          approved: true,
          comment: 'E2E测试：预算合理',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('步骤4: 立项流程', () => {
    it('副主任发起立项', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/projects/ticket/${ticketId}`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({
          title: 'E2E测试：教学楼空调维修立项',
          plannedStartDate: '2026-09-15',
          plannedDuration: 5,
          contractorName: '华建维修公司',
          description: 'E2E测试项目',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBeDefined();
      projectId = response.body.data.id;
    });

    it('查询审批流程', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/ticket/${ticketId}`)
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.type).toBe('PROJECT_APPROVAL');
      expect(response.body.data.totalSteps).toBe(3);
      expect(response.body.data.currentStep).toBe(1);
      flowId = response.body.data.id;
    });

    it('部门主管查询待审批列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/approvals/pending')
        .set('Authorization', `Bearer ${tokens.deptManager}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('部门主管一级审核通过', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/${flowId}/steps/1/approve`)
        .set('Authorization', `Bearer ${tokens.deptManager}`)
        .send({
          comment: 'E2E测试：一级审核通过',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(2);
    });

    it('分管领导二级审核通过', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/${flowId}/steps/2/approve`)
        .set('Authorization', `Bearer ${tokens.viceLeader}`)
        .send({
          comment: 'E2E测试：二级审核通过',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(3);
    });

    it('一把手终审通过', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/${flowId}/steps/3/approve`)
        .set('Authorization', `Bearer ${tokens.topLeader}`)
        .send({
          comment: 'E2E测试：终审通过',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('APPROVED');
    });

    it('验证审批流程最终状态', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/ticket/${ticketId}`)
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .expect(200);

      expect(response.body.data.status).toBe('APPROVED');
      expect(response.body.data.steps).toHaveLength(3);
      expect(response.body.data.steps.every((s) => s.status === 'APPROVED')).toBe(true);
    });
  });

  describe('步骤5: 驳回流程测试', () => {
    let rejectTicketId: number;
    let rejectFlowId: number;

    it('创建测试工单用于驳回测试', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .send({
          title: 'E2E测试：驳回流程测试',
          description: '用于测试驳回逻辑',
          type: 'ISSUE',
          priority: 'MEDIUM',
        })
        .expect(201);

      rejectTicketId = response.body.data.id;

      // 副主任审核通过
      await request(app.getHttpServer())
        .post(`/api/v1/tickets/${rejectTicketId}/review`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({ approved: true, comment: '通过' })
        .expect(201);

      // 乙方提交预算
      const budgetRes = await request(app.getHttpServer())
        .post(`/api/v1/budgets/ticket/${rejectTicketId}`)
        .set('Authorization', `Bearer ${tokens.contractor}`)
        .send({ amount: 3000, description: '测试预算' })
        .expect(201);

      // 副主任审核预算通过
      await request(app.getHttpServer())
        .post(`/api/v1/budgets/${budgetRes.body.data.id}/review`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({ approved: true, comment: '通过' })
        .expect(201);

      // 发起立项
      await request(app.getHttpServer())
        .post(`/api/v1/projects/ticket/${rejectTicketId}`)
        .set('Authorization', `Bearer ${tokens.viceDirector}`)
        .send({
          title: '测试立项',
          plannedStartDate: '2026-09-20',
          plannedDuration: 3,
          contractorName: '测试公司',
        })
        .expect(201);

      // 获取流程ID
      const flowRes = await request(app.getHttpServer())
        .get(`/api/v1/approvals/ticket/${rejectTicketId}`)
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .expect(200);

      rejectFlowId = flowRes.body.data.id;
    });

    it('部门主管一级审核通过', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/approvals/${rejectFlowId}/steps/1/approve`)
        .set('Authorization', `Bearer ${tokens.deptManager}`)
        .send({ comment: '一级通过' })
        .expect(201);
    });

    it('分管领导二级驳回（应退回到一级）', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/approvals/${rejectFlowId}/steps/2/reject`)
        .set('Authorization', `Bearer ${tokens.viceLeader}`)
        .send({
          comment: 'E2E测试：需要重新审核，退回一级',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentStep).toBe(1);
    });

    it('验证步骤1状态已重置为PENDING', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/approvals/ticket/${rejectTicketId}`)
        .set('Authorization', `Bearer ${tokens.reporter}`)
        .expect(200);

      const step1 = response.body.data.steps.find((s) => s.stepNumber === 1);
      const step2 = response.body.data.steps.find((s) => s.stepNumber === 2);

      expect(step1.status).toBe('PENDING');
      expect(step2.status).toBe('REJECTED');
    });

    // 清理测试数据
    afterAll(async () => {
      if (rejectTicketId) {
        await prisma.ticket.delete({ where: { id: BigInt(rejectTicketId) } }).catch(() => {});
      }
    });
  });
});
