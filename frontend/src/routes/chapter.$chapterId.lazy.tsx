import { createLazyFileRoute } from '@tanstack/react-router';
import ChapterReader from '@/pages/ChapterReader';

export const Route = createLazyFileRoute('/chapter/$chapterId')({
  component: ChapterReader,
});