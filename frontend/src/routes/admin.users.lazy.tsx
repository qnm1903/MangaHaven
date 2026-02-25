// frontend/src/routes/admin.users.lazy.tsx
import { createLazyFileRoute } from '@tanstack/react-router';
import AdminUsers from '@/pages/admin/AdminUsers';

export const Route = createLazyFileRoute('/admin/users')({
  component: () => (
    <AdminUsers />
  ),
});
