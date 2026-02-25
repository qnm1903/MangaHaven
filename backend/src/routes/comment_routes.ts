import { Router } from 'express';
import * as CommentController from '../controllers/comment_controller';
import { authenticateToken } from '../middlewares/auth_middleware';
import { createCommentLimiter, mutateCommentLimiter } from '../middlewares/rate_limit';

const router = Router();

// Public routes
router.get('/latest', CommentController.getLatestComments);
router.get('/:mangaId', CommentController.getComments); // Get series comments
router.get('/:mangaId/chapter/:chapterId', CommentController.getComments); // Get chapter comments
router.get('/replies/:commentId', CommentController.getReplies);

// Protected routes
router.post('/', authenticateToken, createCommentLimiter, CommentController.createComment);
router.put('/:commentId', authenticateToken, mutateCommentLimiter, CommentController.updateComment);
router.delete('/:commentId', authenticateToken, mutateCommentLimiter, CommentController.deleteComment);

export default router;