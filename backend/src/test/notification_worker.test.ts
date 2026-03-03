import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test the notification worker's job handler logic.
 *
 * Strategy: mock BullMQ Worker to capture the processor function,
 * then call it directly with mock jobs to test handler logic.
 */

// Use vi.hoisted() so mocks are available before vi.mock hoisting
const {
    mockFindUnique,
    mockCreateNotification,
    mockEmitToUser,
    testWorkerProcessor,
} = vi.hoisted(() => ({
    mockFindUnique: vi.fn(),
    mockCreateNotification: vi.fn(),
    mockEmitToUser: vi.fn(),
    testWorkerProcessor: { fn: null as any },
}));

// Mock BullMQ — capture processor function
vi.mock('bullmq', () => ({
    Worker: vi.fn().mockImplementation((_name: string, processor: Function) => {
        testWorkerProcessor.fn = processor;
        return { on: vi.fn(), close: vi.fn() };
    }),
    Job: vi.fn(),
}));

// Mock paths relative to the SOURCE file (notification.worker.ts),
// NOT relative to the test file. Vitest resolves mock paths from the
// importing module's location.
vi.mock('../queues/connection', () => ({
    bullmqConnection: { host: 'localhost', port: 6379, maxRetriesPerRequest: null },
}));

vi.mock('../queues/notification/notification_queue', () => ({
    NOTIFICATION_QUEUE_NAME: 'notifications-test',
}));

vi.mock('../db/prisma', () => ({
    default: {
        user: { findUnique: (...args: any[]) => mockFindUnique(...args) },
    },
}));

vi.mock('../services/notification_service', () => ({
    NotificationService: {
        createNotification: (...args: any[]) => mockCreateNotification(...args),
    },
}));

vi.mock('../services/socket_service', () => ({
    emitToUser: (...args: any[]) => mockEmitToUser(...args),
}));

// Import the module under test (path relative to this test file)
import { createNotificationWorker, closeNotificationWorker } from '../queues/notification/notification_worker';

function createMockJob(name: string, data: Record<string, any>) {
    return { id: `test-job-${Date.now()}`, name, data };
}

describe('Notification Worker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        createNotificationWorker();
    });

    describe('comment-reply handler', () => {
        const basePayload = {
            targetUserId: 'user-A',
            replyUserId: 'user-B',
            mangaId: 'manga-1',
            commentId: 'comment-1',
            parentCommentId: 'parent-1',
        };

        it('should create notification and emit socket event for a valid reply', async () => {
            mockFindUnique.mockResolvedValue({ displayName: 'Bob' });

            const mockNotification = {
                id: 'noti-1',
                type: 'COMMENT_REPLY',
                title: 'New Reply',
                message: 'Bob replied to your comment',
                payload: { mangaId: 'manga-1', commentId: 'comment-1', replyUserId: 'user-B' },
                read: false,
                createdAt: new Date('2026-03-03T12:00:00Z'),
            };
            mockCreateNotification.mockResolvedValue(mockNotification);

            await testWorkerProcessor.fn(createMockJob('comment-reply', basePayload));

            expect(mockFindUnique).toHaveBeenCalledWith({
                where: { id: 'user-B' },
                select: { displayName: true },
            });

            expect(mockCreateNotification).toHaveBeenCalledWith({
                userId: 'user-A',
                type: 'COMMENT_REPLY',
                title: 'New Reply',
                message: 'Bob replied to your comment',
                payload: { mangaId: 'manga-1', commentId: 'comment-1', replyUserId: 'user-B' },
            });

            expect(mockEmitToUser).toHaveBeenCalledWith(
                'user-A',
                'notification',
                expect.objectContaining({ id: 'noti-1', type: 'COMMENT_REPLY', read: false }),
            );
        });

        it('should use "Someone" when reply user has no displayName', async () => {
            mockFindUnique.mockResolvedValue({ displayName: null });
            mockCreateNotification.mockResolvedValue({
                id: 'noti-2', type: 'COMMENT_REPLY', title: 'New Reply',
                message: 'Someone replied to your comment',
                payload: {}, read: false, createdAt: new Date(),
            });

            await testWorkerProcessor.fn(createMockJob('comment-reply', basePayload));

            expect(mockCreateNotification).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Someone replied to your comment' }),
            );
        });

        it('should use "Someone" when reply user not found', async () => {
            mockFindUnique.mockResolvedValue(null);
            mockCreateNotification.mockResolvedValue({
                id: 'noti-3', type: 'COMMENT_REPLY', title: 'New Reply',
                message: 'Someone replied to your comment',
                payload: {}, read: false, createdAt: new Date(),
            });

            await testWorkerProcessor.fn(createMockJob('comment-reply', basePayload));

            expect(mockCreateNotification).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Someone replied to your comment' }),
            );
        });

        it('should skip self-reply (targetUserId === replyUserId)', async () => {
            const selfReplyPayload = {
                targetUserId: 'user-A',
                replyUserId: 'user-A',
                mangaId: 'manga-1',
                commentId: 'comment-1',
                parentCommentId: 'parent-1',
            };

            await testWorkerProcessor.fn(createMockJob('comment-reply', selfReplyPayload));

            expect(mockFindUnique).not.toHaveBeenCalled();
            expect(mockCreateNotification).not.toHaveBeenCalled();
            expect(mockEmitToUser).not.toHaveBeenCalled();
        });
    });

    describe('unknown job name', () => {
        it('should not crash for unknown job names', async () => {
            await expect(
                testWorkerProcessor.fn(createMockJob('unknown-type', { foo: 'bar' })),
            ).resolves.toBeUndefined();

            expect(mockCreateNotification).not.toHaveBeenCalled();
            expect(mockEmitToUser).not.toHaveBeenCalled();
        });
    });

    describe('closeNotificationWorker', () => {
        it('should close the worker without error', async () => {
            await expect(closeNotificationWorker()).resolves.toBeUndefined();
        });
    });
});