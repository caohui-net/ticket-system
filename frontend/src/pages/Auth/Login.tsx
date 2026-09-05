import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store';
import type { LoginCredentials } from '@/types';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading } = useAuthStore();
  const [rememberMe, setRememberMe] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/tickets';

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      await login(values);
      message.success('登录成功');
      navigate(from, { replace: true });
    } catch (error: any) {
      // 错误已经在axios拦截器中处理
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div className="auth-header">
          <h1>工单管理系统</h1>
          <p>欢迎回来，请登录您的账号</p>
        </div>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={handleSubmit}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名/邮箱"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              >
                记住我
              </Checkbox>
              <a href="#" style={{ color: '#C4612F' }}>
                忘记密码?
              </a>
            </div>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              style={{ height: '40px', fontSize: '16px' }}
            >
              登录
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
              还没有账号?{' '}
              <Link to="/register" style={{ color: '#C4612F' }}>
                立即注册
              </Link>
            </span>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
