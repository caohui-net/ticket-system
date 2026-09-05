// 工单状态
export enum TicketStatus {
  PENDING_ASSIGN = 'pending_assign',
  PROCESSING = 'processing',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// 优先级
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// 工单接口
export interface Ticket {
  id: string;
  ticketNo: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  creatorId: string;
  assigneeId?: string;
  reviewerId?: string;
  result?: string;
  reviewComment?: string;
  expectedFinishTime?: string;
  assignedAt?: string;
  processedAt?: string;
  reviewedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 工单筛选条件
export interface TicketFilter {
  status?: TicketStatus[];
  priority?: Priority[];
  keyword?: string;
  startDate?: string;
  endDate?: string;
}
