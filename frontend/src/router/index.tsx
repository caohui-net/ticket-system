import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login, Register } from '@/pages/Auth';
import ProtectedRoute from '@/components/ProtectedRoute';
import { TicketList, TicketDetail, TicketCreate, TicketEdit } from '@/pages/Ticket';
import { Profile, ChangePassword } from '@/pages/Settings';



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
    path: '/tickets/create',
    element: (
      <ProtectedRoute>
        <TicketCreate />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tickets/:id',
    element: (
      <ProtectedRoute>
        <TicketDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '/tickets/:id/edit',
    element: (
      <ProtectedRoute>
        <TicketEdit />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/profile',
    element: (
      <ProtectedRoute>
        <Profile />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/password',
    element: (
      <ProtectedRoute>
        <ChangePassword />
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
