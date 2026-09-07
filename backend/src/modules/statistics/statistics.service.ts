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

  /**
   * 获取时间范围
   */
  private getTimeRange(timeRange?: TimeRange): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'today':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        break;
      case 'week':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'quarter':
        const currentMonth = endDate.getMonth();
        const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
        startDate = new Date(endDate.getFullYear(), quarterStartMonth, 1);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      default:
        // 默认最近30天
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  /**
   * 获取审批效率统计
   */
  async getApprovalEfficiency(timeRange?: TimeRange) {
    const { startDate, endDate } = this.getTimeRange(timeRange);

    // 查询已完成的审批流程
    const completedFlows = await this.prisma.approvalFlow.findMany({
      where: {
        status: 'APPROVED',
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        steps: {
          orderBy: { stepNumber: 'asc' },
        },
      },
    });

    if (completedFlows.length === 0) {
      return {
        totalFlows: 0,
        avgDuration: 0,
        avgDurationFormatted: '0小时',
        approvalRate: 0,
        byType: {},
      };
    }

    // 计算每个流程的耗时
    const durations = completedFlows.map((flow) => {
      const firstStep = flow.steps[0];
      const lastStep = flow.steps[flow.steps.length - 1];

      if (!firstStep?.createdAt || !lastStep?.approvedAt) {
        return 0;
      }

      const duration =
        (new Date(lastStep.approvedAt).getTime() -
          new Date(firstStep.createdAt).getTime()) /
        (1000 * 60 * 60); // 转换为小时
      return duration;
    });

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

    // 按类型统计
    const byType = {};
    const typeGroups = {};

    completedFlows.forEach((flow) => {
      if (!typeGroups[flow.type]) {
        typeGroups[flow.type] = [];
      }

      const firstStep = flow.steps[0];
      const lastStep = flow.steps[flow.steps.length - 1];

      if (firstStep?.createdAt && lastStep?.approvedAt) {
        const duration =
          (new Date(lastStep.approvedAt).getTime() -
            new Date(firstStep.createdAt).getTime()) /
          (1000 * 60 * 60);
        typeGroups[flow.type].push(duration);
      }
    });

    Object.keys(typeGroups).forEach((type) => {
      const typeDurations = typeGroups[type];
      byType[type] = {
        count: typeDurations.length,
        avgDuration:
          typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length,
        avgDurationFormatted: this.formatDuration(
          typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length,
        ),
      };
    });

    // 计算通过率
    const totalFlows = await this.prisma.approvalFlow.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const approvalRate = totalFlows > 0 ? (completedFlows.length / totalFlows) * 100 : 0;

    return {
      totalFlows: completedFlows.length,
      avgDuration,
      avgDurationFormatted: this.formatDuration(avgDuration),
      approvalRate: Math.round(approvalRate * 10) / 10,
      byType,
    };
  }

  /**
   * 获取各角色审批量统计
   */
  async getApprovalByRole(timeRange?: TimeRange) {
    const { startDate, endDate } = this.getTimeRange(timeRange);

    // 查询所有审批步骤
    const approvalSteps = await this.prisma.approvalStep.findMany({
      where: {
        status: { in: ['APPROVED', 'REJECTED'] },
        approvedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        approver: {
          include: {
            userRoles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    // 按角色分组统计
    const roleStats = {};

    approvalSteps.forEach((step) => {
      if (!step.approver) return;

      step.approver.userRoles.forEach((ur) => {
        const roleCode = ur.role.code;
        const roleName = ur.role.name;

        if (!roleStats[roleCode]) {
          roleStats[roleCode] = {
            roleCode,
            roleName,
            totalApprovals: 0,
            approved: 0,
            rejected: 0,
            approvalRate: 0,
          };
        }

        roleStats[roleCode].totalApprovals++;
        if (step.status === 'APPROVED') {
          roleStats[roleCode].approved++;
        } else if (step.status === 'REJECTED') {
          roleStats[roleCode].rejected++;
        }
      });
    });

    // 计算通过率
    Object.values(roleStats).forEach((stat: any) => {
      stat.approvalRate =
        stat.totalApprovals > 0
          ? Math.round((stat.approved / stat.totalApprovals) * 1000) / 10
          : 0;
    });

    return Object.values(roleStats);
  }

  /**
   * 获取工单各阶段耗时分析
   */
  async getPhaseTimeAnalysis(timeRange?: TimeRange) {
    const { startDate, endDate } = this.getTimeRange(timeRange);

    // 查询已完成的工单
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        updatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        approvalFlow: {
          include: {
            steps: {
              orderBy: { stepNumber: 'asc' },
            },
          },
        },
        budget: true,
        project: true,
      },
    });

    if (tickets.length === 0) {
      return {
        totalTickets: 0,
        avgTotalDuration: 0,
        phases: {},
      };
    }

    // 统计各阶段耗时
    const phaseData = {
      REPAIR: [],
      BUDGET: [],
      PROJECT: [],
      EXECUTION: [],
    };

    tickets.forEach((ticket) => {
      // 计算报修阶段：创建到审批完成
      if (ticket.approvalFlow?.status === 'APPROVED' && ticket.approvalFlow.type === 'REPAIR_REVIEW') {
        const repairStep = ticket.approvalFlow.steps[0];
        if (repairStep?.approvedAt) {
          const duration =
            (new Date(repairStep.approvedAt).getTime() -
              new Date(ticket.createdAt).getTime()) /
            (1000 * 60 * 60);
          phaseData.REPAIR.push(duration);
        }
      }

      // 计算预算阶段
      if (ticket.budget?.reviewedAt && ticket.budget.submittedAt) {
        const duration =
          (new Date(ticket.budget.reviewedAt).getTime() -
            new Date(ticket.budget.submittedAt).getTime()) /
          (1000 * 60 * 60);
        phaseData.BUDGET.push(duration);
      }

      // 计算立项阶段
      if (ticket.project) {
        const projectFlow = ticket.approvalFlow;
        if (projectFlow?.type === 'PROJECT_APPROVAL' && projectFlow.status === 'APPROVED') {
          const lastStep = projectFlow.steps[projectFlow.steps.length - 1];
          if (lastStep?.approvedAt) {
            const duration =
              (new Date(lastStep.approvedAt).getTime() -
                new Date(ticket.project.createdAt).getTime()) /
              (1000 * 60 * 60);
            phaseData.PROJECT.push(duration);
          }
        }
      }
    });

    // 计算各阶段平均耗时
    const phases = {};
    Object.keys(phaseData).forEach((phase) => {
      const durations = phaseData[phase];
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        phases[phase] = {
          count: durations.length,
          avgDuration: avg,
          avgDurationFormatted: this.formatDuration(avg),
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
        };
      }
    });

    return {
      totalTickets: tickets.length,
      phases,
    };
  }

  /**
   * 获取审批趋势数据
   */
  async getApprovalTrend(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const approvalFlows = await this.prisma.approvalFlow.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        type: true,
      },
    });

    // 按日期分组
    const trendData = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      trendData[dateStr] = {
        date: dateStr,
        total: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
      };
    }

    approvalFlows.forEach((flow) => {
      const dateStr = new Date(flow.createdAt).toISOString().split('T')[0];
      if (trendData[dateStr]) {
        trendData[dateStr].total++;
        if (flow.status === 'APPROVED') {
          trendData[dateStr].approved++;
        } else if (flow.status === 'REJECTED') {
          trendData[dateStr].rejected++;
        } else {
          trendData[dateStr].pending++;
        }
      }
    });

    return Object.values(trendData);
  }

  /**
   * 获取部门/类型/优先级统计
   */
  async getTicketAnalysisByDimension(
    dimension: 'department' | 'type' | 'priority',
    timeRange?: TimeRange,
  ) {
    const { startDate, endDate } = this.getTimeRange(timeRange);

    let groupBy: any;
    let labelField: string;

    switch (dimension) {
      case 'department':
        // 按部门统计需要Join用户表
        const ticketsWithCreator = await this.prisma.ticket.findMany({
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            approvalFlow: true,
          },
        });

        const deptStats = {};
        ticketsWithCreator.forEach((ticket) => {
          const creator = ticket.creatorSnapshot as any;
          const dept = creator?.department || '未知部门';

          if (!deptStats[dept]) {
            deptStats[dept] = {
              label: dept,
              total: 0,
              approved: 0,
              rejected: 0,
              pending: 0,
            };
          }

          deptStats[dept].total++;
          if (ticket.approvalFlow) {
            if (ticket.approvalFlow.status === 'APPROVED') {
              deptStats[dept].approved++;
            } else if (ticket.approvalFlow.status === 'REJECTED') {
              deptStats[dept].rejected++;
            } else {
              deptStats[dept].pending++;
            }
          }
        });

        return Object.values(deptStats);

      case 'type':
        groupBy = ['type'];
        labelField = 'type';
        break;

      case 'priority':
        groupBy = ['priority'];
        labelField = 'priority';
        break;
    }

    const grouped = await this.prisma.ticket.groupBy({
      by: groupBy,
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return grouped.map((item) => ({
      label: item[labelField],
      total: item._count,
    }));
  }
}
