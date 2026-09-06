import { Test, TestingModule } from '@nestjs/testing';
import { StatisticsService } from './statistics.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketPriority, TicketStatus } from '@prisma/client';

describe('StatisticsService', () => {
  let service: StatisticsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    ticket: {
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatisticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StatisticsService>(StatisticsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('应该返回概览统计数据', async () => {
      const now = new Date('2026-09-06T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      mockPrismaService.ticket.count.mockResolvedValueOnce(100); // totalTickets
      mockPrismaService.ticket.groupBy.mockResolvedValueOnce([
        { status: TicketStatus.OPEN, _count: 10 },
        { status: TicketStatus.IN_PROGRESS, _count: 20 },
        { status: TicketStatus.RESOLVED, _count: 50 },
        { status: TicketStatus.CLOSED, _count: 20 },
      ]);
      mockPrismaService.ticket.count.mockResolvedValueOnce(5); // todayNew
      mockPrismaService.ticket.count.mockResolvedValueOnce(15); // weekNew
      mockPrismaService.ticket.count.mockResolvedValueOnce(60); // monthNew
      mockPrismaService.ticket.findMany.mockResolvedValueOnce([
        {
          assignedAt: new Date('2026-09-05T10:00:00.000Z'),
          resolvedAt: new Date('2026-09-05T12:00:00.000Z'),
          closedAt: new Date('2026-09-06T10:00:00.000Z'),
          createdAt: new Date('2026-09-05T08:00:00.000Z'),
        },
      ]);

      const result = await service.getOverview();

      expect(result).toBeDefined();
      expect(result.totalTickets).toBe(100);
      expect(result.pendingAssignTickets).toBe(10);
      expect(result.processingTickets).toBe(20);
      expect(result.completedTickets).toBe(50);
      expect(result.closedTickets).toBe(20);
      expect(result.todayNew).toBe(5);
      expect(result.weekNew).toBe(15);
      expect(result.monthNew).toBe(60);
      expect(result.avgResponseTime).toBeDefined();
      expect(result.avgResolutionTime).toBeDefined();

      jest.useRealTimers();
    });
  });

  describe('getTicketsByStatus', () => {
    it('应该返回按状态统计的数据', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(100);
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { status: TicketStatus.OPEN, _count: 10 },
        { status: TicketStatus.IN_PROGRESS, _count: 20 },
        { status: TicketStatus.RESOLVED, _count: 70 },
      ]);

      const result = await service.getTicketsByStatus();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        status: TicketStatus.OPEN,
        count: 10,
        percentage: 10,
      });
      expect(result[1]).toEqual({
        status: TicketStatus.IN_PROGRESS,
        count: 20,
        percentage: 20,
      });
      expect(result[2]).toEqual({
        status: TicketStatus.RESOLVED,
        count: 70,
        percentage: 70,
      });
    });

    it('应该处理空数据情况', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(0);
      mockPrismaService.ticket.groupBy.mockResolvedValue([]);

      const result = await service.getTicketsByStatus();

      expect(result).toEqual([]);
    });
  });

  describe('getTicketsByPriority', () => {
    it('应该返回按优先级统计的数据', async () => {
      mockPrismaService.ticket.count.mockResolvedValue(100);
      mockPrismaService.ticket.groupBy.mockResolvedValue([
        { priority: TicketPriority.LOW, _count: 10 },
        { priority: TicketPriority.MEDIUM, _count: 40 },
        { priority: TicketPriority.HIGH, _count: 30 },
        { priority: TicketPriority.URGENT, _count: 20 },
      ]);

      const result = await service.getTicketsByPriority();

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        priority: TicketPriority.LOW,
        count: 10,
        percentage: 10,
      });
      expect(result[1]).toEqual({
        priority: TicketPriority.MEDIUM,
        count: 40,
        percentage: 40,
      });
    });
  });

  describe('getTicketsTrend', () => {
    it('应该返回指定天数的趋势数据', async () => {
      const now = new Date('2026-09-06T00:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // 模拟每天的查询结果
      mockPrismaService.ticket.count
        .mockResolvedValueOnce(5) // day1 new
        .mockResolvedValueOnce(3) // day1 completed
        .mockResolvedValueOnce(8) // day2 new
        .mockResolvedValueOnce(6) // day2 completed
        .mockResolvedValueOnce(4) // day3 new
        .mockResolvedValueOnce(5); // day3 completed

      const result = await service.getTicketsTrend(3);

      expect(result).toBeDefined();
      expect(result.labels).toHaveLength(3);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('新增工单');
      expect(result.datasets[1].label).toBe('完成工单');
      expect(result.datasets[0].data).toEqual([5, 8, 4]);
      expect(result.datasets[1].data).toEqual([3, 6, 5]);

      jest.useRealTimers();
    });
  });

  describe('getUserWorkload', () => {
    it('应该返回用户工作量统计', async () => {
      const userId = BigInt(1);

      mockPrismaService.user.findMany.mockResolvedValue([
        {
          id: userId,
          username: 'testuser',
          realName: '测试用户',
          assignedTickets: [
            {
              id: BigInt(3),
              status: TicketStatus.RESOLVED,
              assignedAt: new Date('2026-09-05T10:00:00.000Z'),
              resolvedAt: new Date('2026-09-05T12:00:00.000Z'),
            },
            {
              id: BigInt(4),
              status: TicketStatus.IN_PROGRESS,
              assignedAt: new Date('2026-09-06T08:00:00.000Z'),
              resolvedAt: new Date('2026-09-06T10:00:00.000Z'),
            },
          ],
        },
      ]);

      mockPrismaService.ticket.count.mockResolvedValue(2); // createdCount

      const result = await service.getUserWorkload();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: '1',
        username: 'testuser',
        realName: '测试用户',
        createdCount: 2,
        assignedCount: 2,
        completedCount: 1,
        avgResponseTime: expect.any(String),
      });
    });
  });

  describe('getActiveUsers', () => {
    it('应该返回活跃用户统计', async () => {
      const userId1 = BigInt(1);
      const userId2 = BigInt(2);

      mockPrismaService.user.count.mockResolvedValueOnce(50); // totalUsers

      mockPrismaService.ticket.findMany.mockResolvedValueOnce([
        { assigneeId: userId1 },
        { assigneeId: userId2 },
      ]); // activeUserIds

      mockPrismaService.$queryRaw.mockResolvedValueOnce([
        { user_id: userId1, count: BigInt(20) },
      ]); // topCreatorData

      mockPrismaService.ticket.groupBy.mockResolvedValueOnce([
        { assigneeId: userId2, _count: 15 },
      ]); // topHandlerData

      mockPrismaService.user.findMany
        .mockResolvedValueOnce([
          // topCreators
          {
            id: userId1,
            username: 'creator1',
            realName: '创建者1',
          },
        ])
        .mockResolvedValueOnce([
          // topHandlers
          {
            id: userId2,
            username: 'handler1',
            realName: '处理者1',
          },
        ]);

      const result = await service.getActiveUsers();

      expect(result).toEqual({
        totalUsers: 50,
        activeUsers: 2,
        topCreators: [
          {
            userId: '1',
            username: 'creator1',
            realName: '创建者1',
            count: 20,
          },
        ],
        topHandlers: [
          {
            userId: '2',
            username: 'handler1',
            realName: '处理者1',
            count: 15,
          },
        ],
      });
    });
  });

  describe('getResponseTimeStatistics', () => {
    it('应该返回响应时间统计', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          assignedAt: new Date('2026-09-05T10:00:00.000Z'),
          resolvedAt: new Date('2026-09-05T12:00:00.000Z'),
          closedAt: new Date('2026-09-06T10:00:00.000Z'),
          createdAt: new Date('2026-09-05T08:00:00.000Z'),
        },
      ]);

      const result = await service.getResponseTimeStatistics();

      expect(result).toBeDefined();
      expect(result.avgFirstResponseTime).toBeDefined();
      expect(result.avgResolutionTime).toBeDefined();
      expect(result.byPriority).toHaveLength(4);
      expect(result.byPriority[0]).toHaveProperty('priority');
      expect(result.byPriority[0]).toHaveProperty('avgResponseTime');
      expect(result.byPriority[0]).toHaveProperty('avgResolutionTime');
    });
  });
});
