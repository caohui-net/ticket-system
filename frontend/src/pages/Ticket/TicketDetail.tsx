import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import PriorityTag from '../../components/PriorityTag';
import { TicketDetail as TicketDetailType, TicketLog } from '../../types';

export const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetailType | null>(null);
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchTicketDetail();
    }
  }, [id]);

  const fetchTicketDetail = async () => {
    try {
      setLoading(true);
      const response = await ticketApi.getTicket(Number(id));
      const ticketData = response.data.data;
      if (ticketData) {
        setTicket(ticketData);
        setLogs(ticketData.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !id) return;

    try {
      setSubmitting(true);
      await ticketApi.addComment(Number(id), { content: comment });
      setComment('');
      fetchTicketDetail();
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/tickets/${id}/edit`);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F7F4EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.9375rem',
          color: '#5C635D'
        }}>
          加载中...
        </p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#F7F4EF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.9375rem',
          color: '#5C635D'
        }}>
          工单不存在
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F7F4EF',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/tickets')}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: '#5C635D',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            ← 返回列表
          </button>

          <div style={{ flex: 1 }}>
            <div style={{
              display: 'inline-block',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#C4612F',
              backgroundColor: '#F2E3D6',
              borderRadius: '999px',
              padding: '0.25rem 0.75rem',
              marginBottom: '0.5rem'
            }}>
              工单 #{ticket.number}
            </div>
            <h1 style={{
              fontFamily: '"Fraunces", serif',
              fontSize: '2rem',
              fontWeight: 400,
              color: '#1F2421',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              {ticket.title}
            </h1>
          </div>

          <button
            onClick={handleEdit}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#1F2421',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E7E1D7',
              borderRadius: '8px',
              padding: '0.625rem 1.25rem',
              cursor: 'pointer'
            }}
          >
            编辑
          </button>
        </div>

        {/* Ticket Info Card */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '2rem',
          marginBottom: '1.5rem',
          border: '1px solid #E7E1D7',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Meta Info */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid #E7E1D7'
          }}>
            <StatusBadge status={ticket.status} />
            <PriorityTag priority={ticket.priority} />

            {ticket.tags && ticket.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {ticket.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: '#5C635D',
                      backgroundColor: '#FBF9F5',
                      border: '1px solid #E7E1D7',
                      borderRadius: '999px',
                      padding: '0.25rem 0.75rem'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#1F2421',
              margin: '0 0 0.75rem 0'
            }}>
              问题描述
            </h3>
            <p style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 300,
              color: '#1F2421',
              lineHeight: 1.6,
              margin: 0,
              whiteSpace: 'pre-wrap'
            }}>
              {ticket.description}
            </p>
          </div>

          {/* Details Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid #E7E1D7'
          }}>
            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#5C635D',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                创建者
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 400,
                color: '#1F2421'
              }}>
                {(ticket.creatorSnapshot as any)?.realName || '未知'}
              </div>
            </div>

            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#5C635D',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                负责人
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 400,
                color: '#1F2421'
              }}>
                {ticket.assignee?.realName || '未分配'}
              </div>
            </div>

            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#5C635D',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                创建时间
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 400,
                color: '#1F2421'
              }}>
                {formatDate(ticket.createdAt)}
              </div>
            </div>

            <div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#5C635D',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.25rem'
              }}>
                更新时间
              </div>
              <div style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 400,
                color: '#1F2421'
              }}>
                {formatDate(ticket.updatedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '2rem',
          border: '1px solid #E7E1D7',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <h2 style={{
            fontFamily: '"Fraunces", serif',
            fontSize: '1.5rem',
            fontWeight: 400,
            color: '#1F2421',
            margin: '0 0 1.5rem 0',
            letterSpacing: '-0.02em'
          }}>
            动态<span style={{ fontStyle: 'italic', color: '#C4612F' }}>记录</span>
          </h2>

          {/* Comment List */}
          <div style={{ marginBottom: '1.5rem' }}>
            {logs.length === 0 ? (
              <p style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                color: '#5C635D',
                textAlign: 'center',
                padding: '2rem'
              }}>
                暂无动态
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      backgroundColor: log.isSystem ? '#FBF9F5' : '#FFFFFF',
                      border: '1px solid #E7E1D7',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: '#1F2421'
                      }}>
                        {log.isSystem ? '系统' : (log.creatorSnapshot as any)?.realName}
                      </span>
                      <span style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '0.75rem',
                        color: '#5C635D'
                      }}>
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    <p style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.9375rem',
                      fontWeight: 300,
                      color: '#1F2421',
                      lineHeight: 1.6,
                      margin: 0,
                      whiteSpace: 'pre-wrap'
                    }}>
                      {log.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Comment */}
          <div style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid #E7E1D7'
          }}>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="添加评论..."
              rows={4}
              style={{
                width: '100%',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9375rem',
                fontWeight: 300,
                color: '#1F2421',
                backgroundColor: '#FBF9F5',
                border: '1px solid #E7E1D7',
                borderRadius: '8px',
                padding: '0.75rem',
                resize: 'vertical',
                outline: 'none',
                marginBottom: '0.75rem'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleAddComment}
                disabled={!comment.trim() || submitting}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  backgroundColor: comment.trim() && !submitting ? '#C4612F' : '#E7E1D7',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '0.625rem 1.5rem',
                  cursor: comment.trim() && !submitting ? 'pointer' : 'not-allowed'
                }}
              >
                {submitting ? '提交中...' : '提交评论'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
