import axios from 'axios';
import type {
  ApiResponse,
  PaginationResponse,
  Ticket,
  TicketDetail,
  TicketStatus,
  TicketPriority
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (data: { username: string; password: string }) => apiClient.post('/auth/login', data),
  register: (data: { username: string; password: string; realName: string; email: string; phone?: string; department?: string }) => apiClient.post('/auth/register', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
};

export const userApi = {
  updateProfile: (data: { realName: string; email: string; phone?: string; department?: string }) =>
    apiClient.patch('/users/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient.post('/users/change-password', data),
};

export const ticketApi = {
  getTickets: (params?: {
    page?: number;
    pageSize?: number;
    status?: TicketStatus;
    priority?: TicketPriority;
    keyword?: string;
  }) => apiClient.get<ApiResponse<PaginationResponse<Ticket>>>('/tickets', { params }),

  getTicket: (id: number) => apiClient.get<ApiResponse<TicketDetail>>(`/tickets/${id}`),

  createTicket: (data: {
    title: string;
    description: string;
    type: string;
    priority?: string;
    tags?: string[];
  }) => apiClient.post<ApiResponse<Ticket>>('/tickets', data),

  updateTicket: (id: number, data: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    status?: TicketStatus;
    tags?: string[];
  }) => apiClient.patch<ApiResponse<Ticket>>(`/tickets/${id}`, data),

  deleteTicket: (id: number) => apiClient.delete(`/tickets/${id}`),

  addComment: (ticketId: number, data: { content: string }) =>
    apiClient.post(`/tickets/${ticketId}/comments`, data),
};
