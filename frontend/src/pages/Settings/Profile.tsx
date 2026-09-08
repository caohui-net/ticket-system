import { useState } from 'react';
import { Card, Descriptions, Form, Input, Button, message, Space, Spin } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/api';
import Layout from '@/components/Layout';

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  const { data: profileResponse, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userApi.getProfile(),
  });

  const profile = profileResponse?.data.data;

  const updateMutation = useMutation({
    mutationFn: (values: { realName: string; email?: string; department?: string }) =>
      userApi.updateProfile(values),
    onSuccess: () => {
      message.success('个人信息更新成功');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: () => {
      message.error('更新失败，请重试');
    },
  });

  const handleEdit = () => {
    if (profile) {
      form.setFieldsValue({
        realName: profile.realName,
        email: profile.email || '',
        department: profile.department || '',
      });
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const handleSubmit = async (values: any) => {
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card
        title="个人信息"
        extra={
          !isEditing && (
            <Button type="primary" onClick={handleEdit}>
              编辑
            </Button>
          )
        }
        style={{ maxWidth: 800, margin: '0 auto' }}
      >
        {!isEditing ? (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={<><UserOutlined /> 用户名</>}>
              {profile?.username}
            </Descriptions.Item>
            <Descriptions.Item label="真实姓名">
              {profile?.realName}
            </Descriptions.Item>
            <Descriptions.Item label={<><MailOutlined /> 邮箱</>}>
              {profile?.email || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="部门">
              {profile?.department || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {profile?.role === 'admin' ? '管理员' : '普通用户'}
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            <Form.Item label="用户名">
              <Input value={profile?.username} disabled />
            </Form.Item>

            <Form.Item
              name="realName"
              label="真实姓名"
              rules={[{ required: true, message: '请输入真实姓名' }]}
            >
              <Input placeholder="请输入真实姓名" />
            </Form.Item>

            <Form.Item
              name="email"
              label="邮箱"
              rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>

            <Form.Item name="department" label="部门">
              <Input placeholder="请输入部门" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateMutation.isPending}
                >
                  保存
                </Button>
                <Button onClick={handleCancel}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Card>
    </Layout>
  );
}
