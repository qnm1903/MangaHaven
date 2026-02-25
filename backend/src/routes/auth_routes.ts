import express from 'express';
import { AuthController } from '../controllers/auth_controller';
import { authenticateToken, requireAuth } from '../middlewares/auth_middleware';
import {
  loginLimiter,
  registerLimiter,
  refreshTokenLimiter,
  googleAuthLimiter,
} from '../middlewares/rate_limit';

const router = express.Router();

// Public routes
router.post('/register', registerLimiter, AuthController.register);
router.post('/login', loginLimiter, AuthController.login);
router.post('/refresh-token', refreshTokenLimiter, AuthController.refreshToken);

// Google OAuth routes
router.post('/google-login', googleAuthLimiter, AuthController.googleLogin);
router.post('/google-access-token', googleAuthLimiter, AuthController.googleAuthWithAccessToken);

// Protected routes
router.post('/logout', authenticateToken, AuthController.logout);

export default router;