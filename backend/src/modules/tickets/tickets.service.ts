import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { TicketStatus } from '@prisma/client';
import { CurrentUser } from './interfaces/current-user.interface';
import { NotificationService } from '../notification/notification.service';

/**
 * 工单服务
 * 提供工单的CRUD操作和状态管理
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 创建工单
   * @param createTicketDto 创建工单DTO
   * @param currentUser 当前用户信息
   * @returns 创建的工单
   */
  async create(createTicketDto: CreateTicketDto, currentUser: CurrentUser) {
    // 构建创建者快照
    const creatorSnapshot = {
      id: Number(currentUser.id),
      username: currentUser.username,
      realName: currentUser.realName,
    };

    const ticket = await this.prisma.ticket.create({
      data: {
        title: createTicketDto.title,
        description: createTicketDto.description,
        type: createTicketDto.type,
        priority: createTicketDto.priority || 'MEDIUM',
        tags: createTicketDto.tags || [],
        creatorSnapshot,
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

    // 发送工单创建通知（异步，不阻塞）
    this.notificationService.notifyTicketCreated(ticket).catch((error) => {
      console.error('发送工单创建通知失败:', error);
    });

    return ticket;
  }

  /**
   * 查询工单列表
   * @param queryDto 查询参数
   * @returns 工单列表和分页信息
   */
  async findAll(queryDto: QueryTicketsDto) {
    const {
      status,
      priority,
      assigneeId,
      creatorId,
      keyword,
      page = 1,
      pageSize = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    // 构建查询条件
    const where: Record<string, unknown> = {
      hidden: false,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (assigneeId) {
      where.assigneeId = BigInt(assigneeId);
    }

    if (creatorId) {
      where.creatorSnapshot = {
        path: ['id'],
        equals: creatorId,
      };
    }

    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    // 计算分页
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 查询数据
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
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
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询单个工单
   * @param id 工单ID
   * @returns 工单详情
   */
  async findOne(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(id) },
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

    if (!ticket || ticket.hidden) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    return ticket;
  }

  /**
   * 更新工单
   * @param id 工单ID
   * @param updateTicketDto 更新数据
   * @returns 更新后的工单
   */
  async update(id: number, updateTicketDto: UpdateTicketDto) {
    // 检查工单是否存在
    const existingTicket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(id) },
    });

    if (!existingTicket || existingTicket.hidden) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    // 检查锁定状态
    if (existingTicket.locked) {
      throw new BadRequestException('工单已锁定，无法修改');
    }

    // 处理状态变更时间戳
    const updateData: Record<string, unknown> = { ...updateTicketDto };

    if (updateTicketDto.status) {
      const oldStatus = existingTicket.status;
      const newStatus = updateTicketDto.status;

      // 记录状态变更时间戳
      if (newStatus === TicketStatus.RESOLVED && oldStatus !== TicketStatus.RESOLVED) {
        updateData.resolvedAt = new Date();
      }

      if (newStatus === TicketStatus.CLOSED && oldStatus !== TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
      }
    }

    // 处理 assigneeId
    if (updateTicketDto.assigneeId !== undefined) {
      updateData.assigneeId = updateTicketDto.assigneeId
        ? BigInt(updateTicketDto.assigneeId)
        : null;
      updateData.assignedAt = updateTicketDto.assigneeId ? new Date() : null;
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: BigInt(id) },
      data: updateData,
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

    return ticket;
  }

  /**
   * 软删除工单
   * @param id 工单ID
   * @returns 删除结果
   */
  async remove(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(id) },
    });

    if (!ticket || ticket.hidden) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    if (ticket.locked) {
      throw new BadRequestException('工单已锁定，无法删除');
    }

    await this.prisma.ticket.update({
      where: { id: BigInt(id) },
      data: { hidden: true },
    });

    return { message: '工单删除成功' };
  }

  /**
   * 分配工单
   * @param id 工单ID
   * @param assigneeId 处理人ID
   * @param currentUser 当前用户
   * @returns 分配后的工单
   */
  async assign(id: number, assigneeId: number, currentUser: CurrentUser) {
    // 检查工单是否存在
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(id) },
    });

    if (!ticket || ticket.hidden) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    if (ticket.locked) {
      throw new BadRequestException('工单已锁定，无法分配');
    }

    // 检查处理人是否存在
    const assignee = await this.prisma.user.findUnique({
      where: { id: BigInt(assigneeId) },
    });

    if (!assignee) {
      throw new NotFoundException(`用户 #${assigneeId} 不存在`);
    }

    // 更新工单
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: BigInt(id) },
      data: {
        assigneeId: BigInt(assigneeId),
        assignedAt: new Date(),
      },
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
      },
    });

    // 创建系统日志
    await this.prisma.ticketLog.create({
      data: {
        ticketId: BigInt(id),
        content: `工单已分配给 ${assignee.realName}（${assignee.username}）`,
        isPublic: true,
        isSystem: true,
        creatorSnapshot: {
          id: Number(currentUser.id),
          username: currentUser.username,
          realName: currentUser.realName,
        },
      },
    });

    // 发送工单分配通知（异步，不阻塞）
    this.notificationService.notifyTicketAssigned(updatedTicket, assignee).catch((error) => {
      console.error('发送工单分配通知失败:', error);
    });

    return updatedTicket;
  }

  /**
   * 变更工单状态
   * @param id 工单ID
   * @param newStatus 新状态
   * @param currentUser 当前用户
   * @returns 更新后的工单
   */
  async changeStatus(id: number, newStatus: TicketStatus, currentUser: CurrentUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: BigInt(id) },
    });

    if (!ticket || ticket.hidden) {
      throw new NotFoundException(`工单 #${id} 不存在`);
    }

    if (ticket.locked) {
      throw new BadRequestException('工单已锁定，无法修改状态');
    }

    const oldStatus = ticket.status;

    // 准备更新数据
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    // 记录状态变更时间戳
    if (newStatus === TicketStatus.RESOLVED && oldStatus !== TicketStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    if (newStatus === TicketStatus.CLOSED && oldStatus !== TicketStatus.CLOSED) {
      updateData.closedAt = new Date();
    }

    // 更新工单
    const updatedTicket = await this.prisma.ticket.update({
      where: { id: BigInt(id) },
      data: updateData,
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

    // 创建系统日志
    const statusMap = {
      OPEN: '待处理',
      IN_PROGRESS: '处理中',
      PENDING: '待反馈',
      RESOLVED: '已解决',
      CLOSED: '已关闭',
      CANCELLED: '已取消',
    };

    await this.prisma.ticketLog.create({
      data: {
        ticketId: BigInt(id),
        content: `状态从 "${statusMap[oldStatus]}" 变更为 "${statusMap[newStatus]}"`,
        isPublic: true,
        isSystem: true,
        creatorSnapshot: {
          id: Number(currentUser.id),
          username: currentUser.username,
          realName: currentUser.realName,
        },
      },
    });

    // 发送状态变更通知（异步，不阻塞）
    this.notificationService
      .notifyTicketStatusChanged(updatedTicket, oldStatus, newStatus)
      .catch((error) => {
        console.error('发送状态变更通知失败:', error);
      });

    return updatedTicket;
  }
}
