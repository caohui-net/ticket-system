import { Tag } from 'antd';
import { TicketPriority, PRIORITY_LABELS } from '@/types/ticket';

interface PriorityTagProps {
  priority: TicketPriority;
}

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'default',
  [TicketPriority.MEDIUM]: 'blue',
  [TicketPriority.HIGH]: 'orange',
  [TicketPriority.URGENT]: 'red',
};

export default function PriorityTag({ priority }: PriorityTagProps) {
  return (
    <Tag color={PRIORITY_COLORS[priority]}>
      {PRIORITY_LABELS[priority]}
    </Tag>
  );
}
