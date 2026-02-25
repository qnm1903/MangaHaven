import { Router, Request, Response } from 'express';
import groupController from '../controllers/group_controller';
import { upload } from '../services/upload_service';
import { requireAuth } from '../middlewares/auth_middleware';

const router = Router();

// Get local group by ID
router.get('/local/:groupId', (req: Request, res: Response) => groupController.getLocalGroup(req, res));

// Get MangaDex group by ID
router.get('/mangadex/:groupId', (req: Request, res: Response) => groupController.getMangaDexGroup(req, res));

// Get manga worked on by a MangaDex group
router.get('/mangadex/:groupId/manga', (req: Request, res: Response) => groupController.getMangaDexGroupManga(req, res));

// Upload group logo (requires auth)
router.post(
    '/local/:groupId/logo',
    requireAuth,
    upload.single('logo'),
    (req: Request, res: Response) => groupController.uploadLogo(req, res)
);

// Remove group logo (requires auth)
router.delete(
    '/local/:groupId/logo',
    requireAuth,
    (req: Request, res: Response) => groupController.removeLogo(req, res)
);

export default router;