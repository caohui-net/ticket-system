import { createBrowserRouter, Navigate } from 'react-router-dom';

// 临时占位组件
const Login = () => <div>登录页面</div>;
const TicketList = () => <div>工单列表</div>;

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Navigate to="/tickets" replace />,
  },
  {
    path: '/tickets',
    element: <TicketList />,
  },
  {
    path: '*',
    element: <div>404 - 页面不存在</div>,
  },
]);
