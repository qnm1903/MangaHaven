// frontend/src/routes/admin.lazy.tsx
import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    // Check if user is authenticated and is admin
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');

    // Not authenticated
    if (!storedToken || !storedUser) {
      throw redirect({
        to: '/auth',
        search: { redirect: '/admin' },
      });
    }

    // Parse user to check role
    try {
      const user = JSON.parse(storedUser);
      
      // Not admin
      if (user.role?.toUpperCase() !== 'ADMIN') {
        throw redirect({ to: '/' });
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
      throw redirect({ to: '/auth' });
    }
  },
  component: () => <Outlet />,
});