import { Card, Space, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { Ticket } from '@/types/ticket';
import StatusBadge from '@/components/StatusBadge';
import PriorityTag from '@/components/PriorityTag';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

export default function TicketCard({ ticket, onClick }: TicketCardProps) {
  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      styles={{
        body: { padding: '16px 20px' }
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text strong style={{ fontSize: 16, color: '#C4612F' }}>
              #{ticket.number}
            </Text>
            <StatusBadge status={ticket.status} />
            <PriorityTag priority={ticket.priority} />
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <ClockCircleOutlined /> {dayjs(ticket.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
        </Space>

        <Title level={5} style={{ margin: 0 }} ellipsis={{ rows: 1 }}>
          {ticket.title}
        </Title>

        <Space size="large" style={{ width: '100%' }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            创建人: {ticket.creatorSnapshot.realName}
          </Text>
          {ticket.assignee && (
            <Text type="secondary" style={{ fontSize: 13 }}>
              处理人: {ticket.assignee.realName}
            </Text>
          )}
        </Space>
      </Space>
    </Card>
  );
}
