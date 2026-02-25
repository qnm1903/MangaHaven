import { createLazyFileRoute } from '@tanstack/react-router';
import ReadingHistory from '@/pages/ReadingHistory';

export const Route = createLazyFileRoute('/reading-history')({
  component: ReadingHistory,
});
