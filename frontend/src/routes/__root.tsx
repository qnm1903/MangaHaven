// frontend/src/routes/__root.tsx
import { createRootRoute, Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "../contexts/AuthContext";
import { MainLayout } from "../components/layout/MainLayout";
import { AuthLayout } from "../components/layout/AuthLayout";
import { AdminLayout } from "../components/admin/AdminLayout";
import { AdminGuard } from "../components/auth/AdminGuard";
import { Toaster } from "../components/ui/toaster";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const clientId = import.meta.env.VITE_OAUTH_CLIENT_ID;
  const location = useLocation();
  
  if (!clientId) {
    console.error('VITE_OAUTH_CLIENT_ID is not defined in environment variables');
  }

  const isAuthRoute = location.pathname === '/auth';
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        {isAuthRoute ? (
          <AuthLayout>
            <Outlet />
          </AuthLayout>
        ) : isAdminRoute ? (
          <AdminGuard>
            <AdminLayout>
              <Outlet />
            </AdminLayout>
          </AdminGuard>
        ) : (
          <MainLayout>
            <Outlet />
          </MainLayout>
        )}
        <Toaster />
        <TanStackRouterDevtools />
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}