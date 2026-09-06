import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';

describe('TicketsService', () => {
  let service: TicketsService;
  let notificationService: NotificationService;

  const mockPrismaService = {
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    ticketLog: {
      create: jest.fn(),
    },
  };

  const mockNotificationService = {
    notifyTicketCreated: jest.fn().mockResolvedValue(undefined),
    notifyTicketAssigned: jest.fn().mockResolvedValue(undefined),
    notifyTicketStatusChanged: jest.fn().mockResolvedValue(undefined),
  };

  const mockCurrentUser = {
    id: BigInt(1),
    username: 'testuser',
    realName: '测试用户',
  };

  const mockTicket = {
    id: BigInt(1),
    number: 1,
    title: '测试工单',
    description: '这是一个测试工单',
    type: TicketType.ISSUE,
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.OPEN,
    creatorSnapshot: {
      id: 1,
      username: 'testuser',
      realName: '测试用户',
    },
    assigneeId: null,
    assignedAt: null,
    tags: [],
    locked: false,
    hidden: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    assignee: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a ticket successfully', async () => {
      const createTicketDto = {
        title: '测试工单',
        description: '这是一个测试工单',
        type: TicketType.ISSUE,
        priority: TicketPriority.MEDIUM,
        tags: ['测试'],
      };

      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.create(createTicketDto, mockCurrentUser);

      expect(result).toEqual(mockTicket);
      expect(mockPrismaService.ticket.create).toHaveBeenCalledWith({
        data: {
          title: createTicketDto.title,
          description: createTicketDto.description,
          type: createTicketDto.type,
          priority: createTicketDto.priority,
          tags: createTicketDto.tags,
          creatorSnapshot: {
            id: 1,
            username: 'testuser',
            realName: '测试用户',
          },
        },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
            },
          },
        },
      });
    });

    it('should create a ticket with default priority', async () => {
      const createTicketDto = {
        title: '测试工单',
        description: '这是一个测试工单',
        type: TicketType.ISSUE,
      };

      mockPrismaService.ticket.create.mockResolvedValue(mockTicket);

      await service.create(createTicketDto, mockCurrentUser);

      expect(mockPrismaService.ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'MEDIUM',
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated tickets', async () => {
      const queryDto = {
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      const mockTickets = [mockTicket];
      mockPrismaService.ticket.findMany.mockResolvedValue(mockTickets);
      mockPrismaService.ticket.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result).toEqual({
        data: mockTickets,
        total: 1,
        page: 1,
        pageSize: 10,
      });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { hidden: false },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
            },
          },
        },
      });
    });

    it('should filter tickets by status', async () => {
      const queryDto = {
        status: TicketStatus.OPEN,
        page: 1,
        pageSize: 10,
      };

      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TicketStatus.OPEN,
          }),
        }),
      );
    });

    it('should filter tickets by keyword', async () => {
      const queryDto = {
        keyword: '测试',
        page: 1,
        pageSize: 10,
      };

      mockPrismaService.ticket.findMany.mockResolvedValue([]);
      mockPrismaService.ticket.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '测试', mode: 'insensitive' } },
              { description: { contains: '测试', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a ticket by id', async () => {
      const ticketWithDetails = {
        ...mockTicket,
        logs: [],
        attachments: [],
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(ticketWithDetails);

      const result = await service.findOne(1);

      expect(result).toEqual(ticketWithDetails);
      expect(mockPrismaService.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              realName: true,
              email: true,
              department: true,
            },
          },
          logs: {
            orderBy: { createdAt: 'asc' },
          },
          attachments: {
            orderBy: { uploadedAt: 'desc' },
          },
        },
      });
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if ticket is hidden', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        hidden: true,
      });

      await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a ticket successfully', async () => {
      const updateDto = {
        title: '更新后的标题',
        priority: TicketPriority.HIGH,
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        ...updateDto,
      });

      const result = await service.update(1, updateDto);

      expect(result.title).toBe(updateDto.title);
      expect(mockPrismaService.ticket.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if ticket not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.update(999, { title: '测试' })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if ticket is locked', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        locked: true,
      });

      await expect(service.update(1, { title: '测试' })).rejects.toThrow(BadRequestException);
    });

    it('should update resolvedAt when status changes to RESOLVED', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
      });

      await service.update(1, { status: TicketStatus.RESOLVED });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('assign', () => {
    it('should assign ticket to a user', async () => {
      const assigneeId = 2;
      const mockAssignee = {
        id: BigInt(assigneeId),
        username: 'assignee',
        realName: '处理人',
        email: 'assignee@test.com',
      };

      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(mockAssignee);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        assigneeId: BigInt(assigneeId),
        assignedAt: new Date(),
        assignee: mockAssignee,
      });
      mockPrismaService.ticketLog.create.mockResolvedValue({});

      const result = await service.assign(1, assigneeId, mockCurrentUser);

      expect(result.assigneeId).toBe(BigInt(assigneeId));
      expect(mockPrismaService.ticketLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if assignee not found', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.assign(1, 999, mockCurrentUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStatus', () => {
    it('should change ticket status', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.IN_PROGRESS,
      });
      mockPrismaService.ticketLog.create.mockResolvedValue({});

      const result = await service.changeStatus(1, TicketStatus.IN_PROGRESS, mockCurrentUser);

      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
      expect(mockPrismaService.ticketLog.create).toHaveBeenCalled();
    });

    it('should update closedAt when status changes to CLOSED', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
      });
      mockPrismaService.ticketLog.create.mockResolvedValue({});

      await service.changeStatus(1, TicketStatus.CLOSED, mockCurrentUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            closedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a ticket', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(mockTicket);
      mockPrismaService.ticket.update.mockResolvedValue({
        ...mockTicket,
        hidden: true,
      });

      const result = await service.remove(1);

      expect(result.message).toBe('工单删除成功');
      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: { hidden: true },
      });
    });

    it('should throw BadRequestException if ticket is locked', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        ...mockTicket,
        locked: true,
      });

      await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    });
  });
});
