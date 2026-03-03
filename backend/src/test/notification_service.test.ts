import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test the NotificationService CRUD methods.
 *
 * Strategy: mock Prisma client and verify service methods
 * call the correct Prisma operations with correct arguments.
 */

// Use vi.hoisted() for all mock functions
const {
    mockCreate, mockFindMany, mockFindFirst,
    mockCount, mockUpdate, mockUpdateMany, mockDelete,
} = vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindFirst: vi.fn(),
    mockCount: vi.fn(),
    mockUpdate: vi.fn(),
    mockUpdateMany: vi.fn(),
    mockDelete: vi.fn(),
}));

vi.mock('../db/prisma', () => ({
    default: {
        notification: {
            create: (...args: any[]) => mockCreate(...args),
            findMany: (...args: any[]) => mockFindMany(...args),
            findFirst: (...args: any[]) => mockFindFirst(...args),
            count: (...args: any[]) => mockCount(...args),
            update: (...args: any[]) => mockUpdate(...args),
            updateMany: (...args: any[]) => mockUpdateMany(...args),
            delete: (...args: any[]) => mockDelete(...args),
        },
    },
}));

import { NotificationService } from '../services/notification_service';

// Fixtures
const userId = 'user-123';
const notificationId = 'noti-456';
const sampleNotification = {
    id: notificationId,
    userId,
    type: 'COMMENT_REPLY' as const,
    title: 'New Reply',
    message: 'Someone replied to your comment',
    payload: null,
    read: false,
    scheduledAt: null,
    createdAt: new Date('2026-03-03T12:00:00Z'),
};

describe('NotificationService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createNotification', () => {
        it('should create a notification with all fields', async () => {
            mockCreate.mockResolvedValue(sampleNotification);

            const result = await NotificationService.createNotification({
                userId,
                type: 'COMMENT_REPLY',
                title: 'New Reply',
                message: 'Bob replied to your comment',
                payload: { mangaId: 'manga-1', commentId: 'comment-1' },
            });

            expect(mockCreate).toHaveBeenCalledWith({
                data: {
                    userId,
                    type: 'COMMENT_REPLY',
                    title: 'New Reply',
                    message: 'Bob replied to your comment',
                    payload: { mangaId: 'manga-1', commentId: 'comment-1' },
                    scheduledAt: undefined,
                },
            });
            expect(result).toEqual(sampleNotification);
        });

        it('should handle undefined payload', async () => {
            mockCreate.mockResolvedValue(sampleNotification);

            await NotificationService.createNotification({
                userId,
                type: 'SYSTEM',
                title: 'System',
                message: 'Test',
            });

            expect(mockCreate).toHaveBeenCalledWith({
                data: expect.objectContaining({ payload: undefined }),
            });
        });
    });

    describe('getUserNotifications', () => {
        it('should return paginated notifications with default limit', async () => {
            const notifications = Array.from({ length: 20 }, (_, i) => ({
                ...sampleNotification, id: `noti-${i}`,
            }));
            mockFindMany.mockResolvedValue(notifications);

            const result = await NotificationService.getUserNotifications(userId);

            expect(mockFindMany).toHaveBeenCalledWith({
                where: { userId },
                take: 21,
                cursor: undefined,
                orderBy: { createdAt: 'desc' },
            });
            expect(result.notifications).toHaveLength(20);
            expect(result.nextCursor).toBeUndefined();
        });

        it('should return nextCursor when there are more results', async () => {
            const notifications = Array.from({ length: 21 }, (_, i) => ({
                ...sampleNotification, id: `noti-${i}`,
            }));
            mockFindMany.mockResolvedValue(notifications);

            const result = await NotificationService.getUserNotifications(userId);

            expect(result.notifications).toHaveLength(20);
            expect(result.nextCursor).toBe('noti-20');
        });

        it('should support custom limit and cursor', async () => {
            mockFindMany.mockResolvedValue([]);

            await NotificationService.getUserNotifications(userId, {
                limit: 5,
                cursor: 'noti-10',
            });

            expect(mockFindMany).toHaveBeenCalledWith({
                where: { userId },
                take: 6,
                cursor: { id: 'noti-10' },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    describe('getUnreadCount', () => {
        it('should count unread notifications', async () => {
            mockCount.mockResolvedValue(7);

            const count = await NotificationService.getUnreadCount(userId);

            expect(mockCount).toHaveBeenCalledWith({
                where: { userId, read: false },
            });
            expect(count).toBe(7);
        });

        it('should return 0 when no unread', async () => {
            mockCount.mockResolvedValue(0);
            expect(await NotificationService.getUnreadCount(userId)).toBe(0);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            mockFindFirst.mockResolvedValue(sampleNotification);
            mockUpdate.mockResolvedValue({ ...sampleNotification, read: true });

            const result = await NotificationService.markAsRead(userId, notificationId);

            expect(mockFindFirst).toHaveBeenCalledWith({
                where: { id: notificationId, userId },
            });
            expect(mockUpdate).toHaveBeenCalledWith({
                where: { id: notificationId },
                data: { read: true },
            });
            expect(result.read).toBe(true);
        });

        it('should throw if notification not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            await expect(
                NotificationService.markAsRead(userId, 'nonexistent'),
            ).rejects.toThrow('Notification not found');

            expect(mockUpdate).not.toHaveBeenCalled();
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all unread as read', async () => {
            mockUpdateMany.mockResolvedValue({ count: 5 });

            const result = await NotificationService.markAllAsRead(userId);

            expect(mockUpdateMany).toHaveBeenCalledWith({
                where: { userId, read: false },
                data: { read: true },
            });
            expect(result.count).toBe(5);
        });
    });

    describe('deleteNotification', () => {
        it('should delete a notification', async () => {
            mockFindFirst.mockResolvedValue(sampleNotification);
            mockDelete.mockResolvedValue(sampleNotification);

            await NotificationService.deleteNotification(userId, notificationId);

            expect(mockDelete).toHaveBeenCalledWith({
                where: { id: notificationId },
            });
        });

        it('should throw if notification not found', async () => {
            mockFindFirst.mockResolvedValue(null);

            await expect(
                NotificationService.deleteNotification(userId, 'nonexistent'),
            ).rejects.toThrow('Notification not found');

            expect(mockDelete).not.toHaveBeenCalled();
        });
    });
});