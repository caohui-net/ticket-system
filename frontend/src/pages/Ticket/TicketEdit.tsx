import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketApi } from '../../services/api';
import { TicketType, TicketPriority, TicketStatus } from '../../types';

export const TicketEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: TicketType.ISSUE,
    priority: TicketPriority.MEDIUM,
    status: TicketStatus.OPEN,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await ticketApi.getTicket(Number(id));
      const ticket = response.data.data;
      if (ticket) {
        setFormData({
          title: ticket.title,
          description: ticket.description,
          type: ticket.type,
          priority: ticket.priority,
          status: ticket.status,
          tags: ticket.tags || [],
        });
      }
    } catch (err) {
      setError('加载工单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setError('请输入工单标题');
      return;
    }

    if (!formData.description.trim()) {
      setError('请输入问题描述');
      return;
    }

    try {
      setSubmitting(true);
      await ticketApi.updateTicket(Number(id), formData);
      navigate(`/tickets/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '更新失败,请重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', color: '#5C635D' }}>加载中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F4EF', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate(`/tickets/${id}`)} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 400, color: '#5C635D', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>← 返回详情</button>
          <div style={{ flex: 1 }}><h1 style={{ fontFamily: '"Fraunces", serif', fontSize: '2rem', fontWeight: 400, color: '#1F2421', margin: 0, letterSpacing: '-0.02em' }}>编辑<span style={{ fontStyle: 'italic', color: '#C4612F' }}>工单</span></h1></div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '2rem', border: '1px solid #E7E1D7', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)' }}>
            {error && <div style={{ backgroundColor: '#FEE', border: '1px solid #FCC', borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#C00' }}>{error}</div>}
            <div style={{ marginBottom: '1.5rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>工单标题 <span style={{ color: '#C4612F' }}>*</span></label><input type="text" value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} placeholder="请简要描述问题" style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.75rem', outline: 'none' }} /></div>
            <div style={{ marginBottom: '1.5rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>工单类型</label><select value={formData.type} onChange={(e) => handleInputChange('type', e.target.value)} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.75rem', outline: 'none', cursor: 'pointer' }}><option value={TicketType.ISSUE}>故障报修</option><option value={TicketType.REQUEST}>需求申请</option><option value={TicketType.CONSULTATION}>咨询求助</option><option value={TicketType.COMPLAINT}>投诉建议</option><option value={TicketType.OTHER}>其他</option></select></div>
            <div style={{ marginBottom: '1.5rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>优先级</label><select value={formData.priority} onChange={(e) => handleInputChange('priority', e.target.value)} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.75rem', outline: 'none', cursor: 'pointer' }}><option value={TicketPriority.LOW}>低</option><option value={TicketPriority.MEDIUM}>中</option><option value={TicketPriority.HIGH}>高</option><option value={TicketPriority.URGENT}>紧急</option></select></div>
            <div style={{ marginBottom: '1.5rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>状态</label><select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.75rem', outline: 'none', cursor: 'pointer' }}><option value={TicketStatus.OPEN}>待处理</option><option value={TicketStatus.IN_PROGRESS}>处理中</option><option value={TicketStatus.PENDING}>待反馈</option><option value={TicketStatus.RESOLVED}>已解决</option><option value={TicketStatus.CLOSED}>已关闭</option></select></div>
            <div style={{ marginBottom: '1.5rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>问题描述 <span style={{ color: '#C4612F' }}>*</span></label><textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder="请详细描述问题" rows={8} style={{ width: '100%', fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.75rem', resize: 'vertical', outline: 'none' }} /></div>
            <div style={{ marginBottom: '2rem' }}><label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', marginBottom: '0.5rem' }}>标签</label><div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}><input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="输入标签后按回车" style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 300, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.625rem', outline: 'none' }} /><button type="button" onClick={handleAddTag} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#1F2421', backgroundColor: '#FBF9F5', border: '1px solid #E7E1D7', borderRadius: '8px', padding: '0.625rem 1rem', cursor: 'pointer' }}>添加</button></div>{formData.tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{formData.tags.map((tag) => (<span key={tag} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 400, color: '#1F2421', backgroundColor: '#F2E3D6', border: '1px solid #E7E1D7', borderRadius: '999px', padding: '0.375rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>{tag}<button type="button" onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#C4612F', cursor: 'pointer', padding: 0, fontSize: '1rem', lineHeight: 1 }}>×</button></span>))}</div>}</div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1.5rem', borderTop: '1px solid #E7E1D7' }}><button type="button" onClick={() => navigate(`/tickets/${id}`)} disabled={submitting} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 400, color: '#5C635D', backgroundColor: '#FFFFFF', border: '1px solid #E7E1D7', borderRadius: '999px', padding: '0.75rem 1.75rem', cursor: submitting ? 'not-allowed' : 'pointer' }}>取消</button><button type="submit" disabled={submitting || !formData.title.trim() || !formData.description.trim()} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 500, color: '#FFFFFF', backgroundColor: submitting || !formData.title.trim() || !formData.description.trim() ? '#E7E1D7' : '#C4612F', border: 'none', borderRadius: '999px', padding: '0.75rem 1.75rem', cursor: submitting || !formData.title.trim() || !formData.description.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease' }}>{submitting ? '保存中...' : '保存更改'}</button></div>
          </div>
        </form>
      </div>
    </div>
  );
};
