import { createLazyFileRoute } from '@tanstack/react-router'
import GroupDetail from '@/pages/GroupDetail'

export const Route = createLazyFileRoute('/group/mangadex/$groupId')({
    component: () => <GroupDetail source="mangadex" />,
})
