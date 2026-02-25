import { Router } from 'express';
import { UserController } from '../controllers/user_controller';
import { authenticateToken } from '../middlewares/auth_middleware';
import { upload } from '../services/upload_service';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Profile routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/password', UserController.updatePassword);

// Avatar routes
router.post('/avatar', upload.single('avatar'), UserController.uploadAvatar);
router.delete('/avatar', UserController.removeAvatar);

export default router;
