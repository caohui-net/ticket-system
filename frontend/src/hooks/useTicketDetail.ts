import { useQuery } from '@tanstack/react-query';
import { ticketApi } from '@/api';

export const useTicketDetail = (id: number) => {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const response = await ticketApi.getDetail(id);
      return response.data.data;
    },
    enabled: !!id,
  });
};
