import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketApi } from '../../services/api';
import TicketCard from '../../components/TicketCard';
import { Ticket, TicketStatus, TicketPriority } from '../../types';

export const TicketList: React.FC = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    keyword: '',
  });

  useEffect(() => {
    fetchTickets();
  }, [page, filters]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        pageSize: 20,
      };

      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.keyword) params.keyword = filters.keyword;

      const response = await ticketApi.getTickets(params);
      const data = response.data.data;
      setTickets(data?.items || []);
      setTotal(data?.pagination.total || 0);
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleCreateTicket = () => {
    navigate('/tickets/create');
  };

  const handleTicketClick = (ticketId: number) => {
    navigate(`/tickets/${ticketId}`);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7F4EF',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <div>
            <h1 style={{
              fontFamily: '"Fraunces", serif',
              fontSize: '2.5rem',
              fontWeight: 400,
              color: '#1F2421',
              margin: '0 0 0.5rem 0',
              letterSpacing: '-0.02em'
            }}>
              工单<span style={{ fontStyle: 'italic', color: '#C4612F' }}>列表</span>
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 300,
              color: '#5C635D',
              margin: 0
            }}>
              共 {total} 个工单
            </p>
          </div>

          <button
            onClick={handleCreateTicket}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#C4612F',
              border: 'none',
              borderRadius: '999px',
              padding: '0.75rem 1.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#A94E22';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#C4612F';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            + 创建工单
          </button>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #E7E1D7',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {/* Keyword Search */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1F2421',
                marginBottom: '0.5rem'
              }}>
                关键词搜索
              </label>
              <input
                type="text"
                placeholder="搜索标题或描述..."
                value={filters.keyword}
                onChange={(e) => handleFilterChange('keyword', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9375rem',
                  fontWeight: 300,
                  color: '#1F2421',
                  backgroundColor: '#FBF9F5',
                  border: '1px solid #E7E1D7',
                  borderRadius: '8px',
                  padding: '0.625rem 0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#C4612F'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#E7E1D7'}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1F2421',
                marginBottom: '0.5rem'
              }}>
                状态
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9375rem',
                  fontWeight: 300,
                  color: '#1F2421',
                  backgroundColor: '#FBF9F5',
                  border: '1px solid #E7E1D7',
                  borderRadius: '8px',
                  padding: '0.625rem 0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">全部状态</option>
                <option value={TicketStatus.OPEN}>待处理</option>
                <option value={TicketStatus.IN_PROGRESS}>处理中</option>
                <option value={TicketStatus.PENDING}>待反馈</option>
                <option value={TicketStatus.RESOLVED}>已解决</option>
                <option value={TicketStatus.CLOSED}>已关闭</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label style={{
                display: 'block',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#1F2421',
                marginBottom: '0.5rem'
              }}>
                优先级
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9375rem',
                  fontWeight: 300,
                  color: '#1F2421',
                  backgroundColor: '#FBF9F5',
                  border: '1px solid #E7E1D7',
                  borderRadius: '8px',
                  padding: '0.625rem 0.875rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">全部优先级</option>
                <option value={TicketPriority.LOW}>低</option>
                <option value={TicketPriority.MEDIUM}>中</option>
                <option value={TicketPriority.HIGH}>高</option>
                <option value={TicketPriority.URGENT}>紧急</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9375rem',
            color: '#5C635D'
          }}>
            加载中...
          </div>
        ) : tickets.length === 0 ? (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            border: '1px solid #E7E1D7'
          }}>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9375rem',
              color: '#5C635D',
              margin: 0
            }}>
              暂无工单
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            {tickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(Number(ticket.id))}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '2rem'
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 400,
                color: page === 1 ? '#5C635D' : '#1F2421',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E7E1D7',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1
              }}
            >
              上一页
            </button>

            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              color: '#5C635D',
              padding: '0 1rem'
            }}>
              第 {page} / {Math.ceil(total / 20)} 页
            </span>

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / 20)}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: 400,
                color: page >= Math.ceil(total / 20) ? '#5C635D' : '#1F2421',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E7E1D7',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer',
                opacity: page >= Math.ceil(total / 20) ? 0.5 : 1
              }}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
