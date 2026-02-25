import React, { useEffect } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use_toast';
import { Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();

  const hasAdminPermission = Boolean(user && user.role?.toLowerCase() === 'admin');

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!hasAdminPermission) {
      toast({
        title: 'Truy cập bị từ chối',
        description: 'Bạn không có quyền truy cập trang admin.',
      });
      navigate({ to: '/' });
    }
  }, [hasAdminPermission, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAdminPermission) {
    return null;
  }

  return <React.Fragment key={routerState.location.href}>{children}</React.Fragment>;
};
