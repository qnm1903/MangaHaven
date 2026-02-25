import { Router, Request, Response } from 'express';
import authorController from '../controllers/author_controller';

const router = Router();

// Get MangaDex author by ID
router.get('/:authorId', (req: Request, res: Response) => authorController.getAuthor(req, res));

// Get manga list by author
router.get('/:authorId/manga', (req: Request, res: Response) => authorController.getAuthorManga(req, res));

export default router;
