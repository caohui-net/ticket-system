import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login, Register } from '@/pages/Auth';
import ProtectedRoute from '@/components/ProtectedRoute';

// 临时占位组件
const TicketList = () => <div>工单列表</div>;
const NotFound = () => (
  <div style={{ textAlign: 'center', padding: '48px' }}>
    <h1>404</h1>
    <p>页面不存在</p>
  </div>
);
const Forbidden = () => (
  <div style={{ textAlign: 'center', padding: '48px' }}>
    <h1>403</h1>
    <p>没有权限访问</p>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: <Navigate to="/tickets" replace />,
  },
  {
    path: '/tickets',
    element: (
      <ProtectedRoute>
        <TicketList />
      </ProtectedRoute>
    ),
  },
  {
    path: '/403',
    element: <Forbidden />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
