import { Router } from 'express';
import { FollowController } from '../controllers/follow_controller';
import { authenticateToken } from '../middlewares/auth_middleware';

const router = Router();

router.use(authenticateToken);

// POST   /api/v1/follows              — Follow a manga
router.post('/', FollowController.followManga);

// DELETE /api/v1/follows              — Unfollow a manga
router.delete('/', FollowController.unfollowManga);

// GET    /api/v1/follows/status       — Check follow status
router.get('/status', FollowController.checkFollowStatus);

// GET    /api/v1/follows/feed         — Latest chapter feed
router.get('/feed', FollowController.getFollowedMangaFeed);

// GET    /api/v1/follows              — Get user's follows
router.get('/', FollowController.getUserFollows);

export default router;