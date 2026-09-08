import request from './request';
import type { ApiResponse, PaginationResponse } from '@/types/api';
import type {
  Ticket,
  TicketDetail,
  CreateTicketDto,
  UpdateTicketDto,
  QueryTicketsDto,
  TicketLog,
  TicketAttachment,
  TicketStatus,
} from '@/types/ticket';

/**
 * 工单API
 */
export const ticketApi = {
  /**
   * 创建工单
   */
  create: (data: CreateTicketDto) => {
    return request.post<ApiResponse<Ticket>>('/api/v1/tickets', data);
  },

  /**
   * 查询工单列表
   */
  list: (params?: QueryTicketsDto) => {
    return request.get<ApiResponse<PaginationResponse<Ticket>>>('/api/v1/tickets', { params });
  },

  /**
   * 获取工单详情
   */
  getDetail: (id: number) => {
    return request.get<ApiResponse<TicketDetail>>(`/api/v1/tickets/${id}`);
  },

  /**
   * 更新工单
   */
  update: (id: number, data: UpdateTicketDto) => {
    return request.patch<ApiResponse<Ticket>>(`/api/v1/tickets/${id}`, data);
  },

  /**
   * 删除工单（软删除）
   */
  delete: (id: number) => {
    return request.delete<ApiResponse<void>>(`/api/v1/tickets/${id}`);
  },

  /**
   * 分配工单
   */
  assign: (id: number, assigneeId: number) => {
    return request.post<ApiResponse<Ticket>>(`/api/v1/tickets/${id}/assign`, { assigneeId });
  },

  /**
   * 变更工单状态
   */
  changeStatus: (id: number, status: TicketStatus) => {
    return request.patch<ApiResponse<Ticket>>(`/api/v1/tickets/${id}/status`, { status });
  },

  /**
   * 添加评论
   */
  addComment: (ticketId: number, content: string, isPublic = true) => {
    return request.post<ApiResponse<TicketLog>>(`/api/v1/tickets/${ticketId}/logs`, {
      content,
      isPublic,
    });
  },

  /**
   * 编辑评论
   */
  editComment: (ticketId: number, logId: number, content: string) => {
    return request.patch<ApiResponse<TicketLog>>(`/api/v1/tickets/${ticketId}/logs/${logId}`, {
      content,
    });
  },

  /**
   * 删除评论
   */
  deleteComment: (ticketId: number, logId: number) => {
    return request.delete<ApiResponse<void>>(`/api/v1/tickets/${ticketId}/logs/${logId}`);
  },

  /**
   * 上传附件
   */
  uploadAttachment: (ticketId: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request.post<ApiResponse<TicketAttachment>>(
      `/api/v1/tickets/${ticketId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  },

  /**
   * 下载附件
   */
  downloadAttachment: (ticketId: number, attachmentId: number) => {
    return request.get(`/api/v1/tickets/${ticketId}/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
  },

  /**
   * 删除附件
   */
  deleteAttachment: (ticketId: number, attachmentId: number) => {
    return request.delete<ApiResponse<void>>(
      `/api/v1/tickets/${ticketId}/attachments/${attachmentId}`
    );
  },
};
