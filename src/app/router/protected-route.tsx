import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/shared/auth/store';
import { usePermissions } from '@/shared/hooks/use-permissions';
import type { PermissionLevel } from '@/shared/config/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  minPermissionLevel?: PermissionLevel;
}

export function ProtectedRoute({ children, minPermissionLevel }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { atLeast } = usePermissions();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (minPermissionLevel && !atLeast(minPermissionLevel)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
