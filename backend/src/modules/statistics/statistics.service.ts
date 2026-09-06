import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OverviewStatistics,
  StatusStatistics,
  PriorityStatistics,
  TrendData,
  ResponseTimeStatistics,
  ResponseTimeByPriority,
  UserWorkloadStatistics,
  ActiveUserStatistics,
  TimeRange,
} from './interfaces/statistics.interface';
import { TicketPriority, TicketStatus } from '@prisma/client';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取概览统计数据
   */
  async getOverview(): Promise<OverviewStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 并行查询多个统计
    const [
      totalTickets,
      statusCounts,
      todayNew,
      weekNew,
      monthNew,
      avgTimes,
    ] = await Promise.all([
      // 总工单数
      this.prisma.ticket.count(),

      // 各状态工单数
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
      }),

      // 今日新增
      this.prisma.ticket.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // 本周新增
      this.prisma.ticket.count({
        where: { createdAt: { gte: weekStart } },
      }),

      // 本月新增
      this.prisma.ticket.count({
        where: { createdAt: { gte: monthStart } },
      }),

      // 平均响应和解决时间
      this.calculateAverageTimes(),
    ]);

    // 转换状态统计为对象
    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTickets,
      pendingAssignTickets: statusMap[TicketStatus.OPEN] || 0,
      processingTickets: statusMap[TicketStatus.IN_PROGRESS] || 0,
      pendingReviewTickets: statusMap[TicketStatus.PENDING] || 0,
      rejectedTickets: 0, // 当前schema没有REJECTED状态
      completedTickets: statusMap[TicketStatus.RESOLVED] || 0,
      closedTickets: statusMap[TicketStatus.CLOSED] || 0,
      cancelledTickets: statusMap[TicketStatus.CANCELLED] || 0,
      todayNew,
      weekNew,
      monthNew,
      avgResponseTime: avgTimes.avgResponseTime,
      avgResolutionTime: avgTimes.avgResolutionTime,
    };
  }

  /**
   * 按状态统计
   */
  async getTicketsByStatus(): Promise<StatusStatistics[]> {
    const total = await this.prisma.ticket.count();
    const statusCounts = await this.prisma.ticket.groupBy({
      by: ['status'],
      _count: true,
    });

    return statusCounts.map((item) => ({
      status: item.status,
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 10000) / 100 : 0,
    }));
  }

  /**
   * 按优先级统计
   */
  async getTicketsByPriority(): Promise<PriorityStatistics[]> {
    const total = await this.prisma.ticket.count();
    const priorityCounts = await this.prisma.ticket.groupBy({
      by: ['priority'],
      _count: true,
    });

    return priorityCounts.map((item) => ({
      priority: item.priority,
      count: item._count,
      percentage: total > 0 ? Math.round((item._count / total) * 10000) / 100 : 0,
    }));
  }

  /**
   * 工单趋势统计
   */
  async getTicketsTrend(days: number = 7): Promise<TrendData> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const labels: string[] = [];
    const newTicketsData: number[] = [];
    const completedTicketsData: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      labels.push(date.toISOString().split('T')[0]);

      // 并行查询新增和完成的工单
      const [newCount, completedCount] = await Promise.all([
        this.prisma.ticket.count({
          where: {
            createdAt: {
              gte: date,
              lt: nextDate,
            },
          },
        }),
        this.prisma.ticket.count({
          where: {
            status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
            OR: [
              { resolvedAt: { gte: date, lt: nextDate } },
              { closedAt: { gte: date, lt: nextDate } },
            ],
          },
        }),
      ]);

      newTicketsData.push(newCount);
      completedTicketsData.push(completedCount);
    }

    return {
      labels,
      datasets: [
        {
          label: '新增工单',
          data: newTicketsData,
        },
        {
          label: '完成工单',
          data: completedTicketsData,
        },
      ],
    };
  }

  /**
   * 响应时间统计
   */
  async getResponseTimeStatistics(): Promise<ResponseTimeStatistics> {
    const avgTimes = await this.calculateAverageTimes();

    // 按优先级统计响应时间
    const byPriority: ResponseTimeByPriority[] = [];
    for (const priority of Object.values(TicketPriority)) {
      const times = await this.calculateAverageTimes({ priority });
      byPriority.push({
        priority,
        avgResponseTime: times.avgResponseTime,
        avgResolutionTime: times.avgResolutionTime,
      });
    }

    return {
      avgFirstResponseTime: avgTimes.avgResponseTime,
      avgResolutionTime: avgTimes.avgResolutionTime,
      byPriority,
    };
  }

  /**
   * 用户工作量统计
   * 注意：当前schema没有createdTickets关联，所以创建数统计需要单独查询
   */
  async getUserWorkload(): Promise<UserWorkloadStatistics[]> {
    const users = await this.prisma.user.findMany({
      where: {
        status: 1, // 1 = ACTIVE
      },
      select: {
        id: true,
        username: true,
        realName: true,
        assignedTickets: {
          select: {
            id: true,
            status: true,
            assignedAt: true,
            resolvedAt: true,
          },
        },
      },
    });

    // 获取每个用户创建的工单数（因为没有关联，需要单独查询）
    const userWorkloads = await Promise.all(
      users.map(async (user) => {
        // 通过creatorSnapshot中的userId查询创建数
        // 注意：creatorSnapshot中的userId是字符串格式
        const createdCount = await this.prisma.ticket.count({
          where: {
            creatorSnapshot: {
              path: ['userId'],
              equals: user.id.toString(),
            },
          },
        });

        const completedTickets = user.assignedTickets.filter(
          (t) => t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED,
        );

        // 计算平均响应时间（从分配到解决）
        const responseTimes = user.assignedTickets
          .filter((t) => t.assignedAt && t.resolvedAt)
          .map((t) => {
            const assigned = new Date(t.assignedAt!);
            const resolved = new Date(t.resolvedAt!);
            return (resolved.getTime() - assigned.getTime()) / (1000 * 60 * 60); // 小时
          });

        const avgResponseTime =
          responseTimes.length > 0
            ? this.formatDuration(
                responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
              )
            : '暂无数据';

        return {
          userId: user.id.toString(),
          username: user.username,
          realName: user.realName,
          createdCount,
          assignedCount: user.assignedTickets.length,
          completedCount: completedTickets.length,
          avgResponseTime,
        };
      }),
    );

    return userWorkloads;
  }

  /**
   * 活跃用户统计
   */
  async getActiveUsers(): Promise<ActiveUserStatistics> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUserIds, topCreatorData, topHandlerData] = await Promise.all([
      this.prisma.user.count({ where: { status: 1 } }),

      // 活跃用户ID（30天内有分配的工单）
      this.prisma.ticket.findMany({
        where: {
          assigneeId: { not: null },
          updatedAt: { gte: thirtyDaysAgo },
        },
        select: { assigneeId: true },
        distinct: ['assigneeId'],
      }),

      // Top创建者（通过creatorSnapshot查询）
      this.prisma.$queryRaw<Array<{ user_id: bigint; count: bigint }>>`
        SELECT
          (creator_snapshot->>'userId')::bigint as user_id,
          COUNT(*) as count
        FROM tickets
        WHERE creator_snapshot->>'userId' IS NOT NULL
        GROUP BY creator_snapshot->>'userId'
        ORDER BY count DESC
        LIMIT 5
      `,

      // Top处理者
      this.prisma.ticket.groupBy({
        by: ['assigneeId'],
        where: {
          assigneeId: { not: null },
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        _count: true,
        orderBy: {
          _count: {
            assigneeId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // 获取Top创建者详细信息
    const topCreatorIds = topCreatorData.map((item) => item.user_id);
    const topCreators = await this.prisma.user.findMany({
      where: { id: { in: topCreatorIds } },
      select: { id: true, username: true, realName: true },
    });

    const topCreatorsWithCount = topCreators.map((user) => {
      const data = topCreatorData.find((item) => item.user_id === user.id);
      return {
        userId: user.id.toString(),
        username: user.username,
        realName: user.realName,
        count: Number(data?.count || 0),
      };
    });

    // 获取Top处理者详细信息
    const topHandlerIds = topHandlerData
      .map((item) => item.assigneeId)
      .filter((id): id is bigint => id !== null);
    const topHandlers = await this.prisma.user.findMany({
      where: { id: { in: topHandlerIds } },
      select: { id: true, username: true, realName: true },
    });

    const topHandlersWithCount = topHandlers.map((user) => {
      const data = topHandlerData.find((item) => item.assigneeId === user.id);
      return {
        userId: user.id.toString(),
        username: user.username,
        realName: user.realName,
        count: data?._count || 0,
      };
    });

    return {
      totalUsers,
      activeUsers: new Set(activeUserIds.map((item) => item.assigneeId)).size,
      topCreators: topCreatorsWithCount,
      topHandlers: topHandlersWithCount,
    };
  }

  /**
   * 计算平均响应和解决时间
   * 注意：使用assignedAt到resolvedAt作为响应时间
   */
  private async calculateAverageTimes(filter?: {
    priority?: TicketPriority;
  }): Promise<{
    avgResponseTime: string;
    avgResolutionTime: string;
  }> {
    const tickets = await this.prisma.ticket.findMany({
      where: {
        ...(filter?.priority && { priority: filter.priority }),
        assignedAt: { not: null },
        resolvedAt: { not: null },
      },
      select: {
        assignedAt: true,
        resolvedAt: true,
        closedAt: true,
        createdAt: true,
      },
    });

    if (tickets.length === 0) {
      return {
        avgResponseTime: '暂无数据',
        avgResolutionTime: '暂无数据',
      };
    }

    // 计算平均响应时间（从分配到解决）
    const responseTimes = tickets.map((t) => {
      const assigned = new Date(t.assignedAt!);
      const resolved = new Date(t.resolvedAt!);
      return (resolved.getTime() - assigned.getTime()) / (1000 * 60 * 60); // 小时
    });

    // 计算平均解决时间（从创建到关闭）
    const resolutionTimes = tickets
      .filter((t) => t.closedAt)
      .map((t) => {
        const created = new Date(t.createdAt);
        const closed = new Date(t.closedAt!);
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60); // 小时
      });

    const avgResponse =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const avgResolution =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    return {
      avgResponseTime: this.formatDuration(avgResponse),
      avgResolutionTime:
        avgResolution > 0 ? this.formatDuration(avgResolution) : '暂无数据',
    };
  }

  /**
   * 格式化时长
   */
  private formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}分钟`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10}小时`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round((hours % 24) * 10) / 10;
      return remainingHours > 0 ? `${days}天${remainingHours}小时` : `${days}天`;
    }
  }
}
