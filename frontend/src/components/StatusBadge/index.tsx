import { Tag } from 'antd';
import { TicketStatus, STATUS_LABELS } from '@/types/ticket';

interface StatusBadgeProps {
  status: TicketStatus;
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'blue',
  [TicketStatus.IN_PROGRESS]: 'orange',
  [TicketStatus.PENDING]: 'purple',
  [TicketStatus.RESOLVED]: 'green',
  [TicketStatus.CLOSED]: 'default',
  [TicketStatus.CANCELLED]: 'red',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Tag color={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Tag>
  );
}
