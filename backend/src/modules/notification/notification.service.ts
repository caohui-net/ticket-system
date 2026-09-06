import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { NotificationType } from '@prisma/client';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { UpdateNotificationSettingDto } from './dto/update-notification-setting.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 创建应用内通知
   */
  async createNotification(
    userId: bigint,
    type: NotificationType,
    title: string,
    content: string,
    link?: string,
  ) {
    try {
      // 检查用户通知设置
      const setting = await this.getOrCreateNotificationSetting(userId);

      if (!setting.inAppEnabled) {
        this.logger.log(`用户 ${userId} 已关闭应用内通知`);
        return null;
      }

      // 检查具体通知类型是否启用
      const typeEnabled = this.isNotificationTypeEnabled(setting, type);
      if (!typeEnabled) {
        this.logger.log(`用户 ${userId} 已关闭 ${type} 类型通知`);
        return null;
      }

      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          content,
          link,
        },
      });

      this.logger.log(`创建通知成功: ${notification.id} for user ${userId}`);
      return notification;
    } catch (error) {
      this.logger.error(`创建通知失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查通知类型是否启用
   */
  private isNotificationTypeEnabled(setting: any, type: NotificationType): boolean {
    const typeMap = {
      TICKET_CREATED: setting.ticketCreated,
      TICKET_ASSIGNED: setting.ticketAssigned,
      TICKET_STATUS_CHANGED: setting.ticketStatusChanged,
      TICKET_COMMENTED: setting.ticketCommented,
      MENTION: setting.mention,
    };
    return typeMap[type] ?? true;
  }

  /**
   * 获取或创建用户通知设置
   */
  async getOrCreateNotificationSetting(userId: bigint) {
    let setting = await this.prisma.notificationSetting.findUnique({
      where: { userId },
    });

    if (!setting) {
      setting = await this.prisma.notificationSetting.create({
        data: { userId },
      });
      this.logger.log(`为用户 ${userId} 创建默认通知设置`);
    }

    return setting;
  }

  /**
   * 查询用户通知列表
   */
  async findAll(userId: number, query: QueryNotificationsDto) {
    const { unreadOnly, page = 1, pageSize = 20 } = query;

    const where: any = {
      userId: BigInt(userId),
    };

    if (unreadOnly) {
      where.read = false;
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id.toString(),
        userId: n.userId.toString(),
        type: n.type,
        title: n.title,
        content: n.content,
        link: n.link,
        read: n.read,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId: BigInt(userId),
        read: false,
      },
    });
  }

  /**
   * 标记单个通知为已读
   */
  async markAsRead(userId: number, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: BigInt(notificationId) },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.userId !== BigInt(userId)) {
      throw new NotFoundException('通知不存在');
    }

    await this.prisma.notification.update({
      where: { id: BigInt(notificationId) },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { message: '已标记为已读' };
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: {
        userId: BigInt(userId),
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return { message: '所有通知已标记为已读' };
  }

  /**
   * 删除通知
   */
  async remove(userId: number, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: BigInt(notificationId) },
    });

    if (!notification) {
      throw new NotFoundException('通知不存在');
    }

    if (notification.userId !== BigInt(userId)) {
      throw new NotFoundException('通知不存在');
    }

    await this.prisma.notification.delete({
      where: { id: BigInt(notificationId) },
    });

    return { message: '通知已删除' };
  }

  /**
   * 获取用户通知设置
   */
  async getNotificationSetting(userId: number) {
    const setting = await this.getOrCreateNotificationSetting(BigInt(userId));

    return {
      id: setting.id.toString(),
      userId: setting.userId.toString(),
      inAppEnabled: setting.inAppEnabled,
      ticketCreated: setting.ticketCreated,
      ticketAssigned: setting.ticketAssigned,
      ticketStatusChanged: setting.ticketStatusChanged,
      ticketCommented: setting.ticketCommented,
      mention: setting.mention,
      emailEnabled: setting.emailEnabled,
      emailTicketCreated: setting.emailTicketCreated,
      emailTicketAssigned: setting.emailTicketAssigned,
      emailTicketStatusChanged: setting.emailTicketStatusChanged,
      emailTicketCommented: setting.emailTicketCommented,
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * 更新用户通知设置
   */
  async updateNotificationSetting(userId: number, dto: UpdateNotificationSettingDto) {
    await this.getOrCreateNotificationSetting(BigInt(userId));

    const updated = await this.prisma.notificationSetting.update({
      where: { userId: BigInt(userId) },
      data: dto,
    });

    return {
      id: updated.id.toString(),
      userId: updated.userId.toString(),
      inAppEnabled: updated.inAppEnabled,
      ticketCreated: updated.ticketCreated,
      ticketAssigned: updated.ticketAssigned,
      ticketStatusChanged: updated.ticketStatusChanged,
      ticketCommented: updated.ticketCommented,
      mention: updated.mention,
      emailEnabled: updated.emailEnabled,
      emailTicketCreated: updated.emailTicketCreated,
      emailTicketAssigned: updated.emailTicketAssigned,
      emailTicketStatusChanged: updated.emailTicketStatusChanged,
      emailTicketCommented: updated.emailTicketCommented,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // ==================== 通知触发方法 ====================

  /**
   * 工单创建通知
   */
  async notifyTicketCreated(ticket: any) {
    try {
      // 通知管理员（这里简化为通知所有管理员角色的用户）
      const admins = await this.prisma.user.findMany({
        where: {
          userRoles: {
            some: {
              role: {
                code: {
                  in: ['admin', 'manager'],
                },
              },
            },
          },
          status: 1,
        },
        select: {
          id: true,
          email: true,
        },
      });

      for (const admin of admins) {
        // 应用内通知
        await this.createNotification(
          admin.id,
          NotificationType.TICKET_CREATED,
          `新工单 #${ticket.number}`,
          `${ticket.creatorSnapshot.realName} 创建了新工单：${ticket.title}`,
          `/tickets/${ticket.id}`,
        );

        // 邮件通知（如果启用）
        const setting = await this.getOrCreateNotificationSetting(admin.id);
        if (setting.emailEnabled && setting.emailTicketCreated) {
          await this.emailService.sendTicketCreatedEmail(
            admin.email,
            ticket.number,
            ticket.title,
          );
        }
      }

      this.logger.log(`工单创建通知已发送: #${ticket.number}`);
    } catch (error) {
      this.logger.error(`发送工单创建通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 工单分配通知
   */
  async notifyTicketAssigned(ticket: any, assignee: any) {
    try {
      // 通知被分配人
      await this.createNotification(
        assignee.id,
        NotificationType.TICKET_ASSIGNED,
        `工单已分配给您 #${ticket.number}`,
        `工单"${ticket.title}"已分配给您处理`,
        `/tickets/${ticket.id}`,
      );

      // 邮件通知（如果启用）
      const setting = await this.getOrCreateNotificationSetting(assignee.id);
      if (setting.emailEnabled && setting.emailTicketAssigned) {
        await this.emailService.sendTicketAssignedEmail(
          assignee.email,
          ticket.number,
          ticket.title,
          assignee.realName,
        );
      }

      this.logger.log(`工单分配通知已发送: #${ticket.number} to ${assignee.id}`);
    } catch (error) {
      this.logger.error(`发送工单分配通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 工单状态变更通知
   */
  async notifyTicketStatusChanged(ticket: any, oldStatus: string, newStatus: string) {
    try {
      const statusMap = {
        OPEN: '待处理',
        IN_PROGRESS: '处理中',
        PENDING: '待反馈',
        RESOLVED: '已解决',
        CLOSED: '已关闭',
        CANCELLED: '已取消',
      };

      const notifyUserIds: bigint[] = [];

      // 通知创建人
      const creatorId = ticket.creatorSnapshot.id;
      notifyUserIds.push(BigInt(creatorId));

      // 通知处理人
      if (ticket.assigneeId) {
        notifyUserIds.push(ticket.assigneeId);
      }

      // 去重
      const uniqueUserIds = Array.from(new Set(notifyUserIds));

      for (const userId of uniqueUserIds) {
        await this.createNotification(
          userId,
          NotificationType.TICKET_STATUS_CHANGED,
          `工单状态变更 #${ticket.number}`,
          `工单"${ticket.title}"的状态从"${statusMap[oldStatus]}"变更为"${statusMap[newStatus]}"`,
          `/tickets/${ticket.id}`,
        );

        // 邮件通知（如果启用）
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user) {
          const setting = await this.getOrCreateNotificationSetting(userId);
          if (setting.emailEnabled && setting.emailTicketStatusChanged) {
            await this.emailService.sendTicketStatusChangedEmail(
              user.email,
              ticket.number,
              ticket.title,
              statusMap[oldStatus],
              statusMap[newStatus],
            );
          }
        }
      }

      this.logger.log(`工单状态变更通知已发送: #${ticket.number}`);
    } catch (error) {
      this.logger.error(`发送工单状态变更通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 工单评论通知
   */
  async notifyTicketCommented(ticket: any, comment: any) {
    try {
      const notifyUserIds: bigint[] = [];

      // 通知创建人
      const creatorId = ticket.creatorSnapshot.id;
      notifyUserIds.push(BigInt(creatorId));

      // 通知处理人
      if (ticket.assigneeId) {
        notifyUserIds.push(ticket.assigneeId);
      }

      // 排除评论人自己
      const commenterId = comment.creatorSnapshot.id;
      const uniqueUserIds = Array.from(new Set(notifyUserIds)).filter(
        (id) => Number(id) !== commenterId,
      );

      for (const userId of uniqueUserIds) {
        await this.createNotification(
          userId,
          NotificationType.TICKET_COMMENTED,
          `工单新评论 #${ticket.number}`,
          `${comment.creatorSnapshot.realName} 在工单"${ticket.title}"中发表了评论`,
          `/tickets/${ticket.id}`,
        );

        // 邮件通知（如果启用）
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        });

        if (user) {
          const setting = await this.getOrCreateNotificationSetting(userId);
          if (setting.emailEnabled && setting.emailTicketCommented) {
            await this.emailService.sendTicketCommentedEmail(
              user.email,
              ticket.number,
              ticket.title,
              comment.creatorSnapshot.realName,
              comment.content,
            );
          }
        }
      }

      this.logger.log(`工单评论通知已发送: #${ticket.number}`);
    } catch (error) {
      this.logger.error(`发送工单评论通知失败: ${error.message}`, error.stack);
    }
  }

  /**
   * @提及通知
   */
  async notifyMention(ticket: any, comment: any, mentionedUserIds: number[]) {
    try {
      for (const userId of mentionedUserIds) {
        await this.createNotification(
          BigInt(userId),
          NotificationType.MENTION,
          `有人@了您 #${ticket.number}`,
          `${comment.creatorSnapshot.realName} 在工单"${ticket.title}"的评论中@了您`,
          `/tickets/${ticket.id}`,
        );
      }

      this.logger.log(`@提及通知已发送: #${ticket.number}`);
    } catch (error) {
      this.logger.error(`发送@提及通知失败: ${error.message}`, error.stack);
    }
  }
}
