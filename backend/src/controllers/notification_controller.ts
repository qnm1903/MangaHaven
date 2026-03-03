import { Request, Response } from 'express';
import { NotificationService } from '../services/notification_service';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { cursor, limit } = req.query;

        const result = await NotificationService.getUserNotifications(userId, {
            cursor: cursor as string,
            limit: limit ? Number(limit) : undefined,
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const count = await NotificationService.getUnreadCount(userId);

        res.json({ success: true, data: { count } });
    } catch (error: any) {
        console.error('Get unread count error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const notification = await NotificationService.markAsRead(userId, id);
        res.json({ success: true, data: notification });
    } catch (error: any) {
        if (error.message === 'Notification not found') {
            res.status(404).json({ success: false, message: error.message });
            return;
        }
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const result = await NotificationService.markAllAsRead(userId);

        res.json({ success: true, data: { updated: result.count } });
    } catch (error: any) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        await NotificationService.deleteNotification(userId, id);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
        if (error.message === 'Notification not found') {
            res.status(404).json({ success: false, message: error.message });
            return;
        }
        console.error('Delete notification error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};