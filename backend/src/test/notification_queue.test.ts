import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test the notification queue producer functions.
 *
 * Strategy: mock the BullMQ Queue instance and verify that
 * producer functions call queue.add / queue.addBulk with
 * the correct arguments.
 */

// Use vi.hoisted() so mocks are available before vi.mock hoisting
const { mockAdd, mockAddBulk } = vi.hoisted(() => ({
    mockAdd: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    mockAddBulk: vi.fn().mockResolvedValue([]),
}));

// Mock the connection module (prevent real Redis connection)
vi.mock('../connection', () => ({
    bullmqConnection: { host: 'localhost', port: 6379 },
}));

// Mock BullMQ Queue class
vi.mock('bullmq', () => ({
    Queue: vi.fn().mockImplementation(() => ({
        add: mockAdd,
        addBulk: mockAddBulk,
        close: vi.fn(),
    })),
}));

// Import after mocks are set up
import {
    queueCommentReplyNotification,
    queueNewChapterNotification,
    queueGroupUploadNotification,
    queueSystemNotification,
} from '../queues/notification/notification_queue';

describe('Notification Queue - Producer Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('queueCommentReplyNotification', () => {
        it('should add a comment-reply job to the queue', async () => {
            const payload = {
                targetUserId: 'user-A',
                replyUserId: 'user-B',
                mangaId: 'manga-1',
                commentId: 'comment-1',
                parentCommentId: 'parent-1',
            };

            await queueCommentReplyNotification(payload);

            expect(mockAdd).toHaveBeenCalledOnce();
            expect(mockAdd).toHaveBeenCalledWith('comment-reply', payload, {
                jobId: 'comment-reply:user-A:comment-1',
            });
        });

        it('should skip self-replies (targetUserId === replyUserId)', async () => {
            const payload = {
                targetUserId: 'user-A',
                replyUserId: 'user-A',
                mangaId: 'manga-1',
                commentId: 'comment-1',
                parentCommentId: 'parent-1',
            };

            await queueCommentReplyNotification(payload);

            expect(mockAdd).not.toHaveBeenCalled();
        });

        it('should generate unique jobId for deduplication', async () => {
            const payload1 = {
                targetUserId: 'user-A',
                replyUserId: 'user-B',
                mangaId: 'manga-1',
                commentId: 'comment-1',
                parentCommentId: 'parent-1',
            };

            const payload2 = {
                targetUserId: 'user-A',
                replyUserId: 'user-C',
                mangaId: 'manga-1',
                commentId: 'comment-2',
                parentCommentId: 'parent-1',
            };

            await queueCommentReplyNotification(payload1);
            await queueCommentReplyNotification(payload2);

            const jobId1 = mockAdd.mock.calls[0][2].jobId;
            const jobId2 = mockAdd.mock.calls[1][2].jobId;
            expect(jobId1).not.toBe(jobId2);
            expect(jobId1).toBe('comment-reply:user-A:comment-1');
            expect(jobId2).toBe('comment-reply:user-A:comment-2');
        });
    });

    describe('queueNewChapterNotification', () => {
        it('should fan-out to individual jobs per follower', async () => {
            const followerIds = ['user-1', 'user-2', 'user-3'];

            await queueNewChapterNotification(
                'manga-1', 'One Piece', 'chapter-100', '100', followerIds,
            );

            expect(mockAddBulk).toHaveBeenCalledOnce();
            const jobs = mockAddBulk.mock.calls[0][0];
            expect(jobs).toHaveLength(3);

            expect(jobs[0]).toEqual({
                name: 'new-chapter',
                data: {
                    targetUserId: 'user-1',
                    mangaId: 'manga-1',
                    mangaTitle: 'One Piece',
                    chapterId: 'chapter-100',
                    chapterNumber: '100',
                },
                opts: { jobId: 'new-chapter:chapter-100:user-1' },
            });
        });

        it('should not call addBulk when followerIds is empty', async () => {
            await queueNewChapterNotification('manga-1', 'One Piece', 'ch-100', '100', []);

            expect(mockAddBulk).not.toHaveBeenCalled();
        });

        it('should handle undefined chapterNumber', async () => {
            await queueNewChapterNotification('manga-1', 'Test', 'ch-1', undefined, ['user-1']);

            const jobs = mockAddBulk.mock.calls[0][0];
            expect(jobs[0].data.chapterNumber).toBeUndefined();
        });
    });

    describe('queueGroupUploadNotification', () => {
        it('should add a group-upload job with composite jobId', async () => {
            const payload = {
                targetUserId: 'user-1',
                groupId: 'group-1',
                groupName: 'Team Manga',
                mangaId: 'manga-1',
                mangaTitle: 'New Manga',
            };

            await queueGroupUploadNotification(payload);

            expect(mockAdd).toHaveBeenCalledWith('group-upload', payload, {
                jobId: 'group-upload:group-1:manga-1:user-1',
            });
        });
    });

    describe('queueSystemNotification', () => {
        it('should add a system job', async () => {
            const payload = {
                message: 'System maintenance at 3AM',
                targetUserIds: ['user-1', 'user-2'] as string[],
            };

            await queueSystemNotification(payload);

            expect(mockAdd).toHaveBeenCalledWith('system', payload);
        });

        it('should support "all" as target', async () => {
            const payload = {
                message: 'Welcome to MangaHaven v2!',
                targetUserIds: 'all' as const,
            };

            await queueSystemNotification(payload);

            expect(mockAdd.mock.calls[0][1].targetUserIds).toBe('all');
        });
    });
});