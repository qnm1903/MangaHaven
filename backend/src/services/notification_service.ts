import prisma from '../db/prisma';
import type { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    payload?: Record<string, unknown>;
    scheduledAt?: Date;
}

interface PaginationOptions {
    cursor?: string;
    limit?: number;
}

// Service
export class NotificationService {
    /**
     * Create a new notification record.
     * Called by the BullMQ worker after processing a job.
     */
    static async createNotification(input: CreateNotificationInput) {
        return prisma.notification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                payload: input.payload as Prisma.InputJsonValue ?? undefined,
                scheduledAt: input.scheduledAt,
            },
        });
    }

    /**
     * Get paginated notifications for a user (newest first).
     */
    static async getUserNotifications(userId: string, options: PaginationOptions = {}) {
        const limit = options.limit || 20;

        const notifications = await prisma.notification.findMany({
            where: { userId },
            take: limit + 1,
            cursor: options.cursor ? { id: options.cursor } : undefined,
            orderBy: { createdAt: 'desc' },
        });

        let nextCursor: string | undefined;
        if (notifications.length > limit) {
            const next = notifications.pop();
            nextCursor = next?.id;
        }

        return { notifications, nextCursor };
    }

    /**
     * Count unread notifications for badge display.
     */
    static async getUnreadCount(userId: string): Promise<number> {
        return prisma.notification.count({
            where: { userId, read: false },
        });
    }

    /**
     * Mark a single notification as read.
     * Only the owner can mark their own notifications.
     */
    static async markAsRead(userId: string, notificationId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });
    }

    /**
     * Mark all unread notifications as read for a user.
     */
    static async markAllAsRead(userId: string) {
        return prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }

    /**
     * Delete a single notification.
     * Only the owner can delete their own notifications.
     */
    static async deleteNotification(userId: string, notificationId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return prisma.notification.delete({
            where: { id: notificationId },
        });
    }
}