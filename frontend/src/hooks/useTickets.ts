import { useQuery } from '@tanstack/react-query';
import { ticketApi } from '@/api';
import type { TicketListParams } from '@/types/ticket';

export const useTickets = (params: TicketListParams = {}) => {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: async () => {
      const response = await ticketApi.list(params);
      return response.data;
    },
  });
};
