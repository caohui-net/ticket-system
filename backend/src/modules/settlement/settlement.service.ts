import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { NotificationService } from '../notification/notification.service';
import { SubmitSettlementDto } from './dto/submit-settlement.dto';
import { ReviewSettlementDto } from './dto/review-settlement.dto';

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 提交结算（乙方）
   */
  async submitSettlement(ticketId: number, dto: SubmitSettlementDto, userId: number) {
    // 1. 验证工单状态
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(ticketId) },
      include: {
        project: true,
        budget: true,
        visa: true
      }
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    // 验收阶段之后才能提交结算
    if (ticket.currentPhase !== 'ACCEPTANCE' && ticket.currentPhase !== 'SETTLEMENT') {
      throw new BadRequestException('工单未完成验收，无法提交结算');
    }

    if (!ticket.project) {
      throw new NotFoundException('该工单没有关联的立项');
    }

    if (!ticket.budget) {
      throw new NotFoundException('该工单没有预算信息');
    }

    // 2. 检查是否已有结算
    const existing = await this.prisma.settlement.findUnique({
      where: { ticketId: BigInt(ticketId) }
    });

    if (existing) {
      throw new BadRequestException('该工单已有结算');
    }

    // 3. 验证金额合理性
    const budgetAmount = Number(ticket.budget.amount);
    const visaAmount = ticket.visa ? Number(ticket.visa.changedValue) : 0;
    const expectedTotal = budgetAmount + visaAmount;

    if (dto.totalAmount > expectedTotal * 1.1) {
      throw new BadRequestException('结算金额超出预算和签证总和的10%，请核对');
    }

    // 4. 创建结算（使用事务）
    const settlement = await this.prisma.$transaction(async (tx) => {
      const newSettlement = await tx.settlement.create({
        data: {
          ticketId: BigInt(ticketId),
          projectId: ticket.project.id,
          totalAmount: dto.totalAmount,
          originalAmount: dto.originalAmount || budgetAmount,
          visaAmount: dto.visaAmount || visaAmount,
          description: dto.description,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
          status: 'SUBMITTED',
          createdBy: BigInt(userId),
          submittedAt: new Date(),
        },
      });

      // 5. 创建结算审批流程（根据金额决定审批级别）
      const approvalType = this.getSettlementApprovalType(dto.totalAmount);

      await this.approvalService.createFlow(
        BigInt(ticketId),
        approvalType,
        this.getSettlementApprovalSteps(approvalType),
      );

      // 6. 更新工单阶段
      await tx.ticket.update({
        where: { id: BigInt(ticketId) },
        data: { currentPhase: 'SETTLEMENT' }
      });

      return newSettlement;
    });

    // 7. 发送通知
    await this.notificationService.notifySettlementSubmitted(ticketId, userId);

    return settlement;
  }

  /**
   * 审核结算
   */
  async reviewSettlement(settlementId: number, dto: ReviewSettlementDto, userId: number) {
    // 1. 查找结算
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: BigInt(settlementId) },
      include: { ticket: true, project: true }
    });

    if (!settlement) {
      throw new NotFoundException('结算不存在');
    }

    if (settlement.status !== 'SUBMITTED') {
      throw new BadRequestException('结算状态不允许审核');
    }

    // 2. 检查审批权限
    const approvalFlow = await this.prisma.approvalFlow.findUnique({
      where: { ticketId: settlement.ticketId },
      include: {
        steps: {
          where: { stepNumber: { lte: 999 } },
          orderBy: { stepNumber: 'asc' }
        }
      }
    });

    if (!approvalFlow) {
      throw new NotFoundException('审批流程不存在');
    }

    const currentStep = approvalFlow.steps.find(
      s => s.stepNumber === approvalFlow.currentStep && s.status === 'PENDING'
    );

    if (!currentStep) {
      throw new BadRequestException('当前没有待审批的步骤');
    }

    if (currentStep.approverId && currentStep.approverId !== BigInt(userId)) {
      throw new ForbiddenException('您不是当前步骤的审批人');
    }

    // 3. 使用事务更新结算和审批流程
    const result = await this.prisma.$transaction(async (tx) => {
      // 更新审批步骤
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: dto.approved ? 'APPROVED' : 'REJECTED',
          comment: dto.comment,
          approvedAt: dto.approved ? new Date() : undefined,
          rejectedAt: dto.approved ? undefined : new Date(),
        }
      });

      // 如果驳回，更新结算状态
      if (!dto.approved) {
        await tx.settlement.update({
          where: { id: BigInt(settlementId) },
          data: {
            status: 'REJECTED',
            reviewedBy: BigInt(userId),
            reviewedAt: new Date(),
            reviewComment: dto.comment,
          }
        });

        await tx.approvalFlow.update({
          where: { id: approvalFlow.id },
          data: {
            status: 'REJECTED',
            completedAt: new Date(),
          }
        });

        // 工单回退到验收阶段
        await tx.ticket.update({
          where: { id: settlement.ticketId },
          data: { currentPhase: 'ACCEPTANCE' }
        });

        return { approved: false };
      }

      // 如果批准，检查是否还有后续步骤
      const isLastStep = approvalFlow.currentStep === approvalFlow.totalSteps;

      if (isLastStep) {
        // 最后一步，结算通过
        await tx.settlement.update({
          where: { id: BigInt(settlementId) },
          data: {
            status: 'APPROVED',
            reviewedBy: BigInt(userId),
            reviewedAt: new Date(),
            reviewComment: dto.comment,
          }
        });

        await tx.approvalFlow.update({
          where: { id: approvalFlow.id },
          data: {
            status: 'APPROVED',
            completedAt: new Date(),
          }
        });

        // 工单完成
        await tx.ticket.update({
          where: { id: settlement.ticketId },
          data: {
            currentPhase: 'COMPLETED',
            status: 'RESOLVED',
            resolvedAt: new Date(),
          }
        });

        return { approved: true, final: true };
      } else {
        // 还有后续步骤，进入下一步
        await tx.approvalFlow.update({
          where: { id: approvalFlow.id },
          data: { currentStep: approvalFlow.currentStep + 1 }
        });

        return { approved: true, final: false };
      }
    });

    // 4. 发送通知
    if (result.approved && result.final) {
      await this.notificationService.notifySettlementApproved(Number(settlement.ticketId), userId);
    } else if (!result.approved) {
      await this.notificationService.notifySettlementRejected(Number(settlement.ticketId), userId, dto.comment);
    }

    return settlement;
  }

  /**
   * 标记结算为已支付
   */
  async markAsPaid(settlementId: number, userId: number) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id: BigInt(settlementId) }
    });

    if (!settlement) {
      throw new NotFoundException('结算不存在');
    }

    if (settlement.status !== 'APPROVED') {
      throw new BadRequestException('结算未批准，无法标记为已支付');
    }

    return this.prisma.settlement.update({
      where: { id: BigInt(settlementId) },
      data: { status: 'PAID' }
    });
  }

  /**
   * 查询结算
   */
  async getSettlement(ticketId: number) {
    return this.prisma.settlement.findUnique({
      where: { ticketId: BigInt(ticketId) },
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            title: true,
            currentPhase: true,
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            plannedStartDate: true,
            plannedDuration: true,
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            realName: true,
          }
        },
      },
    });
  }

  /**
   * 查询结算列表
   */
  async getSettlementList(filters?: { status?: string; createdBy?: number }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.createdBy) {
      where.createdBy = BigInt(filters.createdBy);
    }

    return this.prisma.settlement.findMany({
      where,
      include: {
        ticket: {
          select: {
            id: true,
            number: true,
            title: true,
          }
        },
        project: {
          select: {
            id: true,
            title: true,
          }
        },
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * 根据金额确定审批类型
   */
  private getSettlementApprovalType(amount: number): any {
    if (amount > 100000) {
      return 'SETTLEMENT_APPROVAL_HIGH';  // 高额结算：三级审批
    } else if (amount > 50000) {
      return 'SETTLEMENT_APPROVAL_MEDIUM';  // 中额结算：两级审批
    } else {
      return 'SETTLEMENT_APPROVAL_LOW';  // 低额结算：单级审批
    }
  }

  /**
   * 获取审批步骤配置
   */
  private getSettlementApprovalSteps(type: string) {
    const configs = {
      SETTLEMENT_APPROVAL_LOW: [
        { stepNumber: 1, stepName: '财务审核', approverRole: 'FINANCE' }
      ],
      SETTLEMENT_APPROVAL_MEDIUM: [
        { stepNumber: 1, stepName: '财务审核', approverRole: 'FINANCE' },
        { stepNumber: 2, stepName: '分管领导审批', approverRole: 'VICE_LEADER' }
      ],
      SETTLEMENT_APPROVAL_HIGH: [
        { stepNumber: 1, stepName: '财务审核', approverRole: 'FINANCE' },
        { stepNumber: 2, stepName: '分管领导审批', approverRole: 'VICE_LEADER' },
        { stepNumber: 3, stepName: '一把手终审', approverRole: 'TOP_LEADER' }
      ],
    };
    return configs[type] || configs.SETTLEMENT_APPROVAL_MEDIUM;
  }
}
