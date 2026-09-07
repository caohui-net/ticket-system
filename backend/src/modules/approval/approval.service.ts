import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  ApprovalType,
  FlowStatus,
  StepStatus,
  StepType,
  NotificationType,
} from '@prisma/client';
import { StepConfig, APPROVAL_CONFIGS } from './interfaces/approval-config.interface';

@Injectable()
export class ApprovalService {
  private readonly logger = new Logger(ApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建审批流程
   * @param ticketId 工单ID
   * @param type 审批类型
   * @param steps 审批步骤配置（可选，默认使用APPROVAL_CONFIGS）
   */
  async createFlow(
    ticketId: bigint,
    type: ApprovalType,
    steps?: StepConfig[],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 验证工单存在
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          assignee: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException(`工单不存在: ${ticketId}`);
      }

      // 2. 检查是否已有审批流程
      const existingFlow = await tx.approvalFlow.findUnique({
        where: { ticketId },
      });

      if (existingFlow) {
        throw new BadRequestException(
          `工单 #${ticket.number} 已存在审批流程`,
        );
      }

      // 3. 获取审批步骤配置
      const stepConfigs = steps || APPROVAL_CONFIGS[type];
      if (!stepConfigs || stepConfigs.length === 0) {
        throw new BadRequestException(`无效的审批类型: ${type}`);
      }

      // 4. 创建审批流程
      const flow = await tx.approvalFlow.create({
        data: {
          ticketId,
          type,
          currentStep: 1,
          totalSteps: stepConfigs.length,
          status: FlowStatus.PENDING,
        },
      });

      this.logger.log(
        `创建审批流程: flow_id=${flow.id}, ticket=#${ticket.number}, type=${type}`,
      );

      // 5. 批量创建审批步骤
      const stepData = stepConfigs.map((config) => ({
        flowId: flow.id,
        stepNumber: config.stepNumber,
        stepName: config.stepName,
        approverRole: config.approverRole,
        status: config.stepNumber === 1 ? StepStatus.PENDING : StepStatus.PENDING,
      }));

      await tx.approvalStep.createMany({
        data: stepData,
      });

      this.logger.log(`创建 ${stepData.length} 个审批步骤`);

      // 6. 更新工单状态
      const phaseMap = {
        REPAIR_REVIEW: 'REPAIR',
        BUDGET_REVIEW: 'BUDGET',
        PROJECT_APPROVAL: 'PROJECT',
      };

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          currentPhase: phaseMap[type] as any,
          currentStep: 1,
        },
      });

      // 7. 查找第一步审批人并发送通知
      const firstStep = stepConfigs[0];
      const approvers = await this.getUsersByRole(firstStep.approverRole);

      if (approvers.length === 0) {
        this.logger.warn(`未找到角色 ${firstStep.approverRole} 的审批人`);
      } else {
        for (const approver of approvers) {
          await this.notificationService.createNotification(
            approver.id,
            NotificationType.TICKET_ASSIGNED,
            `待审批：工单 #${ticket.number}`,
            `工单"${ticket.title}"需要您审批（${firstStep.stepName}）`,
            `/tickets/${ticket.id}`,
          );
        }

        this.logger.log(
          `通知 ${approvers.length} 位审批人: role=${firstStep.approverRole}`,
        );
      }

      return flow;
    });
  }

  /**
   * 审批通过
   * @param flowId 流程ID
   * @param stepNumber 步骤编号
   * @param approverId 审批人ID
   * @param comment 审批意见（可选）
   */
  async approve(
    flowId: bigint,
    stepNumber: number,
    approverId: bigint,
    comment?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取审批流程
      const flow = await tx.approvalFlow.findUnique({
        where: { id: flowId },
        include: {
          ticket: true,
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      if (!flow) {
        throw new NotFoundException(`审批流程不存在: ${flowId}`);
      }

      if (flow.status !== FlowStatus.PENDING) {
        throw new BadRequestException(`审批流程已结束，当前状态: ${flow.status}`);
      }

      // 2. 获取当前步骤
      const currentStep = flow.steps.find((s) => s.stepNumber === stepNumber);

      if (!currentStep) {
        throw new NotFoundException(`审批步骤不存在: ${stepNumber}`);
      }

      if (currentStep.status !== StepStatus.PENDING) {
        throw new BadRequestException(
          `该步骤已审批，当前状态: ${currentStep.status}`,
        );
      }

      // 3. 验证审批人权限
      await this.validateApprover(approverId, currentStep.approverRole);

      // 4. 更新当前步骤状态为APPROVED
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: StepStatus.APPROVED,
          approverId,
          comment,
          approvedAt: new Date(),
        },
      });

      this.logger.log(
        `步骤审批通过: step=${stepNumber}, approver=${approverId}, flow=${flowId}`,
      );

      // 5. 判断是否为最后一步
      const isLastStep = stepNumber === flow.totalSteps;

      if (isLastStep) {
        // 5.1 最后一步：更新流程状态为APPROVED
        await tx.approvalFlow.update({
          where: { id: flowId },
          data: {
            status: FlowStatus.APPROVED,
            completedAt: new Date(),
          },
        });

        this.logger.log(`审批流程完成: flow=${flowId}`);

        // 通知创建人
        const creatorId = BigInt(
          (flow.ticket.creatorSnapshot as any).id,
        );

        await this.notificationService.createNotification(
          creatorId,
          NotificationType.TICKET_STATUS_CHANGED,
          `审批通过：工单 #${flow.ticket.number}`,
          `您的工单"${flow.ticket.title}"已通过全部审批`,
          `/tickets/${flow.ticket.id}`,
        );
      } else {
        // 5.2 不是最后一步：推进到下一步
        const nextStepNumber = stepNumber + 1;
        await tx.approvalFlow.update({
          where: { id: flowId },
          data: {
            currentStep: nextStepNumber,
          },
        });

        await tx.ticket.update({
          where: { id: flow.ticketId },
          data: {
            currentStep: nextStepNumber,
          },
        });

        // 通知下一个审批人
        const nextStep = flow.steps.find((s) => s.stepNumber === nextStepNumber);
        if (nextStep) {
          const approvers = await this.getUsersByRole(nextStep.approverRole);

          for (const approver of approvers) {
            await this.notificationService.createNotification(
              approver.id,
              NotificationType.TICKET_ASSIGNED,
              `待审批：工单 #${flow.ticket.number}`,
              `工单"${flow.ticket.title}"需要您审批（${nextStep.stepName}）`,
              `/tickets/${flow.ticket.id}`,
            );
          }

          this.logger.log(
            `通知下一级审批人: step=${nextStepNumber}, role=${nextStep.approverRole}`,
          );
        }
      }

      return { success: true, message: '审批通过' };
    });
  }

  /**
   * 驳回审批（逐级退回）
   * @param flowId 流程ID
   * @param stepNumber 步骤编号
   * @param approverId 审批人ID
   * @param comment 驳回原因（必填）
   */
  async reject(
    flowId: bigint,
    stepNumber: number,
    approverId: bigint,
    comment: string,
  ) {
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('驳回原因不能为空');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取审批流程
      const flow = await tx.approvalFlow.findUnique({
        where: { id: flowId },
        include: {
          ticket: true,
          steps: {
            orderBy: { stepNumber: 'asc' },
          },
        },
      });

      if (!flow) {
        throw new NotFoundException(`审批流程不存在: ${flowId}`);
      }

      if (flow.status !== FlowStatus.PENDING) {
        throw new BadRequestException(`审批流程已结束，当前状态: ${flow.status}`);
      }

      // 2. 获取当前步骤
      const currentStep = flow.steps.find((s) => s.stepNumber === stepNumber);

      if (!currentStep) {
        throw new NotFoundException(`审批步骤不存在: ${stepNumber}`);
      }

      if (currentStep.status !== StepStatus.PENDING) {
        throw new BadRequestException(
          `该步骤已审批，当前状态: ${currentStep.status}`,
        );
      }

      // 3. 验证审批人权限
      await this.validateApprover(approverId, currentStep.approverRole);

      // 4. 更新当前步骤状态为REJECTED
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: StepStatus.REJECTED,
          approverId,
          comment,
          rejectedAt: new Date(),
        },
      });

      this.logger.log(
        `步骤驳回: step=${stepNumber}, approver=${approverId}, flow=${flowId}`,
      );

      // 5. 逐级退回逻辑
      if (stepNumber === 1) {
        // 5.1 第一步驳回：更新流程状态为REJECTED
        await tx.approvalFlow.update({
          where: { id: flowId },
          data: {
            status: FlowStatus.REJECTED,
            completedAt: new Date(),
          },
        });

        // 通知创建人
        const creatorId = BigInt((flow.ticket.creatorSnapshot as any).id);

        await this.notificationService.createNotification(
          creatorId,
          NotificationType.TICKET_STATUS_CHANGED,
          `审批驳回：工单 #${flow.ticket.number}`,
          `您的工单"${flow.ticket.title}"已被驳回\n驳回原因：${comment}`,
          `/tickets/${flow.ticket.id}`,
        );

        this.logger.log(`审批流程驳回: flow=${flowId}`);
      } else {
        // 5.2 不是第一步：退回上一步
        const previousStepNumber = stepNumber - 1;
        const previousStep = flow.steps.find(
          (s) => s.stepNumber === previousStepNumber,
        );

        if (previousStep) {
          // 重置上一步状态为PENDING
          await tx.approvalStep.update({
            where: { id: previousStep.id },
            data: {
              status: StepStatus.PENDING,
              approverId: null,
              comment: null,
              approvedAt: null,
            },
          });

          // 更新流程当前步骤
          await tx.approvalFlow.update({
            where: { id: flowId },
            data: {
              currentStep: previousStepNumber,
            },
          });

          await tx.ticket.update({
            where: { id: flow.ticketId },
            data: {
              currentStep: previousStepNumber,
            },
          });

          // 通知上一级审批人
          const approvers = await this.getUsersByRole(previousStep.approverRole);

          for (const approver of approvers) {
            await this.notificationService.createNotification(
              approver.id,
              NotificationType.TICKET_STATUS_CHANGED,
              `审批退回：工单 #${flow.ticket.number}`,
              `工单"${flow.ticket.title}"被退回至${previousStep.stepName}\n退回原因：${comment}`,
              `/tickets/${flow.ticket.id}`,
            );
          }

          this.logger.log(
            `审批退回上一步: from_step=${stepNumber} to_step=${previousStepNumber}`,
          );
        }
      }

      return { success: true, message: '审批已驳回' };
    });
  }

  /**
   * 查询审批流程
   * @param ticketId 工单ID
   */
  async getFlowByTicketId(ticketId: bigint) {
    const flow = await this.prisma.approvalFlow.findUnique({
      where: { ticketId },
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            title: true,
            currentPhase: true,
            currentStep: true,
          },
        },
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: {
            approver: {
              select: {
                id: true,
                username: true,
                realName: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!flow) {
      return null;
    }

    return {
      id: flow.id.toString(),
      ticketId: flow.ticketId.toString(),
      type: flow.type,
      currentStep: flow.currentStep,
      totalSteps: flow.totalSteps,
      status: flow.status,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
      completedAt: flow.completedAt,
      ticket: {
        id: flow.ticket.id.toString(),
        number: flow.ticket.number,
        title: flow.ticket.title,
        currentPhase: flow.ticket.currentPhase,
        currentStep: flow.ticket.currentStep,
      },
      steps: flow.steps.map((step) => ({
        id: step.id.toString(),
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        approverRole: step.approverRole,
        status: step.status,
        comment: step.comment,
        approvedAt: step.approvedAt,
        rejectedAt: step.rejectedAt,
        createdAt: step.createdAt,
        approver: step.approver
          ? {
              id: step.approver.id.toString(),
              username: step.approver.username,
              realName: step.approver.realName,
              department: step.approver.department,
            }
          : null,
      })),
    };
  }

  /**
   * 查询待审批列表
   * @param userId 用户ID
   */
  async getPendingApprovals(userId: bigint) {
    // 获取用户角色
    const userRoles = await this.getUserRoles(userId);

    if (userRoles.length === 0) {
      return [];
    }

    // 查询待审批流程
    const flows = await this.prisma.approvalFlow.findMany({
      where: {
        status: FlowStatus.PENDING,
        steps: {
          some: {
            approverRole: {
              in: userRoles,
            },
            status: StepStatus.PENDING,
          },
        },
      },
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            title: true,
            type: true,
            priority: true,
            creatorSnapshot: true,
            createdAt: true,
            currentPhase: true,
            currentStep: true,
          },
        },
        steps: {
          where: {
            approverRole: {
              in: userRoles,
            },
            status: StepStatus.PENDING,
          },
          orderBy: { stepNumber: 'asc' },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return flows.map((flow) => ({
      id: flow.id.toString(),
      ticketId: flow.ticketId.toString(),
      type: flow.type,
      currentStep: flow.currentStep,
      totalSteps: flow.totalSteps,
      status: flow.status,
      createdAt: flow.createdAt,
      ticket: {
        id: flow.ticket.id.toString(),
        number: flow.ticket.number,
        title: flow.ticket.title,
        type: flow.ticket.type,
        priority: flow.ticket.priority,
        currentPhase: flow.ticket.currentPhase,
        currentStep: flow.ticket.currentStep,
        createdAt: flow.ticket.createdAt,
        creator: flow.ticket.creatorSnapshot as any,
      },
      pendingSteps: flow.steps.map((step) => ({
        id: step.id.toString(),
        stepNumber: step.stepNumber,
        stepName: step.stepName,
        approverRole: step.approverRole,
      })),
    }));
  }

  /**
   * 获取用户角色列表（私有方法）
   * @param userId 用户ID
   */
  private async getUserRoles(userId: bigint): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: {
          select: { code: true },
        },
      },
    });

    return userRoles.map((ur) => ur.role.code);
  }

  /**
   * 根据角色获取用户列表（私有方法）
   * @param roleCode 角色代码
   */
  private async getUsersByRole(roleCode: string) {
    return await this.prisma.user.findMany({
      where: {
        userRoles: {
          some: {
            role: {
              code: roleCode,
            },
          },
        },
        status: 1,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        email: true,
        department: true,
      },
    });
  }

  /**
   * 验证审批人权限（私有方法）
   * @param userId 用户ID
   * @param requiredRole 所需角色
   */
  private async validateApprover(userId: bigint, requiredRole: string) {
    const userRoles = await this.getUserRoles(userId);

    if (!userRoles.includes(requiredRole)) {
      throw new ForbiddenException(
        `您没有该审批权限，需要角色: ${requiredRole}`,
      );
    }
  }

  // ============================================
  // 方案B第二阶段：并行审批和条件分支
  // ============================================

  /**
   * 并行审批 - 多人同时审批
   * @param flowId 流程ID
   * @param stepNumber 步骤编号
   * @param approverId 审批人ID
   * @param comment 审批意见（可选）
   */
  async approveParallel(
    flowId: bigint,
    stepNumber: number,
    approverId: bigint,
    comment?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取当前步骤
      const step = await tx.approvalStep.findFirst({
        where: {
          flowId,
          stepNumber,
        },
      });

      if (!step) {
        throw new NotFoundException('审批步骤不存在');
      }

      if (step.stepType !== StepType.PARALLEL) {
        throw new BadRequestException('该步骤不是并行审批');
      }

      if (step.status !== StepStatus.PENDING) {
        throw new BadRequestException(`该步骤已完成，当前状态: ${step.status}`);
      }

      // 2. 验证审批人在列表中
      const approvers = (step.approvers as number[]) || [];
      if (!approvers.includes(Number(approverId))) {
        throw new ForbiddenException('您不在审批人列表中');
      }

      // 3. 记录审批
      const approvedBy = (step.approvedBy as any[]) || [];
      const alreadyApproved = approvedBy.some(
        (a) => Number(a.userId) === Number(approverId),
      );

      if (alreadyApproved) {
        throw new BadRequestException('您已经审批过了');
      }

      approvedBy.push({
        userId: Number(approverId),
        decision: 'APPROVED',
        comment: comment || '',
        time: new Date().toISOString(),
      });

      // 4. 判断是否所有人都通过
      const allApproved = step.requireAllApprove
        ? approvedBy.length === approvers.length
        : approvedBy.length >= Math.ceil(approvers.length / 2); // 过半数通过

      if (allApproved) {
        // 所有人通过，更新步骤状态
        await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            status: StepStatus.APPROVED,
            approvedBy: approvedBy,
            approvedAt: new Date(),
          },
        });

        this.logger.log(
          `并行审批完成: step=${stepNumber}, flow=${flowId}, approvers=${approvedBy.length}/${approvers.length}`,
        );

        // 推进流程到下一步
        await this.advanceFlow(tx, flowId, stepNumber);
      } else {
        // 等待其他人审批
        await tx.approvalStep.update({
          where: { id: step.id },
          data: {
            approvedBy: approvedBy,
          },
        });

        this.logger.log(
          `并行审批进度: step=${stepNumber}, approved=${approvedBy.length}/${approvers.length}`,
        );
      }

      // 5. 获取完整流程信息返回
      const flow = await tx.approvalFlow.findUnique({
        where: { id: flowId },
        include: {
          ticket: true,
        },
      });

      return this.getFlowByTicketId(flow.ticketId);
    });
  }

  /**
   * 并行审批驳回
   * @param flowId 流程ID
   * @param stepNumber 步骤编号
   * @param approverId 审批人ID
   * @param comment 驳回原因（必填）
   */
  async rejectParallel(
    flowId: bigint,
    stepNumber: number,
    approverId: bigint,
    comment: string,
  ) {
    if (!comment || comment.trim() === '') {
      throw new BadRequestException('驳回原因不能为空');
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取当前步骤
      const step = await tx.approvalStep.findFirst({
        where: {
          flowId,
          stepNumber,
        },
      });

      if (!step) {
        throw new NotFoundException('审批步骤不存在');
      }

      if (step.stepType !== StepType.PARALLEL) {
        throw new BadRequestException('该步骤不是并行审批');
      }

      if (step.status !== StepStatus.PENDING) {
        throw new BadRequestException(`该步骤已完成，当前状态: ${step.status}`);
      }

      // 2. 验证审批人在列表中
      const approvers = (step.approvers as number[]) || [];
      if (!approvers.includes(Number(approverId))) {
        throw new ForbiddenException('您不在审批人列表中');
      }

      // 3. 并行审批中，任何一人驳回，整个步骤驳回
      await tx.approvalStep.update({
        where: { id: step.id },
        data: {
          status: StepStatus.REJECTED,
          comment,
          rejectedAt: new Date(),
          approvedBy: [
            ...((step.approvedBy as any[]) || []),
            {
              userId: Number(approverId),
              decision: 'REJECTED',
              comment,
              time: new Date().toISOString(),
            },
          ],
        },
      });

      this.logger.log(
        `并行审批驳回: step=${stepNumber}, approver=${approverId}, flow=${flowId}`,
      );

      // 4. 退回处理（与顺序审批逻辑相同）
      if (stepNumber === 1) {
        // 第一步驳回：整个流程驳回
        const flow = await tx.approvalFlow.update({
          where: { id: flowId },
          data: {
            status: FlowStatus.REJECTED,
            completedAt: new Date(),
          },
          include: { ticket: true },
        });

        // 通知创建人
        const creatorId = BigInt((flow.ticket.creatorSnapshot as any).id);
        await this.notificationService.createNotification(
          creatorId,
          NotificationType.TICKET_STATUS_CHANGED,
          `审批驳回：工单 #${flow.ticket.number}`,
          `您的工单"${flow.ticket.title}"已被驳回\n驳回原因：${comment}`,
          `/tickets/${flow.ticket.id}`,
        );
      } else {
        // 退回上一步
        await this.rollbackToPreviousStep(tx, flowId, stepNumber, comment);
      }

      const flow = await tx.approvalFlow.findUnique({
        where: { id: flowId },
        include: { ticket: true },
      });

      return this.getFlowByTicketId(flow.ticketId);
    });
  }

  /**
   * 推进流程到下一步（私有方法）
   * @param tx 事务对象
   * @param flowId 流程ID
   * @param currentStepNumber 当前步骤编号
   */
  private async advanceFlow(tx: any, flowId: bigint, currentStepNumber: number) {
    const flow = await tx.approvalFlow.findUnique({
      where: { id: flowId },
      include: {
        ticket: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    const isLastStep = currentStepNumber === flow.totalSteps;

    if (isLastStep) {
      // 最后一步：完成流程
      await tx.approvalFlow.update({
        where: { id: flowId },
        data: {
          status: FlowStatus.APPROVED,
          completedAt: new Date(),
        },
      });

      this.logger.log(`审批流程完成: flow=${flowId}`);

      // 通知创建人
      const creatorId = BigInt((flow.ticket.creatorSnapshot as any).id);
      await this.notificationService.createNotification(
        creatorId,
        NotificationType.TICKET_STATUS_CHANGED,
        `审批通过：工单 #${flow.ticket.number}`,
        `您的工单"${flow.ticket.title}"已通过全部审批`,
        `/tickets/${flow.ticket.id}`,
      );
    } else {
      // 推进到下一步
      const nextStepNumber = currentStepNumber + 1;
      const nextStep = flow.steps.find((s) => s.stepNumber === nextStepNumber);

      if (nextStep) {
        await tx.approvalFlow.update({
          where: { id: flowId },
          data: {
            currentStep: nextStepNumber,
          },
        });

        await tx.ticket.update({
          where: { id: flow.ticketId },
          data: {
            currentStep: nextStepNumber,
          },
        });

        // 通知下一步审批人
        if (nextStep.stepType === StepType.PARALLEL) {
          // 并行审批：通知所有审批人
          const approverIds = (nextStep.approvers as number[]) || [];
          for (const approverId of approverIds) {
            await this.notificationService.createNotification(
              BigInt(approverId),
              NotificationType.TICKET_ASSIGNED,
              `待审批：工单 #${flow.ticket.number}`,
              `工单"${flow.ticket.title}"需要您审批（${nextStep.stepName}）`,
              `/tickets/${flow.ticket.id}`,
            );
          }
          this.logger.log(
            `通知并行审批人: step=${nextStepNumber}, count=${approverIds.length}`,
          );
        } else {
          // 顺序审批：通知对应角色
          const approvers = await this.getUsersByRole(nextStep.approverRole);
          for (const approver of approvers) {
            await this.notificationService.createNotification(
              approver.id,
              NotificationType.TICKET_ASSIGNED,
              `待审批：工单 #${flow.ticket.number}`,
              `工单"${flow.ticket.title}"需要您审批（${nextStep.stepName}）`,
              `/tickets/${flow.ticket.id}`,
            );
          }
          this.logger.log(
            `通知审批人: step=${nextStepNumber}, role=${nextStep.approverRole}`,
          );
        }
      }
    }
  }

  /**
   * 退回到上一步（私有方法）
   * @param tx 事务对象
   * @param flowId 流程ID
   * @param currentStepNumber 当前步骤编号
   * @param comment 退回原因
   */
  private async rollbackToPreviousStep(
    tx: any,
    flowId: bigint,
    currentStepNumber: number,
    comment: string,
  ) {
    const flow = await tx.approvalFlow.findUnique({
      where: { id: flowId },
      include: {
        ticket: true,
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    const previousStepNumber = currentStepNumber - 1;
    const previousStep = flow.steps.find(
      (s) => s.stepNumber === previousStepNumber,
    );

    if (previousStep) {
      // 重置上一步状态
      await tx.approvalStep.update({
        where: { id: previousStep.id },
        data: {
          status: StepStatus.PENDING,
          approverId: null,
          approvedBy: null,
          comment: null,
          approvedAt: null,
        },
      });

      // 更新流程当前步骤
      await tx.approvalFlow.update({
        where: { id: flowId },
        data: {
          currentStep: previousStepNumber,
        },
      });

      await tx.ticket.update({
        where: { id: flow.ticketId },
        data: {
          currentStep: previousStepNumber,
        },
      });

      // 通知上一级审批人
      if (previousStep.stepType === StepType.PARALLEL) {
        const approverIds = (previousStep.approvers as number[]) || [];
        for (const approverId of approverIds) {
          await this.notificationService.createNotification(
            BigInt(approverId),
            NotificationType.TICKET_STATUS_CHANGED,
            `审批退回：工单 #${flow.ticket.number}`,
            `工单"${flow.ticket.title}"被退回至${previousStep.stepName}\n退回原因：${comment}`,
            `/tickets/${flow.ticket.id}`,
          );
        }
      } else {
        const approvers = await this.getUsersByRole(previousStep.approverRole);
        for (const approver of approvers) {
          await this.notificationService.createNotification(
            approver.id,
            NotificationType.TICKET_STATUS_CHANGED,
            `审批退回：工单 #${flow.ticket.number}`,
            `工单"${flow.ticket.title}"被退回至${previousStep.stepName}\n退回原因：${comment}`,
            `/tickets/${flow.ticket.id}`,
          );
        }
      }

      this.logger.log(
        `审批退回上一步: from_step=${currentStepNumber} to_step=${previousStepNumber}`,
      );
    }
  }

  /**
   * 条件评估器
   */
  private evaluateCondition(condition: any, context: any): boolean {
    if (!condition) return true;

    const { field, operator, value } = condition;
    const actualValue = context[field];

    switch (operator) {
      case '>':
        return actualValue > value;
      case '>=':
        return actualValue >= value;
      case '<':
        return actualValue < value;
      case '<=':
        return actualValue <= value;
      case '==':
        return actualValue == value;
      case '!=':
        return actualValue != value;
      case 'in':
        return value.includes(actualValue);
      default:
        return false;
    }
  }

  /**
   * 根据条件选择步骤
   * @param steps 步骤配置列表
   * @param context 上下文数据
   */
  private selectStepsByCondition(steps: any[], context: any): any[] {
    const selectedSteps = [];

    for (const step of steps) {
      if (step.condition) {
        if (this.evaluateCondition(step.condition, context)) {
          selectedSteps.push(step);
        }
      } else {
        selectedSteps.push(step);
      }
    }

    return selectedSteps;
  }

  /**
   * 使用模板创建条件审批流程
   * @param ticketId 工单ID
   * @param templateId 模板ID
   */
  async createConditionalFlow(ticketId: bigint, templateId: bigint) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 获取模板
      const template = await tx.approvalTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new NotFoundException('审批模板不存在');
      }

      if (!template.isActive) {
        throw new BadRequestException('该审批模板已停用');
      }

      // 2. 获取工单信息
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { budget: true },
      });

      if (!ticket) {
        throw new NotFoundException('工单不存在');
      }

      // 3. 构建上下文
      const context = {
        amount: ticket.budget?.amount ? Number(ticket.budget.amount) : 0,
        priority: ticket.priority,
        type: ticket.type,
      };

      // 4. 根据条件选择步骤
      const config = template.config as any;
      const allSteps = config.steps || [];
      const selectedSteps = this.selectStepsByCondition(allSteps, context);

      if (selectedSteps.length === 0) {
        throw new BadRequestException('没有匹配的审批步骤');
      }

      this.logger.log(
        `条件筛选: total=${allSteps.length}, selected=${selectedSteps.length}`,
      );

      // 5. 创建审批流程
      const flow = await tx.approvalFlow.create({
        data: {
          ticketId,
          type: template.type as ApprovalType,
          currentStep: 1,
          totalSteps: selectedSteps.length,
          status: FlowStatus.PENDING,
        },
      });

      // 6. 创建审批步骤
      for (let i = 0; i < selectedSteps.length; i++) {
        const stepConfig = selectedSteps[i];
        const stepData: any = {
          flowId: flow.id,
          stepNumber: i + 1,
          stepName: stepConfig.stepName,
          stepType: stepConfig.stepType || StepType.SEQUENTIAL,
          status: StepStatus.PENDING,
        };

        // 根据步骤类型设置不同字段
        if (stepConfig.stepType === StepType.PARALLEL) {
          // 并行审批：设置审批人列表
          const approverIds = await this.resolveApprovers(
            stepConfig.approvers || [],
          );
          stepData.approvers = approverIds;
          stepData.approvedBy = [];
          stepData.requireAllApprove = stepConfig.requireAllApprove ?? true;
        } else {
          // 顺序审批：设置审批角色
          stepData.approverRole = stepConfig.approverRole;
        }

        if (stepConfig.condition) {
          stepData.condition = stepConfig.condition;
        }

        await tx.approvalStep.create({
          data: stepData,
        });
      }

      // 7. 更新工单状态
      const phaseMap = {
        REPAIR_REVIEW: 'REPAIR',
        BUDGET_REVIEW: 'BUDGET',
        PROJECT_APPROVAL: 'PROJECT',
      };

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          currentPhase: phaseMap[template.type] as any,
          currentStep: 1,
        },
      });

      // 8. 通知第一步审批人
      const firstStep = selectedSteps[0];
      if (firstStep.stepType === StepType.PARALLEL) {
        const approverIds = await this.resolveApprovers(
          firstStep.approvers || [],
        );
        for (const approverId of approverIds) {
          await this.notificationService.createNotification(
            BigInt(approverId),
            NotificationType.TICKET_ASSIGNED,
            `待审批：工单 #${ticket.number}`,
            `工单"${ticket.title}"需要您审批（${firstStep.stepName}）`,
            `/tickets/${ticket.id}`,
          );
        }
      } else {
        const approvers = await this.getUsersByRole(firstStep.approverRole);
        for (const approver of approvers) {
          await this.notificationService.createNotification(
            approver.id,
            NotificationType.TICKET_ASSIGNED,
            `待审批：工单 #${ticket.number}`,
            `工单"${ticket.title}"需要您审批（${firstStep.stepName}）`,
            `/tickets/${ticket.id}`,
          );
        }
      }

      this.logger.log(
        `创建条件审批流程: flow=${flow.id}, template=${template.name}, steps=${selectedSteps.length}`,
      );

      return flow;
    });
  }

  /**
   * 解析审批人（支持角色代码和用户ID）
   * @param approvers 审批人配置数组
   */
  private async resolveApprovers(approvers: any[]): Promise<number[]> {
    const userIds: number[] = [];

    for (const approver of approvers) {
      if (typeof approver === 'number') {
        // 直接是用户ID
        userIds.push(approver);
      } else if (typeof approver === 'string') {
        // 角色代码，需要查询用户
        const users = await this.getUsersByRole(approver);
        userIds.push(...users.map((u) => Number(u.id)));
      }
    }

    return [...new Set(userIds)]; // 去重
  }
}
