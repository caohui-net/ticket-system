import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Checkbox, message, Progress } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, IdcardOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/store';
import type { RegisterData } from '@/types';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form] = Form.useForm();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 计算密码强度
  const calculatePasswordStrength = (password: string): number => {
    if (!password) return 0;
    let strength = 0;

    // 长度
    if (password.length >= 6) strength += 20;
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;

    // 包含小写字母
    if (/[a-z]/.test(password)) strength += 15;

    // 包含大写字母
    if (/[A-Z]/.test(password)) strength += 15;

    // 包含数字
    if (/\d/.test(password)) strength += 10;

    // 包含特殊字符
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 10;

    return Math.min(strength, 100);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    setPasswordStrength(calculatePasswordStrength(password));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return '#ff4d4f';
    if (passwordStrength < 70) return '#faad14';
    return '#52c41a';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return '弱';
    if (passwordStrength < 70) return '中';
    return '强';
  };

  const handleSubmit = async (values: RegisterData) => {
    if (!agreedToTerms) {
      message.warning('请阅读并同意用户协议');
      return;
    }

    try {
      await register(values);
      message.success('注册成功，欢迎使用');
      navigate('/tickets', { replace: true });
    } catch (error: any) {
      console.error('Register failed:', error);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <h1>用户注册</h1>
          <p>创建您的账号，开始使用工单系统</p>
        </div>

        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, max: 20, message: '用户名长度为4-20位' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: '用户名只能包含字母、数字和下划线',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名（4-20位，字母数字下划线）"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="realName"
            rules={[
              { required: true, message: '请输入真实姓名' },
              { min: 2, max: 20, message: '姓名长度为2-20位' },
            ]}
          >
            <Input
              prefix={<IdcardOutlined />}
              placeholder="真实姓名"
              autoComplete="name"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱地址"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="phone"
            rules={[
              {
                pattern: /^1[3-9]\d{9}$/,
                message: '请输入有效的手机号码',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="手机号码（可选）"
              autoComplete="tel"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, max: 20, message: '密码长度为6-20位' },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
                message: '密码必须包含字母和数字',
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码（6-20位，包含字母和数字）"
              autoComplete="new-password"
              onChange={handlePasswordChange}
            />
          </Form.Item>

          {passwordStrength > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Progress
                  percent={passwordStrength}
                  strokeColor={getPasswordStrengthColor()}
                  showInfo={false}
                  style={{ flex: 1 }}
                />
                <span style={{ color: getPasswordStrengthColor(), fontSize: '14px' }}>
                  {getPasswordStrengthText()}
                </span>
              </div>
            </div>
          )}

          <Form.Item
            name="confirmPassword"
            dependencies={['password']}
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="确认密码"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: '16px' }}>
            <Checkbox
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
            >
              我已阅读并同意{' '}
              <a href="#" style={{ color: '#C4612F' }}>
                《用户协议》
              </a>
            </Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              block
              style={{ height: '40px', fontSize: '16px' }}
            >
              注册
            </Button>
          </Form.Item>

          <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
            <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
              已有账号?{' '}
              <Link to="/login" style={{ color: '#C4612F' }}>
                立即登录
              </Link>
            </span>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
