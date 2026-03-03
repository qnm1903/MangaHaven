import { notificationQueue } from './notification/notification_queue';
import {
    createNotificationWorker,
    closeNotificationWorker,
} from './notification/notification_worker';

/**
 * Initialize all BullMQ queues and workers.
 * Called once from server.ts during startup.
 */
export async function initQueues(): Promise<void> {
    try {
        // Start the notification worker
        createNotificationWorker();

        console.log('[BullMQ] All queues initialized');
    } catch (error) {
        console.error('[BullMQ] Failed to initialize queues:', error);
        // Don't crash the server — app continues without queues
    }
}

/**
 * Gracefully close all queues and workers.
 * Called from server.ts during shutdown.
 */
export async function closeQueues(): Promise<void> {
    try {
        await closeNotificationWorker();
        await notificationQueue.close();
        console.log('[BullMQ] All queues closed');
    } catch (error) {
        console.error('[BullMQ] Error closing queues:', error);
    }
}