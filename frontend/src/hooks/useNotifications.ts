import { useCallback, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import {
    notificationsAtom,
    unreadCountAtom,
    notificationLoadingAtom,
    notificationCursorAtom,
    hasMoreNotificationsAtom,
} from '@/store/notificationAtoms';
import * as NotificationAPI from '@/services/notification_service';
import type { Notification } from '@/services/notification_service';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useAtom(notificationsAtom);
    const [unreadCount, setUnreadCount] = useAtom(unreadCountAtom);
    const [loading, setLoading] = useAtom(notificationLoadingAtom);
    const [cursor, setCursor] = useAtom(notificationCursorAtom);
    const [hasMore, setHasMore] = useAtom(hasMoreNotificationsAtom);
    const initializedRef = useRef(false);

    // Fetch initial notifications + unread count
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [listResult, count] = await Promise.all([
                NotificationAPI.getNotifications(),
                NotificationAPI.getUnreadCount(),
            ]);
            setNotifications(listResult.notifications);
            setCursor(listResult.nextCursor);
            setHasMore(!!listResult.nextCursor);
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [user, setNotifications, setCursor, setHasMore, setUnreadCount, setLoading]);

    // Load more (pagination)
    const fetchMore = useCallback(async () => {
        if (!cursor || !hasMore) return;
        try {
            const result = await NotificationAPI.getNotifications(cursor);
            setNotifications((prev) => [...prev, ...result.notifications]);
            setCursor(result.nextCursor);
            setHasMore(!!result.nextCursor);
        } catch (error) {
            console.error('Failed to load more notifications:', error);
        }
    }, [cursor, hasMore, setNotifications, setCursor, setHasMore]);

    // Mark single as read
    const markRead = useCallback(async (id: string) => {
        try {
            await NotificationAPI.markAsRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }, [setNotifications, setUnreadCount]);

    // Mark all as read
    const markAllRead = useCallback(async () => {
        try {
            await NotificationAPI.markAllAsRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }, [setNotifications, setUnreadCount]);

    // Delete single
    const deleteNoti = useCallback(async (id: string) => {
        try {
            const noti = notifications.find((n) => n.id === id);
            await NotificationAPI.deleteNotification(id);
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (noti && !noti.read) {
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }, [notifications, setNotifications, setUnreadCount]);

    // Socket.IO: listen for new notifications in real-time
    useEffect(() => {
        if (!user) return;

        // Fetch on first mount for this user
        if (!initializedRef.current) {
            initializedRef.current = true;
            fetchNotifications();
        }

        const socket = getSocket();

        const handleNewNotification = (data: Notification) => {
            // Prepend to list
            setNotifications((prev) => [data, ...prev]);
            setUnreadCount((prev) => prev + 1);
        };

        socket.on('notification', handleNewNotification);

        return () => {
            socket.off('notification', handleNewNotification);
        };
    }, [user, fetchNotifications, setNotifications, setUnreadCount]);

    // Reset on logout
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            setCursor(undefined);
            setHasMore(true);
            initializedRef.current = false;
        }
    }, [user, setNotifications, setUnreadCount, setCursor, setHasMore]);

    return {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchNotifications,
        fetchMore,
        markRead,
        markAllRead,
        deleteNoti,
    };
}