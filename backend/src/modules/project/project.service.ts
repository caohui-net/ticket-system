import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApprovalService } from '../approval/approval.service';
import { NotificationService } from '../notification/notification.service';
import { APPROVAL_CONFIGS } from '../approval/interfaces/approval-config.interface';
import { InitiateProjectDto } from './dto/initiate-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ApprovalType, ProjectStatus, NotificationType } from '@prisma/client';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 发起立项审批（REQ-05）
   */
  async initiateProject(ticketId: number, dto: InitiateProjectDto, userId: number) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. 验证用户是副主任/主管角色
      const userRoles = await this.getUserRoles(BigInt(userId));
      const hasPermission = userRoles.includes('VICE_DIRECTOR') || userRoles.includes('DEPT_MANAGER');

      if (!hasPermission) {
        throw new ForbiddenException('只有副主任或主管才能发起立项审批');
      }

      // 2. 验证工单存在且状态正确（预算已审核）
      const ticket = await tx.ticket.findUnique({
        where: { id: BigInt(ticketId) },
        include: {
          budget: true,
          approvalFlow: true,
        },
      });

      if (!ticket) {
        throw new NotFoundException(`工单不存在: ${ticketId}`);
      }

      // 验证预算已审核
      if (!ticket.budget) {
        throw new BadRequestException('工单尚未提交预算');
      }

      if (ticket.budget.status !== 'APPROVED') {
        throw new BadRequestException('预算尚未审核通过，无法发起立项');
      }

      // 3. 检查是否已有立项
      const existingProject = await tx.project.findUnique({
        where: { ticketId: BigInt(ticketId) },
      });

      if (existingProject) {
        throw new BadRequestException(`工单 #${ticket.number} 已存在立项`);
      }

      // 4. 创建Project记录
      const project = await tx.project.create({
        data: {
          ticketId: BigInt(ticketId),
          title: dto.title,
          plannedStartDate: new Date(dto.plannedStartDate),
          plannedDuration: dto.plannedDuration,
          contractorName: dto.contractorName,
          description: dto.description,
          status: ProjectStatus.PENDING,
          createdBy: BigInt(userId),
          submittedAt: new Date(),
        },
      });

      // 5. 创建三级审批流程（PROJECT_APPROVAL）
      await this.approvalService.createFlow(
        BigInt(ticketId),
        ApprovalType.PROJECT_APPROVAL,
      );

      // 6. 更新Ticket的currentPhase为PROJECT（已在approvalService.createFlow中处理）

      return project;
    });
  }

  /**
   * 查询立项详情
   */
  async getProject(ticketId: number) {
    const project = await this.prisma.project.findUnique({
      where: { ticketId: BigInt(ticketId) },
      include: {
        ticket: {
          include: {
            approvalFlow: {
              include: {
                steps: {
                  include: { approver: true },
                  orderBy: { stepNumber: 'asc' },
                }
              }
            }
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
      },
    });

    if (!project) {
      return null;
    }

    // 转换BigInt为字符串
    return {
      ...project,
      id: project.id.toString(),
      ticketId: project.ticketId.toString(),
      createdBy: project.createdBy.toString(),
      creator: {
        ...project.creator,
        id: project.creator.id.toString(),
      },
    };
  }

  /**
   * 更新立项（仅草稿或被驳回时可更新）
   */
  async updateProject(ticketId: number, dto: UpdateProjectDto, userId: number) {
    // 1. 查询现有立项
    const project = await this.prisma.project.findUnique({
      where: { ticketId: BigInt(ticketId) },
    });

    if (!project) {
      throw new NotFoundException('立项不存在');
    }

    // 2. 验证是创建人
    if (project.createdBy !== BigInt(userId)) {
      throw new ForbiddenException('只有创建人才能修改立项');
    }

    // 3. 验证状态是DRAFT或REJECTED
    if (project.status !== ProjectStatus.DRAFT && project.status !== ProjectStatus.REJECTED) {
      throw new BadRequestException(`立项状态为 ${project.status}，无法修改`);
    }

    // 4. 更新Project
    const updated = await this.prisma.project.update({
      where: { ticketId: BigInt(ticketId) },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.plannedStartDate && { plannedStartDate: new Date(dto.plannedStartDate) }),
        ...(dto.plannedDuration && { plannedDuration: dto.plannedDuration }),
        ...(dto.contractorName && { contractorName: dto.contractorName }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      ...updated,
      id: updated.id.toString(),
      ticketId: updated.ticketId.toString(),
      createdBy: updated.createdBy.toString(),
    };
  }

  /**
   * 获取用户角色列表（私有方法）
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
}
