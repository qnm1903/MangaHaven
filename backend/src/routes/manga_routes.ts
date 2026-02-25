import { Router } from 'express';
import mangaController from '../controllers/manga_controller';
import { optionalAuth } from '../middlewares/auth_middleware';

const router = Router();

// Public routes
router.get('/search', mangaController.searchManga);
router.get('/popular', mangaController.getPopularManga);
router.get('/popular-new', mangaController.getPopularNewTitles);
router.get('/latest', mangaController.getLatestManga);
router.get('/latest-chapters', mangaController.getLatestChapters);
router.get('/tags', mangaController.getTags);
router.get('/random', mangaController.getRandomManga);
router.get('/chapter/:id', mangaController.getChapter);
router.get('/at-home/server/:id', mangaController.getChapterPages);
router.get('/:id', optionalAuth, mangaController.getMangaById);
router.get('/:id/feed', mangaController.getMangaFeed);

export default router;
