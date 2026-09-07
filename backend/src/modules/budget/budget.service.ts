import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { NotificationService } from '../notification/notification.service';
import { APPROVAL_CONFIGS } from '../approval/interfaces/approval-config.interface';
import { SubmitBudgetDto } from './dto/submit-budget.dto';
import { ReviewBudgetDto } from './dto/review-budget.dto';
import { BudgetStatus, Phase } from '@prisma/client';

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 乙方提交预算（REQ-03）
   */
  async submitBudget(ticketId: number, dto: SubmitBudgetDto, userId: number) {
    // 1. 验证用户是乙方角色（isExternal=true 或 有CONTRACTOR角色）
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { userRoles: { include: { role: true } } }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否是乙方
    const isContractor = user.isExternal ||
      user.userRoles.some(ur => ur.role.code === 'CONTRACTOR');

    if (!isContractor) {
      throw new ForbiddenException('只有乙方人员可以提交预算');
    }

    // 2. 验证工单状态（必须报修已审核）
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(ticketId) },
      include: { approvalFlow: true }
    });

    if (!ticket) {
      throw new NotFoundException('工单不存在');
    }

    // 检查报修审核是否通过
    if (!ticket.approvalFlow || ticket.approvalFlow.status !== 'APPROVED') {
      throw new BadRequestException('报修单尚未审核通过，无法提交预算');
    }

    // 3. 检查是否已有预算
    const existing = await this.prisma.budget.findUnique({
      where: { ticketId: BigInt(ticketId) }
    });

    if (existing) {
      throw new BadRequestException('该工单已有预算，请更新现有预算');
    }

    // 4. 创建预算（使用事务）
    const budget = await this.prisma.$transaction(async (tx) => {
      // 创建预算记录
      const newBudget = await tx.budget.create({
        data: {
          ticketId: BigInt(ticketId),
          amount: dto.amount,
          description: dto.description,
          attachments: dto.attachments ? JSON.stringify(dto.attachments) : null,
          status: BudgetStatus.SUBMITTED,
          createdBy: BigInt(userId),
          submittedAt: new Date(),
        },
      });

      // 5. 创建预算审批流程（副主任审核）
      await this.approvalService.createFlow(
        BigInt(ticketId),
        'BUDGET_REVIEW',
        [...APPROVAL_CONFIGS.BUDGET_REVIEW]
      );

      // 6. 更新Ticket的currentPhase为BUDGET
      await tx.ticket.update({
        where: { id: BigInt(ticketId) },
        data: {
          currentPhase: Phase.BUDGET,
          currentStep: 1,
        },
      });

      return newBudget;
    });

    // 7. 通知副主任审核
    // NotificationService会在createFlow中自动发送

    return budget;
  }

  /**
   * 副主任审核预算（REQ-04）
   */
  async reviewBudget(budgetId: number, dto: ReviewBudgetDto, userId: number) {
    // 1. 验证用户是副主任角色
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { userRoles: { include: { role: true } } }
    });

    const isViceDirector = user?.userRoles.some(ur => ur.role.code === 'VICE_DIRECTOR');
    if (!isViceDirector) {
      throw new ForbiddenException('只有副主任可以审核预算');
    }

    // 2. 查询预算
    const budget = await this.prisma.budget.findUnique({
      where: { id: BigInt(budgetId) },
      include: { ticket: { include: { approvalFlow: true } } }
    });

    if (!budget) {
      throw new NotFoundException('预算不存在');
    }

    if (budget.status !== BudgetStatus.SUBMITTED) {
      throw new BadRequestException('预算状态不正确，无法审核');
    }

    // 3. 通过审批服务处理
    const flow = budget.ticket.approvalFlow;
    if (!flow || flow.type !== 'BUDGET_REVIEW') {
      throw new BadRequestException('审批流程不存在或类型不正确');
    }

    if (dto.approved) {
      // 审批通过
      await this.approvalService.approve(flow.id, 1, BigInt(userId), dto.comment);
    } else {
      // 审批驳回
      await this.approvalService.reject(flow.id, 1, BigInt(userId), dto.comment);
    }

    // 4. 更新预算状态
    const updatedBudget = await this.prisma.budget.update({
      where: { id: BigInt(budgetId) },
      data: {
        status: dto.approved ? BudgetStatus.APPROVED : BudgetStatus.REJECTED,
        reviewedBy: BigInt(userId),
        reviewedAt: new Date(),
        reviewComment: dto.comment,
      },
    });

    return updatedBudget;
  }

  /**
   * 查询预算详情
   */
  async getBudget(ticketId: number) {
    const budget = await this.prisma.budget.findUnique({
      where: { ticketId: BigInt(ticketId) },
      include: {
        ticket: true,
        creator: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
            organization: true,
          }
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            realName: true,
            email: true,
          }
        },
      },
    });

    // 解析attachments JSON
    if (budget && budget.attachments) {
      try {
        (budget as any).attachmentsList = JSON.parse(budget.attachments);
      } catch (e) {
        (budget as any).attachmentsList = [];
      }
    }

    return budget;
  }
}
