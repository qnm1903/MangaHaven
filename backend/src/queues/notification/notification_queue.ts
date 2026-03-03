import { Queue } from 'bullmq';
import { bullmqConnection } from '../connection';
import type {
    NotificationJobMap,
    NotificationJobName,
    CommentReplyPayload,
    NewChapterPayload,
    GroupUploadPayload,
    SystemNotificationPayload,
} from './notification_types';

// ──────────────────────────────────────────────
// Queue Definition
// ──────────────────────────────────────────────

export const NOTIFICATION_QUEUE_NAME = 'notifications';

export const notificationQueue = new Queue<
    NotificationJobMap[NotificationJobName],
    void,
    NotificationJobName
>(NOTIFICATION_QUEUE_NAME, {
    connection: bullmqConnection,
    defaultJobOptions: {
        removeOnComplete: 100,  // Keep last 100 completed for debugging
        removeOnFail: 500,      // Keep last 500 failed
        attempts: 3,            // Retry 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 2000,        // 2s → 4s → 8s
        },
    },
});

// Producer Functions

/**
 * Phase 1: Queue a comment reply notification.
 * Called from comment_controller when a user replies to another user's comment.
 */
export async function queueCommentReplyNotification(
    payload: CommentReplyPayload,
): Promise<void> {
    // Skip self-replies at producer level (belt-and-suspenders with worker)
    if (payload.replyUserId === payload.targetUserId) return;

    await notificationQueue.add('comment-reply', payload, {
        // Deduplicate: same user + same comment → keep latest only
        jobId: `comment-reply:${payload.targetUserId}:${payload.commentId}`,
    });
}

/**
 * Phase 2 stub: Queue notifications for new chapter to all followers.
 * Fan-out to individual user jobs for per-user delivery tracking.
 */
export async function queueNewChapterNotification(
    mangaId: string,
    mangaTitle: string,
    chapterId: string,
    chapterNumber: string | undefined,
    followerIds: string[],
): Promise<void> {
    const jobs = followerIds.map((userId) => ({
        name: 'new-chapter' as const,
        data: {
            targetUserId: userId,
            mangaId,
            mangaTitle,
            chapterId,
            chapterNumber,
        } satisfies NewChapterPayload,
        opts: {
            jobId: `new-chapter:${chapterId}:${userId}`,
        },
    }));

    if (jobs.length > 0) {
        await notificationQueue.addBulk(jobs);
    }
}

/**
 * Phase 2 stub: Queue notification when a followed group uploads new manga.
 */
export async function queueGroupUploadNotification(
    payload: GroupUploadPayload,
): Promise<void> {
    await notificationQueue.add('group-upload', payload, {
        jobId: `group-upload:${payload.groupId}:${payload.mangaId}:${payload.targetUserId}`,
    });
}

/**
 * Phase 2 stub: Queue system-wide notification from admin.
 */
export async function queueSystemNotification(
    payload: SystemNotificationPayload,
): Promise<void> {
    await notificationQueue.add('system', payload);
}