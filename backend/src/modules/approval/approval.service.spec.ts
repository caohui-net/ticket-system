import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalService } from './approval.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApprovalType, FlowStatus, StepStatus } from '@prisma/client';

describe('ApprovalService', () => {
  let service: ApprovalService;
  let prisma: PrismaService;
  let notificationService: NotificationService;

  // Mock数据
  const mockTicket = {
    id: BigInt(1),
    number: 'T-2024-001',
    title: '测试工单',
    type: 'REPAIR',
    status: 'OPEN',
    priority: 'MEDIUM',
    description: '测试描述',
    currentPhase: 'REPAIR',
    currentStep: 1,
    creatorId: BigInt(1),
    assigneeId: BigInt(2),
    creatorSnapshot: { id: '1', username: 'creator', realName: '创建人' },
    createdAt: new Date(),
    updatedAt: new Date(),
    assignee: {
      id: BigInt(2),
      username: 'assignee',
      realName: '处理人',
    },
  };

  const mockUser = {
    id: BigInt(10),
    username: 'approver',
    realName: '审批人',
    email: 'approver@test.com',
    department: '测试部门',
    status: 1,
  };

  const mockViceDirector = {
    id: BigInt(20),
    username: 'vice_director',
    realName: '副主任',
    email: 'vice@test.com',
    department: '管理部门',
    status: 1,
  };

  const mockDeptManager = {
    id: BigInt(30),
    username: 'dept_manager',
    realName: '部门经理',
    email: 'dept@test.com',
    department: '管理部门',
    status: 1,
  };

  const mockViceLeader = {
    id: BigInt(40),
    username: 'vice_leader',
    realName: '副领导',
    email: 'vice_leader@test.com',
    department: '领导部门',
    status: 1,
  };

  const mockTopLeader = {
    id: BigInt(50),
    username: 'top_leader',
    realName: '最高领导',
    email: 'top@test.com',
    department: '领导部门',
    status: 1,
  };

  // Mock PrismaService
  const mockPrismaService = {
    ticket: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    approvalFlow: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    approvalStep: {
      createMany: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    userRole: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock NotificationService
  const mockNotificationService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalService,
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

    service = module.get<ApprovalService>(ApprovalService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);

    // 重置所有mock
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFlow', () => {
    it('应该成功创建单级审批流程（报修审核）', async () => {
      const ticketId = BigInt(1);
      const type = ApprovalType.REPAIR_REVIEW;

      const mockFlow = {
        id: BigInt(1),
        ticketId,
        type,
        currentStep: 1,
        totalSteps: 1,
        status: FlowStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock transaction
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            findUnique: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn().mockResolvedValue(mockTicket),
          },
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockFlow),
          },
          approvalStep: {
            createMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return callback(tx);
      });

      // Mock getUsersByRole
      mockPrismaService.user.findMany.mockResolvedValue([mockViceDirector]);

      const result = await service.createFlow(ticketId, type);

      expect(result).toEqual(mockFlow);
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        mockViceDirector.id,
        expect.any(String),
        expect.stringContaining('待审批'),
        expect.any(String),
        expect.any(String),
      );
    });

    it('应该成功创建三级审批流程（立项审批）', async () => {
      const ticketId = BigInt(2);
      const type = ApprovalType.PROJECT_APPROVAL;

      const mockFlow = {
        id: BigInt(2),
        ticketId,
        type,
        currentStep: 1,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            findUnique: jest.fn().mockResolvedValue(mockTicket),
            update: jest.fn().mockResolvedValue(mockTicket),
          },
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue(mockFlow),
          },
          approvalStep: {
            createMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
        };
        return callback(tx);
      });

      mockPrismaService.user.findMany.mockResolvedValue([mockDeptManager]);

      const result = await service.createFlow(ticketId, type);

      expect(result).toEqual(mockFlow);
      expect(result.totalSteps).toBe(3);
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('工单不存在时应该抛出异常', async () => {
      const ticketId = BigInt(999);
      const type = ApprovalType.REPAIR_REVIEW;

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.createFlow(ticketId, type)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('已有审批流程时应该抛出异常', async () => {
      const ticketId = BigInt(1);
      const type = ApprovalType.REPAIR_REVIEW;

      const existingFlow = {
        id: BigInt(1),
        ticketId,
        type,
        status: FlowStatus.PENDING,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ticket: {
            findUnique: jest.fn().mockResolvedValue(mockTicket),
          },
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(existingFlow),
          },
        };
        return callback(tx);
      });

      await expect(service.createFlow(ticketId, type)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    const mockFlow = {
      id: BigInt(1),
      ticketId: BigInt(1),
      type: ApprovalType.REPAIR_REVIEW,
      currentStep: 1,
      totalSteps: 1,
      status: FlowStatus.PENDING,
      ticket: mockTicket,
      steps: [
        {
          id: BigInt(10),
          flowId: BigInt(1),
          stepNumber: 1,
          stepName: '副主任审核',
          approverRole: 'VICE_DIRECTOR',
          status: StepStatus.PENDING,
          approverId: null,
          comment: null,
          approvedAt: null,
          rejectedAt: null,
          createdAt: new Date(),
        },
      ],
    };

    it('应该成功完成单级审批', async () => {
      const flowId = BigInt(1);
      const stepNumber = 1;
      const approverId = BigInt(20);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(mockFlow),
            update: jest.fn().mockResolvedValue({
              ...mockFlow,
              status: FlowStatus.APPROVED,
            }),
          },
          approvalStep: {
            update: jest.fn().mockResolvedValue({
              ...mockFlow.steps[0],
              status: StepStatus.APPROVED,
            }),
          },
        };
        return callback(tx);
      });

      // Mock validateApprover
      mockPrismaService.userRole.findMany.mockResolvedValue([
        {
          userId: approverId,
          roleId: BigInt(1),
          role: { code: 'VICE_DIRECTOR' },
        },
      ]);

      const result = await service.approve(flowId, stepNumber, approverId);

      expect(result).toEqual({ success: true, message: '审批通过' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.any(BigInt),
        expect.any(String),
        expect.stringContaining('审批通过'),
        expect.any(String),
        expect.any(String),
      );
    });

    it('三级审批第一步通过应该推进到第二步', async () => {
      const threeStepFlow = {
        id: BigInt(2),
        ticketId: BigInt(2),
        type: ApprovalType.PROJECT_APPROVAL,
        currentStep: 1,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(20),
            flowId: BigInt(2),
            stepNumber: 1,
            stepName: '一级审核',
            approverRole: 'DEPT_MANAGER',
            status: StepStatus.PENDING,
            approverId: null,
          },
          {
            id: BigInt(21),
            flowId: BigInt(2),
            stepNumber: 2,
            stepName: '二级审核',
            approverRole: 'VICE_LEADER',
            status: StepStatus.PENDING,
            approverId: null,
          },
          {
            id: BigInt(22),
            flowId: BigInt(2),
            stepNumber: 3,
            stepName: '终审',
            approverRole: 'TOP_LEADER',
            status: StepStatus.PENDING,
            approverId: null,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(threeStepFlow),
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow,
              currentStep: 2,
            }),
          },
          approvalStep: {
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow.steps[0],
              status: StepStatus.APPROVED,
            }),
          },
          ticket: {
            update: jest.fn().mockResolvedValue(mockTicket),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        {
          userId: BigInt(30),
          roleId: BigInt(2),
          role: { code: 'DEPT_MANAGER' },
        },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([mockViceLeader]);

      const result = await service.approve(BigInt(2), 1, BigInt(30));

      expect(result).toEqual({ success: true, message: '审批通过' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        mockViceLeader.id,
        expect.any(String),
        expect.stringContaining('待审批'),
        expect.any(String),
        expect.any(String),
      );
    });

    it('三级审批第二步通过应该推进到第三步', async () => {
      const threeStepFlow = {
        id: BigInt(2),
        ticketId: BigInt(2),
        type: ApprovalType.PROJECT_APPROVAL,
        currentStep: 2,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(20),
            stepNumber: 1,
            stepName: '一级审核',
            approverRole: 'DEPT_MANAGER',
            status: StepStatus.APPROVED,
          },
          {
            id: BigInt(21),
            stepNumber: 2,
            stepName: '二级审核',
            approverRole: 'VICE_LEADER',
            status: StepStatus.PENDING,
          },
          {
            id: BigInt(22),
            stepNumber: 3,
            stepName: '终审',
            approverRole: 'TOP_LEADER',
            status: StepStatus.PENDING,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(threeStepFlow),
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow,
              currentStep: 3,
            }),
          },
          approvalStep: {
            update: jest.fn(),
          },
          ticket: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'VICE_LEADER' } },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([mockTopLeader]);

      const result = await service.approve(BigInt(2), 2, BigInt(40));

      expect(result).toEqual({ success: true, message: '审批通过' });
    });

    it('三级审批第三步通过应该完成流程', async () => {
      const threeStepFlow = {
        id: BigInt(2),
        ticketId: BigInt(2),
        type: ApprovalType.PROJECT_APPROVAL,
        currentStep: 3,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(20),
            stepNumber: 1,
            status: StepStatus.APPROVED,
          },
          {
            id: BigInt(21),
            stepNumber: 2,
            status: StepStatus.APPROVED,
          },
          {
            id: BigInt(22),
            stepNumber: 3,
            stepName: '终审',
            approverRole: 'TOP_LEADER',
            status: StepStatus.PENDING,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(threeStepFlow),
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow,
              status: FlowStatus.APPROVED,
            }),
          },
          approvalStep: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'TOP_LEADER' } },
      ]);

      const result = await service.approve(BigInt(2), 3, BigInt(50));

      expect(result).toEqual({ success: true, message: '审批通过' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.any(BigInt),
        expect.any(String),
        expect.stringContaining('审批通过'),
        expect.any(String),
        expect.any(String),
      );
    });

    it('审批人权限不足时应该抛出异常', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(mockFlow),
          },
        };
        return callback(tx);
      });

      // Mock用户没有所需角色
      mockPrismaService.userRole.findMany.mockResolvedValue([]);

      await expect(
        service.approve(BigInt(1), 1, BigInt(999)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('审批流程不存在时应该抛出异常', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(
        service.approve(BigInt(999), 1, BigInt(20)),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('第一步驳回应该结束流程', async () => {
      const mockFlow = {
        id: BigInt(1),
        ticketId: BigInt(1),
        type: ApprovalType.REPAIR_REVIEW,
        currentStep: 1,
        totalSteps: 1,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(10),
            stepNumber: 1,
            stepName: '副主任审核',
            approverRole: 'VICE_DIRECTOR',
            status: StepStatus.PENDING,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(mockFlow),
            update: jest.fn().mockResolvedValue({
              ...mockFlow,
              status: FlowStatus.REJECTED,
            }),
          },
          approvalStep: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'VICE_DIRECTOR' } },
      ]);

      const result = await service.reject(
        BigInt(1),
        1,
        BigInt(20),
        '不符合要求',
      );

      expect(result).toEqual({ success: true, message: '审批已驳回' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        expect.any(BigInt),
        expect.any(String),
        expect.stringContaining('审批驳回'),
        expect.stringContaining('不符合要求'),
        expect.any(String),
      );
    });

    it('第二步驳回应该退回到第一步', async () => {
      const threeStepFlow = {
        id: BigInt(2),
        ticketId: BigInt(2),
        type: ApprovalType.PROJECT_APPROVAL,
        currentStep: 2,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(20),
            stepNumber: 1,
            stepName: '一级审核',
            approverRole: 'DEPT_MANAGER',
            status: StepStatus.APPROVED,
            approverId: BigInt(30),
          },
          {
            id: BigInt(21),
            stepNumber: 2,
            stepName: '二级审核',
            approverRole: 'VICE_LEADER',
            status: StepStatus.PENDING,
            approverId: null,
          },
          {
            id: BigInt(22),
            stepNumber: 3,
            stepName: '终审',
            approverRole: 'TOP_LEADER',
            status: StepStatus.PENDING,
            approverId: null,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(threeStepFlow),
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow,
              currentStep: 1,
            }),
          },
          approvalStep: {
            update: jest.fn(),
          },
          ticket: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'VICE_LEADER' } },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([mockDeptManager]);

      const result = await service.reject(
        BigInt(2),
        2,
        BigInt(40),
        '需要补充材料',
      );

      expect(result).toEqual({ success: true, message: '审批已驳回' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        mockDeptManager.id,
        expect.any(String),
        expect.stringContaining('审批退回'),
        expect.stringContaining('需要补充材料'),
        expect.any(String),
      );
    });

    it('第三步驳回应该退回到第二步', async () => {
      const threeStepFlow = {
        id: BigInt(2),
        ticketId: BigInt(2),
        type: ApprovalType.PROJECT_APPROVAL,
        currentStep: 3,
        totalSteps: 3,
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(20),
            stepNumber: 1,
            status: StepStatus.APPROVED,
          },
          {
            id: BigInt(21),
            stepNumber: 2,
            stepName: '二级审核',
            approverRole: 'VICE_LEADER',
            status: StepStatus.APPROVED,
            approverId: BigInt(40),
          },
          {
            id: BigInt(22),
            stepNumber: 3,
            stepName: '终审',
            approverRole: 'TOP_LEADER',
            status: StepStatus.PENDING,
            approverId: null,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(threeStepFlow),
            update: jest.fn().mockResolvedValue({
              ...threeStepFlow,
              currentStep: 2,
            }),
          },
          approvalStep: {
            update: jest.fn(),
          },
          ticket: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'TOP_LEADER' } },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([mockViceLeader]);

      const result = await service.reject(
        BigInt(2),
        3,
        BigInt(50),
        '预算过高',
      );

      expect(result).toEqual({ success: true, message: '审批已驳回' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(
        mockViceLeader.id,
        expect.any(String),
        expect.stringContaining('审批退回'),
        expect.stringContaining('预算过高'),
        expect.any(String),
      );
    });

    it('驳回原因为空时应该抛出异常', async () => {
      await expect(
        service.reject(BigInt(1), 1, BigInt(20), ''),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.reject(BigInt(1), 1, BigInt(20), '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('审批人权限不足时应该抛出异常', async () => {
      const mockFlow = {
        id: BigInt(1),
        status: FlowStatus.PENDING,
        ticket: mockTicket,
        steps: [
          {
            id: BigInt(10),
            stepNumber: 1,
            approverRole: 'VICE_DIRECTOR',
            status: StepStatus.PENDING,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          approvalFlow: {
            findUnique: jest.fn().mockResolvedValue(mockFlow),
          },
        };
        return callback(tx);
      });

      mockPrismaService.userRole.findMany.mockResolvedValue([]);

      await expect(
        service.reject(BigInt(1), 1, BigInt(999), '驳回原因'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getFlowByTicketId', () => {
    it('应该成功查询审批流程', async () => {
      const mockFlow = {
        id: BigInt(1),
        ticketId: BigInt(1),
        type: ApprovalType.REPAIR_REVIEW,
        currentStep: 1,
        totalSteps: 1,
        status: FlowStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        ticket: {
          id: BigInt(1),
          number: 'T-2024-001',
          title: '测试工单',
          currentPhase: 'REPAIR',
          currentStep: 1,
        },
        steps: [
          {
            id: BigInt(10),
            stepNumber: 1,
            stepName: '副主任审核',
            approverRole: 'VICE_DIRECTOR',
            status: StepStatus.PENDING,
            comment: null,
            approvedAt: null,
            rejectedAt: null,
            createdAt: new Date(),
            approver: {
              id: BigInt(20),
              username: 'vice_director',
              realName: '副主任',
              department: '管理部门',
            },
          },
        ],
      };

      mockPrismaService.approvalFlow.findUnique.mockResolvedValue(mockFlow);

      const result = await service.getFlowByTicketId(BigInt(1));

      expect(result).toBeDefined();
      expect(result.id).toBe('1');
      expect(result.ticketId).toBe('1');
      expect(result.type).toBe(ApprovalType.REPAIR_REVIEW);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].stepName).toBe('副主任审核');
    });

    it('流程不存在时应该返回null', async () => {
      mockPrismaService.approvalFlow.findUnique.mockResolvedValue(null);

      const result = await service.getFlowByTicketId(BigInt(999));

      expect(result).toBeNull();
    });
  });

  describe('getPendingApprovals', () => {
    it('应该查询待审批列表（根据角色过滤）', async () => {
      const userId = BigInt(20);

      // Mock用户角色
      mockPrismaService.userRole.findMany.mockResolvedValue([
        {
          userId,
          roleId: BigInt(1),
          role: { code: 'VICE_DIRECTOR' },
        },
      ]);

      // Mock待审批流程
      const mockFlows = [
        {
          id: BigInt(1),
          ticketId: BigInt(1),
          type: ApprovalType.REPAIR_REVIEW,
          currentStep: 1,
          totalSteps: 1,
          status: FlowStatus.PENDING,
          createdAt: new Date(),
          ticket: {
            id: BigInt(1),
            number: 'T-2024-001',
            title: '测试工单1',
            type: 'REPAIR',
            priority: 'HIGH',
            currentPhase: 'REPAIR',
            currentStep: 1,
            createdAt: new Date(),
            creatorSnapshot: {
              id: '1',
              username: 'creator',
              realName: '创建人',
            },
          },
          steps: [
            {
              id: BigInt(10),
              stepNumber: 1,
              stepName: '副主任审核',
              approverRole: 'VICE_DIRECTOR',
            },
          ],
        },
      ];

      mockPrismaService.approvalFlow.findMany.mockResolvedValue(mockFlows);

      const result = await service.getPendingApprovals(userId);

      expect(result).toHaveLength(1);
      expect(result[0].ticket.number).toBe('T-2024-001');
      expect(result[0].pendingSteps).toHaveLength(1);
      expect(result[0].pendingSteps[0].stepName).toBe('副主任审核');
    });

    it('无待审批时应该返回空数组', async () => {
      const userId = BigInt(20);

      mockPrismaService.userRole.findMany.mockResolvedValue([
        { role: { code: 'VICE_DIRECTOR' } },
      ]);

      mockPrismaService.approvalFlow.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(userId);

      expect(result).toEqual([]);
    });

    it('用户无角色时应该返回空数组', async () => {
      const userId = BigInt(999);

      mockPrismaService.userRole.findMany.mockResolvedValue([]);

      const result = await service.getPendingApprovals(userId);

      expect(result).toEqual([]);
    });
  });
});
