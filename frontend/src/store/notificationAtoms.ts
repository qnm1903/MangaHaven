import { atom } from 'jotai';
import type { Notification } from '@/services/notification_service';

// Notification list (newest first)
export const notificationsAtom = atom<Notification[]>([]);

// Unread badge counter
export const unreadCountAtom = atom<number>(0);

// Loading state for initial fetch
export const notificationLoadingAtom = atom<boolean>(false);

// Pagination cursor
export const notificationCursorAtom = atom<string | undefined>(undefined);

// Whether there are more notifications to load
export const hasMoreNotificationsAtom = atom<boolean>(true);