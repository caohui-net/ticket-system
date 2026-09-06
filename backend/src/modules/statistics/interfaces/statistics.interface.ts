/**
 * 统计接口定义
 */

// 概览统计数据
export interface OverviewStatistics {
  totalTickets: number;
  pendingAssignTickets: number;
  processingTickets: number;
  pendingReviewTickets: number;
  rejectedTickets: number;
  completedTickets: number;
  closedTickets: number;
  cancelledTickets: number;
  todayNew: number;
  weekNew: number;
  monthNew: number;
  avgResponseTime: string;
  avgResolutionTime: string;
}

// 按状态统计
export interface StatusStatistics {
  status: string;
  count: number;
  percentage: number;
}

// 按优先级统计
export interface PriorityStatistics {
  priority: string;
  count: number;
  percentage: number;
}

// 趋势数据
export interface TrendData {
  labels: string[];
  datasets: TrendDataset[];
}

export interface TrendDataset {
  label: string;
  data: number[];
}

// 响应时间统计
export interface ResponseTimeStatistics {
  avgFirstResponseTime: string;
  avgResolutionTime: string;
  byPriority: ResponseTimeByPriority[];
}

export interface ResponseTimeByPriority {
  priority: string;
  avgResponseTime: string;
  avgResolutionTime: string;
}

// 用户工作量统计
export interface UserWorkloadStatistics {
  userId: string;
  username: string;
  realName: string;
  createdCount: number;
  assignedCount: number;
  completedCount: number;
  avgResponseTime: string;
}

// 活跃用户统计
export interface ActiveUserStatistics {
  totalUsers: number;
  activeUsers: number;
  topCreators: TopUser[];
  topHandlers: TopUser[];
}

export interface TopUser {
  userId: string;
  username: string;
  realName: string;
  count: number;
}

// 时间范围类型
export type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
