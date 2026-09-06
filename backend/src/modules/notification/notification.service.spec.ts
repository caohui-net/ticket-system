import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('NotificationService', () => {
  let service: NotificationService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    notificationSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockEmailService = {
    sendTicketCreatedEmail: jest.fn(),
    sendTicketAssignedEmail: jest.fn(),
    sendTicketStatusChangedEmail: jest.fn(),
    sendTicketCommentedEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('应该成功创建通知', async () => {
      const mockSetting = {
        inAppEnabled: true,
        ticketCreated: true,
      };

      const mockNotification = {
        id: BigInt(1),
        userId: BigInt(1),
        type: NotificationType.TICKET_CREATED,
        title: '新工单',
        content: '测试内容',
        link: '/tickets/1',
        read: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(mockSetting);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      const result = await service.createNotification(
        BigInt(1),
        NotificationType.TICKET_CREATED,
        '新工单',
        '测试内容',
        '/tickets/1',
      );

      expect(result).toEqual(mockNotification);
      expect(mockPrismaService.notification.create).toHaveBeenCalledWith({
        data: {
          userId: BigInt(1),
          type: NotificationType.TICKET_CREATED,
          title: '新工单',
          content: '测试内容',
          link: '/tickets/1',
        },
      });
    });

    it('当用户关闭应用内通知时应该返回null', async () => {
      const mockSetting = {
        inAppEnabled: false,
        ticketCreated: true,
      };

      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(mockSetting);

      const result = await service.createNotification(
        BigInt(1),
        NotificationType.TICKET_CREATED,
        '新工单',
        '测试内容',
      );

      expect(result).toBeNull();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });

    it('当用户关闭特定类型通知时应该返回null', async () => {
      const mockSetting = {
        inAppEnabled: true,
        ticketCreated: false,
      };

      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(mockSetting);

      const result = await service.createNotification(
        BigInt(1),
        NotificationType.TICKET_CREATED,
        '新工单',
        '测试内容',
      );

      expect(result).toBeNull();
      expect(mockPrismaService.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('getOrCreateNotificationSetting', () => {
    it('应该返回已存在的通知设置', async () => {
      const mockSetting = {
        id: BigInt(1),
        userId: BigInt(1),
        inAppEnabled: true,
        ticketCreated: true,
        ticketAssigned: true,
        ticketStatusChanged: true,
        ticketCommented: true,
        mention: true,
        emailEnabled: false,
        emailTicketCreated: false,
        emailTicketAssigned: true,
        emailTicketStatusChanged: false,
        emailTicketCommented: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(mockSetting);

      const result = await service.getOrCreateNotificationSetting(BigInt(1));

      expect(result).toEqual(mockSetting);
      expect(mockPrismaService.notificationSetting.create).not.toHaveBeenCalled();
    });

    it('应该创建新的通知设置', async () => {
      const mockSetting = {
        id: BigInt(1),
        userId: BigInt(1),
        inAppEnabled: true,
        ticketCreated: true,
        ticketAssigned: true,
        ticketStatusChanged: true,
        ticketCommented: true,
        mention: true,
        emailEnabled: false,
        emailTicketCreated: false,
        emailTicketAssigned: true,
        emailTicketStatusChanged: false,
        emailTicketCommented: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationSetting.create.mockResolvedValue(mockSetting);

      const result = await service.getOrCreateNotificationSetting(BigInt(1));

      expect(result).toEqual(mockSetting);
      expect(mockPrismaService.notificationSetting.create).toHaveBeenCalledWith({
        data: { userId: BigInt(1) },
      });
    });
  });

  describe('findAll', () => {
    it('应该返回用户的通知列表', async () => {
      const mockNotifications = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          type: NotificationType.TICKET_CREATED,
          title: '新工单',
          content: '测试内容',
          link: '/tickets/1',
          read: false,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.findAll(1, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('应该只返回未读通知', async () => {
      const mockNotifications = [
        {
          id: BigInt(1),
          userId: BigInt(1),
          type: NotificationType.TICKET_CREATED,
          title: '新工单',
          content: '测试内容',
          link: '/tickets/1',
          read: false,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.findAll(1, { unreadOnly: true, page: 1, pageSize: 20 });

      expect(mockPrismaService.notification.findMany).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          read: false,
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('应该返回未读通知数量', async () => {
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(1);

      expect(result).toBe(5);
      expect(mockPrismaService.notification.count).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          read: false,
        },
      });
    });
  });

  describe('markAsRead', () => {
    it('应该标记通知为已读', async () => {
      const mockNotification = {
        id: BigInt(1),
        userId: BigInt(1),
        type: NotificationType.TICKET_CREATED,
        title: '新工单',
        content: '测试内容',
        link: '/tickets/1',
        read: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);
      mockPrismaService.notification.update.mockResolvedValue({
        ...mockNotification,
        read: true,
        readAt: new Date(),
      });

      const result = await service.markAsRead(1, '1');

      expect(result.message).toBe('已标记为已读');
      expect(mockPrismaService.notification.update).toHaveBeenCalled();
    });

    it('当通知不存在时应该抛出异常', async () => {
      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead(1, '1')).rejects.toThrow('通知不存在');
    });

    it('当通知不属于该用户时应该抛出异常', async () => {
      const mockNotification = {
        id: BigInt(1),
        userId: BigInt(2),
        type: NotificationType.TICKET_CREATED,
        title: '新工单',
        content: '测试内容',
        link: '/tickets/1',
        read: false,
        readAt: null,
        createdAt: new Date(),
      };

      mockPrismaService.notification.findUnique.mockResolvedValue(mockNotification);

      await expect(service.markAsRead(1, '1')).rejects.toThrow('通知不存在');
    });
  });

  describe('markAllAsRead', () => {
    it('应该标记所有通知为已读', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead(1);

      expect(result.message).toBe('所有通知已标记为已读');
      expect(mockPrismaService.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: BigInt(1),
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('notifyTicketCreated', () => {
    it('应该通知管理员新工单创建', async () => {
      const mockTicket = {
        id: BigInt(1),
        number: 1,
        title: '测试工单',
        creatorSnapshot: {
          id: 1,
          username: 'user1',
          realName: '测试用户',
        },
      };

      const mockAdmins = [
        { id: BigInt(2), email: 'admin@test.com' },
      ];

      const mockSetting = {
        inAppEnabled: true,
        ticketCreated: true,
        emailEnabled: true,
        emailTicketCreated: true,
      };

      mockPrismaService.user.findMany.mockResolvedValue(mockAdmins);
      mockPrismaService.notificationSetting.findUnique.mockResolvedValue(mockSetting);
      mockPrismaService.notification.create.mockResolvedValue({
        id: BigInt(1),
        userId: BigInt(2),
        type: NotificationType.TICKET_CREATED,
        title: '新工单 #1',
        content: '测试用户 创建了新工单：测试工单',
        link: '/tickets/1',
        read: false,
        readAt: null,
        createdAt: new Date(),
      });
      mockEmailService.sendTicketCreatedEmail.mockResolvedValue(true);

      await service.notifyTicketCreated(mockTicket);

      expect(mockPrismaService.notification.create).toHaveBeenCalled();
      expect(mockEmailService.sendTicketCreatedEmail).toHaveBeenCalledWith(
        'admin@test.com',
        1,
        '测试工单',
      );
    });
  });
});
