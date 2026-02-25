import { Router } from 'express';
import { adminGuard } from '../middlewares/admin_guard';
import { AdminController } from '../controllers/admin_controller';
import { adminLimiter } from '../middlewares/rate_limit';

const router = Router();

// Apply admin guard + rate limit to all routes
router.use(...adminGuard);
router.use(adminLimiter);

// Dashboard
router.get('/dashboard/summary', AdminController.getDashboardSummary);

// User management
router.get('/users/search', AdminController.searchUsersByEmail);
router.post('/users/block', AdminController.blockUser);
router.post('/users/unblock', AdminController.unblockUser);

export default router;