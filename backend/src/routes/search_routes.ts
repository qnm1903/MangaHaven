import { Router, Request, Response } from 'express';
import searchController from '../controllers/search_controller';
import {
  advancedSearchLimiter,
  quickSearchLimiter,
  autocompleteSearchLimiter,
} from '../middlewares/rate_limit';

const router = Router();

// Advanced search with all filters
router.get('/manga', advancedSearchLimiter, (req: Request, res: Response) => searchController.advancedSearch(req, res));

// Quick search for search bar dropdown (top 5 results)
router.get('/quick', quickSearchLimiter, (req: Request, res: Response) => searchController.quickSearch(req, res));

// Autocomplete endpoints
router.get('/authors', autocompleteSearchLimiter, (req: Request, res: Response) => searchController.searchAuthors(req, res));
router.get('/groups', autocompleteSearchLimiter, (req: Request, res: Response) => searchController.searchGroups(req, res));

export default router;