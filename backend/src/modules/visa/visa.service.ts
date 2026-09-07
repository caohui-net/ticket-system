import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { NotificationService } from '../notification/notification.service';
import { SubmitVisaDto } from './dto/submit-visa.dto';
import { ReviewVisaDto } from './dto/review-visa.dto';

@Injectable()
export class VisaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 提交签证（乙方或副主任）
   */
  async submitVisa(ticketId: number, dto: SubmitVisaDto, userId: number) {
    // 1. 验证工单和立项状态
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(ticketId) },
      include: { project: true, budget: true }
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    if (ticket.currentPhase !== 'EXECUTION') {
      throw new BadRequestException('工单不在执行阶段，无法提交签证');
    }

    if (!ticket.project) {
      throw new NotFoundException('该工单没有关联的立项');
    }

    // 2. 检查是否已有签证
    const existing = await this.prisma.visa.findUnique({
      where: { ticketId: BigInt(ticketId) }
    });

    if (existing) {
      throw new BadRequestException('该工单已有签证');
    }

    // 3. 创建签证（使用事务）
    const visa = await this.prisma.$transaction(async (tx) => {
      const newVisa = await tx.visa.create({
        data: {
          ticketId: BigInt(ticketId),
          projectId: ticket.project.id,
          title: dto.title,
          reason: dto.reason,
          changeType: dto.changeType as any, // DTO validation ensures it's a valid VisaType
          originalValue: dto.originalValue,
          changedValue: dto.changedValue,
          description: dto.description,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
          status: 'SUBMITTED',
          createdBy: BigInt(userId),
          submittedAt: new Date(),
        },
      });

      // 4. 创建签证审批流程（根据金额决定审批级别）
      const approvalType = this.getVisaApprovalType(
        dto.changeType,
        Number(dto.changedValue),
      );

      await this.approvalService.createFlow(
        BigInt(ticketId),
        approvalType,
        this.getVisaApprovalSteps(approvalType),
      );

      // 5. 更新工单阶段
      await tx.ticket.update({
        where: { id: BigInt(ticketId) },
        data: { currentPhase: 'CERTIFICATE' }
      });

      return newVisa;
    });

    // 6. 发送通知
    await this.notificationService.notifyVisaSubmitted(ticketId, userId);

    return visa;
  }

  /**
   * 审核签证
   */
  async reviewVisa(visaId: number, dto: ReviewVisaDto, userId: number) {
    // 1. 查找签证
    const visa = await this.prisma.visa.findUnique({
      where: { id: BigInt(visaId) },
      include: { ticket: true, project: true }
    });

    if (!visa) {
      throw new NotFoundException('签证不存在');
    }

    if (visa.status !== 'SUBMITTED') {
      throw new BadRequestException('签证状态不允许审核');
    }

    // 2. 检查审批权限
    const approvalFlow = await this.prisma.approvalFlow.findUnique({
      where: { ticketId: visa.ticketId },
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

    // 3. 使用事务更新签证和审批流程
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

      // 如果驳回，更新签证状态
      if (!dto.approved) {
        await tx.visa.update({
          where: { id: BigInt(visaId) },
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

        // 工单回退到执行阶段
        await tx.ticket.update({
          where: { id: visa.ticketId },
          data: { currentPhase: 'EXECUTION' }
        });

        return { approved: false };
      }

      // 如果批准，检查是否还有后续步骤
      const isLastStep = approvalFlow.currentStep === approvalFlow.totalSteps;

      if (isLastStep) {
        // 最后一步，签证通过
        await tx.visa.update({
          where: { id: BigInt(visaId) },
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

        // 工单进入下一阶段（验收或结算）
        await tx.ticket.update({
          where: { id: visa.ticketId },
          data: { currentPhase: 'ACCEPTANCE' }
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
      await this.notificationService.notifyVisaApproved(Number(visa.ticketId), userId);
    } else if (!result.approved) {
      await this.notificationService.notifyVisaRejected(Number(visa.ticketId), userId, dto.comment);
    }

    return visa;
  }

  /**
   * 查询签证
   */
  async getVisa(ticketId: number) {
    return this.prisma.visa.findUnique({
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
   * 查询签证列表
   */
  async getVisaList(filters?: { status?: string; createdBy?: number }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.createdBy) {
      where.createdBy = BigInt(filters.createdBy);
    }

    return this.prisma.visa.findMany({
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
   * 根据变更类型和金额确定审批类型
   */
  private getVisaApprovalType(changeType: string, amount: number): any {
    if (changeType === 'COST_INCREASE') {
      if (amount > 50000) {
        return 'VISA_APPROVAL_HIGH';  // 高额签证：三级审批
      } else if (amount > 10000) {
        return 'VISA_APPROVAL_MEDIUM';  // 中额签证：两级审批
      } else {
        return 'VISA_APPROVAL_LOW';  // 低额签证：单级审批
      }
    }
    return 'VISA_APPROVAL_MEDIUM';  // 其他类型默认两级
  }

  /**
   * 获取审批步骤配置
   */
  private getVisaApprovalSteps(type: string) {
    const configs = {
      VISA_APPROVAL_LOW: [
        { stepNumber: 1, stepName: '副主任审核', approverRole: 'VICE_DIRECTOR' }
      ],
      VISA_APPROVAL_MEDIUM: [
        { stepNumber: 1, stepName: '副主任审核', approverRole: 'VICE_DIRECTOR' },
        { stepNumber: 2, stepName: '分管领导审核', approverRole: 'VICE_LEADER' }
      ],
      VISA_APPROVAL_HIGH: [
        { stepNumber: 1, stepName: '副主任审核', approverRole: 'VICE_DIRECTOR' },
        { stepNumber: 2, stepName: '分管领导审核', approverRole: 'VICE_LEADER' },
        { stepNumber: 3, stepName: '一把手终审', approverRole: 'TOP_LEADER' }
      ],
    };
    return configs[type] || configs.VISA_APPROVAL_MEDIUM;
  }
}
