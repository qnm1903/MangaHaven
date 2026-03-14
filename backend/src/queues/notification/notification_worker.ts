import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../connection';
import { NOTIFICATION_QUEUE_NAME } from './notification_queue';
import { NotificationService } from '../../services/notification_service';
import { emitToUser } from '../../services/socket_service';
import prisma from '../../db/prisma';
import type { NotificationJobMap, NotificationJobName } from './notification_types';
import { checkNewChapters } from './new_chapter_checker';

// ──────────────────────────────────────────────
// Worker
// ──────────────────────────────────────────────

let worker: Worker | null = null;

/**
 * Create and return the notification worker.
 *
 * `drainDelay: 60_000` — when the queue is empty, wait 60s before polling
 * again. This keeps Upstash free-tier command usage (~1,440/day idle) manageable.
 * Switch to a lower value (e.g. 5_000) when using local Redis.
 */
export function createNotificationWorker(): Worker {
    const isLocal = !!process.env.REDIS_LOCAL_URL;
    // Upstash Serverless Redis charges for blocking commands per sleep interval.
    // To fit within the 500k/month free tier, we must dramatically increase drainDelay 
    // and stalledInterval. This delays notification processing when the queue is empty
    // but saves massive amounts of Redis requests (from ~90k/day down to < 5k/day).
    const drainDelay = isLocal ? 1_000 : 300_000; // Local = 1s, Upstash = 5 minutes
    const stalledInterval = isLocal ? 30_000 : 300_000; // Local = 30s, Upstash = 5 minutes

    worker = new Worker(
        NOTIFICATION_QUEUE_NAME,
        async (job: Job) => {
            console.log(`[NotificationWorker] Processing job ${job.id} (${job.name})`);

            switch (job.name as NotificationJobName | 'check-new-chapters') {
                case 'comment-reply':
                    await handleCommentReply(job.data as NotificationJobMap['comment-reply']);
                    break;

                case 'new-chapter':
                    await handleNewChapter(job.data as NotificationJobMap['new-chapter']);
                    break;

                case 'system':
                    await handleSystemNotification(job.data as NotificationJobMap['system']);
                    break;

                case 'check-new-chapters':
                    await checkNewChapters();
                    break;

                default:
                    console.warn(`[NotificationWorker] Unknown job name: ${job.name}`);
            }
        },
        {
            connection: bullmqConnection,
            concurrency: 5,
            drainDelay,
            stalledInterval,
            metrics: { maxDataPoints: 0 },
        },
    );

    worker.on('completed', (job) => {
        if (job) {
            console.log(`[NotificationWorker] Job ${job.id} completed (${job.name})`);
        }
    });

    worker.on('failed', (job, error) => {
        console.error(`[NotificationWorker] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('[NotificationWorker] Worker error:', error.message);
    });

    console.log(`[BullMQ] Notification worker started (drainDelay: ${drainDelay}ms)`);
    return worker;
}

export async function closeNotificationWorker(): Promise<void> {
    if (worker) {
        await worker.close();
        worker = null;
        console.log('[BullMQ] Notification worker closed');
    }
}

// ──────────────────────────────────────────────
// Job Handlers
// ──────────────────────────────────────────────

async function handleCommentReply(
    data: NotificationJobMap['comment-reply'],
): Promise<void> {
    const { targetUserId, replyUserId, mangaId, commentId, parentCommentId, chapterId } = data;

    // Belt-and-suspenders: skip self-reply (also checked in producer)
    if (targetUserId === replyUserId) {
        console.log(`[NotificationWorker] Skipping self-reply for user ${targetUserId}`);
        return;
    }

    // Lookup the replying user's display name
    const replyUser = await prisma.user.findUnique({
        where: { id: replyUserId },
        select: { displayName: true },
    });

    const displayName = replyUser?.displayName || 'Someone';

    // Persist notification to DB
    const notification = await NotificationService.createNotification({
        userId: targetUserId,
        type: 'COMMENT_REPLY',
        title: 'New Reply',
        message: `${displayName} replied to your comment`,
        payload: { mangaId, commentId, parentCommentId, chapterId, replyUserId },
    });

    // Emit real-time notification via Socket.IO
    emitToUser(targetUserId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        payload: notification.payload,
        read: notification.read,
        createdAt: notification.createdAt,
    });
}

async function handleNewChapter(
    data: NotificationJobMap['new-chapter'],
): Promise<void> {
    const { targetUserId, mangaId, mangaTitle, chapterId, chapterNumber } = data;

    const chapterLabel = chapterNumber ? `Ch.${chapterNumber}` : 'New chapter';
    const message = `${mangaTitle} — ${chapterLabel}`;

    const notification = await NotificationService.createNotification({
        userId: targetUserId,
        type: 'NEW_CHAPTER',
        title: 'New Chapter',
        message,
        payload: { mangaId, chapterId, chapterNumber },
    });

    emitToUser(targetUserId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        payload: notification.payload,
        read: notification.read,
        createdAt: notification.createdAt,
    });
}

async function handleSystemNotification(
    data: NotificationJobMap['system'],
): Promise<void> {
    const { message, targetUserIds } = data;

    // Determine recipient list
    let userIds: string[];

    if (targetUserIds === 'all') {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true },
        });
        userIds = users.map((u: { id: string }) => u.id);
    } else {
        userIds = targetUserIds;
    }

    // Create notifications in batch (one per user)
    for (const userId of userIds) {
        const notification = await NotificationService.createNotification({
            userId,
            type: 'SYSTEM',
            title: 'System',
            message,
            payload: {},
        });

        emitToUser(userId, 'notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            payload: notification.payload,
            read: notification.read,
            createdAt: notification.createdAt,
        });
    }

    console.log(`[NotificationWorker] System notification sent to ${userIds.length} users`);
}