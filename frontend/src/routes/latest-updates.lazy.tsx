import { createLazyFileRoute } from '@tanstack/react-router';
import LatestUpdates from '@/pages/LatestUpdates';

export const Route = createLazyFileRoute('/latest-updates')({
    component: LatestUpdates,
});