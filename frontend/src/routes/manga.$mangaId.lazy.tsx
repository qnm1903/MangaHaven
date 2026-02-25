import { createLazyFileRoute } from '@tanstack/react-router'
import MangaDetail from '@/pages/MangaDetail'

export const Route = createLazyFileRoute('/manga/$mangaId')({
    component: MangaDetail,
})
