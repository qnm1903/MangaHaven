import { createLazyFileRoute } from '@tanstack/react-router'
import AuthorDetail from '@/pages/AuthorDetail'

export const Route = createLazyFileRoute('/author/$authorId')({
    component: AuthorDetail,
})
