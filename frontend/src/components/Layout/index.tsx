import { Layout as AntLayout, Menu, Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, HomeOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import type { MenuProps } from 'antd';

const { Header, Content } = AntLayout;

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'password',
      icon: <SettingOutlined />,
      label: '修改密码',
      onClick: () => navigate('/settings/password'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
      danger: true,
    },
  ];

  const navItems: MenuProps['items'] = [
    {
      key: '/tickets',
      icon: <FileTextOutlined />,
      label: <Link to="/tickets">工单管理</Link>,
    },
  ];

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: '#C4612F' }}>
            <HomeOutlined style={{ fontSize: 24, marginRight: 8 }} />
            <span style={{ fontSize: 18, fontWeight: 'bold' }}>工单管理系统</span>
          </Link>
        </div>

        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname.startsWith('/tickets') ? '/tickets' : location.pathname]}
          items={navItems}
          style={{ flex: 1, minWidth: 0, border: 'none', marginLeft: 24 }}
        />

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#C4612F' }} />
            <span>{user?.realName || user?.username}</span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </div>
      </Content>
    </AntLayout>
  );
}
