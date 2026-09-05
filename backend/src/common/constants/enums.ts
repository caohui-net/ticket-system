// 工单状态枚举
export enum TicketStatus {
  PENDING_ASSIGN = 'pending_assign',
  PROCESSING = 'processing',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

// 工单状态显示文本
export const TICKET_STATUS_TEXT: Record<TicketStatus, string> = {
  [TicketStatus.PENDING_ASSIGN]: '待分配',
  [TicketStatus.PROCESSING]: '处理中',
  [TicketStatus.PENDING_REVIEW]: '待审核',
  [TicketStatus.REJECTED]: '已驳回',
  [TicketStatus.COMPLETED]: '已完成',
  [TicketStatus.CLOSED]: '已关闭',
  [TicketStatus.CANCELLED]: '已取消',
};

// 优先级枚举
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// 优先级显示文本
export const PRIORITY_TEXT: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高',
  [Priority.URGENT]: '紧急',
};

// 用户角色枚举
export enum UserRole {
  ADMIN = 'admin',
  REVIEWER = 'reviewer',
  HANDLER = 'handler',
  CREATOR = 'creator',
}

// 角色显示文本
export const ROLE_TEXT: Record<UserRole, string> = {
  [UserRole.ADMIN]: '管理员',
  [UserRole.REVIEWER]: '审核人',
  [UserRole.HANDLER]: '处理人',
  [UserRole.CREATOR]: '创建者',
};
