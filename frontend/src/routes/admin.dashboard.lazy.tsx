// frontend/src/routes/admin.dashboard.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router';
import AdminDashboard from '@/pages/admin/AdminDashboard';

export const Route = createLazyFileRoute('/admin/dashboard')({
  component: () => (
    <AdminDashboard />
  ),
});
