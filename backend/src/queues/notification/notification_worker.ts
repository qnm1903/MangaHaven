import { Worker, Job } from 'bullmq';
import { bullmqConnection } from '../connection';
import { NOTIFICATION_QUEUE_NAME } from './notification_queue';
import { NotificationService } from '../../services/notification_service';
import { emitToUser } from '../../services/socket_service';
import prisma from '../../db/prisma';
import type { NotificationJobMap, NotificationJobName } from './notification_types';

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
    const drainDelay = isLocal ? 5_000 : 60_000; // Local = 5s, Upstash = 60s

    worker = new Worker(
        NOTIFICATION_QUEUE_NAME,
        async (job: Job) => {
            console.log(`[NotificationWorker] Processing job ${job.id} (${job.name})`);

            switch (job.name as NotificationJobName) {
                case 'comment-reply':
                    await handleCommentReply(job.data as NotificationJobMap['comment-reply']);
                    break;

                // Phase 2 handlers — uncomment when ready
                // case 'new-chapter':
                //     await handleNewChapter(job.data);
                //     break;
                // case 'group-upload':
                //     await handleGroupUpload(job.data);
                //     break;
                // case 'system':
                //     await handleSystem(job.data);
                //     break;

                default:
                    console.warn(`[NotificationWorker] Unknown job name: ${job.name}`);
            }
        },
        {
            connection: bullmqConnection,
            concurrency: 5,
            drainDelay,
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