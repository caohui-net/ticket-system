/**
 * 工单相关类型定义
 */

// 工单状态枚举
export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// 工单优先级枚举
export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

// 工单类型枚举
export enum TicketType {
  ISSUE = 'ISSUE',
  REQUEST = 'REQUEST',
  CONSULTATION = 'CONSULTATION',
  COMPLAINT = 'COMPLAINT',
  OTHER = 'OTHER',
}

// 创建者快照
export interface CreatorSnapshot {
  id: number;
  username: string;
  realName: string;
  email: string;
  department?: string;
  avatarUrl?: string;
}

// 工单基础信息
export interface Ticket {
  id: number;
  number: number;
  title: string;
  description: string;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  creatorSnapshot: CreatorSnapshot;
  assigneeId: number | null;
  assignedAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  tags: string[];
  locked: boolean;
  hidden: boolean;
  assignee?: {
    id: number;
    username: string;
    realName: string;
    email: string;
  } | null;
}

// 工单详情（包含日志和附件）
export interface TicketDetail extends Ticket {
  logs: TicketLog[];
  attachments: TicketAttachment[];
}

// 工单日志（评论）
export interface TicketLog {
  id: number;
  ticketId: number;
  content: string;
  isPublic: boolean;
  isSystem: boolean;
  edited: boolean;
  editedAt: string | null;
  previousContent: string | null;
  creatorSnapshot: CreatorSnapshot;
  createdAt: string;
}

// 工单附件
export interface TicketAttachment {
  id: number;
  ticketId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploaderSnapshot: CreatorSnapshot;
  uploadedAt: string;
}

// 创建工单DTO
export interface CreateTicketDto {
  title: string;
  description: string;
  type: TicketType;
  priority?: TicketPriority;
  tags?: string[];
}

// 更新工单DTO
export interface UpdateTicketDto {
  title?: string;
  description?: string;
  type?: TicketType;
  priority?: TicketPriority;
  tags?: string[];
}

// 查询工单参数
export interface QueryTicketsDto {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  assigneeId?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

// Alias for backward compatibility
export type TicketListParams = QueryTicketsDto;

// 工单统计
export interface TicketStatistics {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  resolved: number;
  closed: number;
  cancelled: number;
}

// 状态流转映射
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.PENDING, TicketStatus.RESOLVED, TicketStatus.CANCELLED],
  [TicketStatus.PENDING]: [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
  [TicketStatus.CANCELLED]: [],
};

// 状态标签映射
export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: '待处理',
  [TicketStatus.IN_PROGRESS]: '处理中',
  [TicketStatus.PENDING]: '待反馈',
  [TicketStatus.RESOLVED]: '已解决',
  [TicketStatus.CLOSED]: '已关闭',
  [TicketStatus.CANCELLED]: '已取消',
};

// 优先级标签映射
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: '低',
  [TicketPriority.MEDIUM]: '中',
  [TicketPriority.HIGH]: '高',
  [TicketPriority.URGENT]: '紧急',
};

// 类型标签映射
export const TYPE_LABELS: Record<TicketType, string> = {
  [TicketType.ISSUE]: '故障报修',
  [TicketType.REQUEST]: '需求申请',
  [TicketType.CONSULTATION]: '咨询求助',
  [TicketType.COMPLAINT]: '投诉建议',
  [TicketType.OTHER]: '其他',
};
