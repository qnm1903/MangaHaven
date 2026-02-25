import { createLazyFileRoute } from '@tanstack/react-router'
import GroupDetail from '@/pages/GroupDetail'

export const Route = createLazyFileRoute('/group/local/$groupId')({
    component: () => <GroupDetail source="local" />,
})
