import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  // 等待 zustand persist 从 localStorage 完成 hydration
  const hasHydrated = useAuthStore.persist?.hasHydrated?.() ?? true;
  const location = useLocation();

  // persist 尚未完成还原，先不做跳转（避免竞态导致误跳回登录页）
  if (!hasHydrated) {
    return null;
  }

  // 未登录，跳转到登录页
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 已登录，检查权限
  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
