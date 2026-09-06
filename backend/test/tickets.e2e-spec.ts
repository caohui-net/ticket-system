import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tickets E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: bigint;
  let testTicketId: bigint;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // 清理测试数据
    await prisma.ticketAttachment.deleteMany();
    await prisma.ticketLog.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        password: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', // 加密后的密码
        realName: '测试用户',
        email: 'test@example.com',
      },
    });
    testUserId = user.id;

    // 获取认证token（需要先实现登录）
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('POST /api/v1/tickets - 创建工单', () => {
    it('应该成功创建工单', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '测试工单',
          description: '这是一个测试工单',
          type: 'ISSUE',
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('number');
      expect(response.body.title).toBe('测试工单');
      expect(response.body.status).toBe('OPEN');
      testTicketId = response.body.id;
    });

    it('缺少必填字段应该返回400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '缺少标题',
        })
        .expect(400);
    });

    it('未认证应该返回401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .send({
          title: '测试',
          description: '测试',
          type: 'ISSUE',
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/tickets - 查询工单列表', () => {
    it('应该返回工单列表', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('支持分页查询', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tickets?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.pageSize).toBe(10);
    });

    it('支持状态过滤', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/tickets?status=OPEN')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.data.forEach((ticket: any) => {
        expect(ticket.status).toBe('OPEN');
      });
    });
  });

  describe('GET /api/v1/tickets/:id - 查询单个工单', () => {
    it('应该返回工单详情', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testTicketId.toString());
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('logs');
      expect(response.body).toHaveProperty('attachments');
    });

    it('不存在的工单应该返回404', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tickets/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tickets/:id - 更新工单', () => {
    it('应该成功更新工单', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: '更新后的标题',
          priority: 'HIGH',
        })
        .expect(200);

      expect(response.body.title).toBe('更新后的标题');
      expect(response.body.priority).toBe('HIGH');
    });
  });

  describe('POST /api/v1/tickets/:id/assign - 分配工单', () => {
    it('应该成功分配工单', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/tickets/${testTicketId}/assign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          assigneeId: testUserId.toString(),
        })
        .expect(200);

      expect(response.body.assigneeId).toBe(testUserId.toString());
      expect(response.body.assignedAt).toBeDefined();
    });
  });

  describe('PATCH /api/v1/tickets/:id/status - 变更状态', () => {
    it('应该成功变更状态', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tickets/${testTicketId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PROGRESS',
        })
        .expect(200);

      expect(response.body.status).toBe('IN_PROGRESS');
    });

    it('标记为已解决应该设置resolvedAt', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/tickets/${testTicketId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'RESOLVED',
        })
        .expect(200);

      expect(response.body.status).toBe('RESOLVED');
      expect(response.body.resolvedAt).toBeDefined();
    });
  });

  describe('DELETE /api/v1/tickets/:id - 删除工单', () => {
    it('应该成功删除工单（软删除）', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tickets/${testTicketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 验证工单已隐藏
      const ticket = await prisma.ticket.findUnique({
        where: { id: testTicketId },
      });
      expect(ticket.hidden).toBe(true);
    });
  });
});
