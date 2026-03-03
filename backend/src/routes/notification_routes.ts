import { Router } from 'express';
import * as NotificationController from '../controllers/notification_controller';
import { authenticateToken } from '../middlewares/auth_middleware';

const router = Router();

// All notification routes require authentication
router.use(authenticateToken);

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', NotificationController.markAsRead);
router.patch('/read-all', NotificationController.markAllAsRead);
router.delete('/:id', NotificationController.deleteNotification);

export default router;