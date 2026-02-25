import { Request, Response } from 'express';
import { MangaDexClient } from '../services/mangadex_client';
import { FollowService } from '@/services/follow_service';
import StatusCodes from '../constants/status_codes';
import redisClient from '../db/redis_client';

const mangaDexClient = new MangaDexClient();

export const mangaController = {
  // Tìm kiếm manga
  async searchManga(req: Request, res: Response) {
    try {
      const {
        title,
        limit = 20,
        offset = 0,
        includedTags,
        excludedTags,
        status,
        originalLanguage,
        contentRating,
        order,
      } = req.query;

      const params = {
        title: title as string,
        limit: Math.min(Number(limit), 50),
        offset: Number(offset),
        includedTags: Array.isArray(includedTags) ? includedTags as string[] : includedTags ? [includedTags as string] : undefined,
        excludedTags: Array.isArray(excludedTags) ? excludedTags as string[] : excludedTags ? [excludedTags as string] : undefined,
        status: Array.isArray(status) ? status as string[] : status ? [status as string] : undefined,
        originalLanguage: Array.isArray(originalLanguage) ? originalLanguage as string[] : originalLanguage ? [originalLanguage as string] : undefined,
        contentRating: Array.isArray(contentRating) ? contentRating as string[] : contentRating ? [contentRating as string] : ['safe', 'suggestive', 'erotica'],
        order: order as Record<string, string>,
      };

      const data = await mangaDexClient.searchManga(params);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true, // Backend luôn cache
      });
    } catch (error: any) {
      console.error('Search manga error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to search manga',
        error: error.message,
      });
    }
  },

  // Lấy manga popular (theo follows)
  async getPopularManga(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, contentRating } = req.query;

      // Optimized parameters for popular manga
      const params = {
        limit: Math.min(Number(limit), 50), // Cap limit at 50 for performance
        offset: Number(offset),
        contentRating: Array.isArray(contentRating) ? contentRating as string[] : contentRating ? [contentRating as string] : ['safe', 'suggestive', 'erotica'],
        order: { followedCount: 'desc' },
        includes: ['cover_art'],
      };

      const data = await mangaDexClient.searchManga(params);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get popular manga error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get popular manga',
        error: error.message,
      });
    }
  },

  // Lấy popular new titles (manga mới + popular, trong 1 tháng)
  async getPopularNewTitles(req: Request, res: Response) {
    try {
      const { limit = 10, contentRating } = req.query;

      // Calculate date 1 month ago
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const params = {
        limit: Math.min(Number(limit), 20),
        offset: 0,
        contentRating: Array.isArray(contentRating) ? contentRating as string[] : contentRating ? [contentRating as string] : ['safe', 'suggestive', 'erotica', 'pornographic'],
        order: { followedCount: 'desc' },
        includes: ['cover_art', 'author', 'artist'],
        createdAtSince: oneMonthAgo.toISOString().split('.')[0], // Format: YYYY-MM-DDTHH:mm:ss
        hasAvailableChapters: 'true',
      };

      const data = await mangaDexClient.searchManga(params);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get popular new titles error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get popular new titles',
        error: error.message,
      });
    }
  },

  // Lấy manga mới nhất (theo latest upload)
  async getLatestManga(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, contentRating, availableTranslatedLanguage } = req.query;

      // Optimized parameters for latest manga
      const langArray = Array.isArray(availableTranslatedLanguage)
        ? availableTranslatedLanguage as string[]
        : availableTranslatedLanguage
          ? [availableTranslatedLanguage as string]
          : undefined;

      const params: Record<string, unknown> = {
        limit: Math.min(Number(limit), 50), // Cap limit at 50 for performance
        offset: Number(offset),
        contentRating: Array.isArray(contentRating) ? contentRating as string[] : contentRating ? [contentRating as string] : ['safe', 'suggestive', 'erotica'],
        order: { createdAt: 'desc' },
        hasAvailableChapters: true,
        includes: ['cover_art', 'author', 'artist'],
        ...(langArray ? { availableTranslatedLanguage: langArray } : {}),
      };

      const data = await mangaDexClient.searchManga(params);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get latest manga error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get latest manga',
        error: error.message,
      });
    }
  },

  // Lấy manga theo ID
  async getMangaById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { includes, includeStatistics } = req.query;

      // Optimized includes for single manga fetch
      const includesArray = Array.isArray(includes)
        ? includes as string[]
        : includes
          ? [includes as string]
          : ['cover_art', 'author', 'artist'];

      // Ensure author and artist are always included
      if (!includesArray.includes('author')) {
        includesArray.push('author');
      }
      if (!includesArray.includes('artist')) {
        includesArray.push('artist');
      }

      const data = await mangaDexClient.getManga(id, includesArray);

      // Fetch statistics only when explicitly requested (skip for lightweight fetches like cover-only)
      if (includeStatistics !== 'false') {
        const statisticsData = await mangaDexClient.getMangaStatistics([id]);
        const statistics = statisticsData?.statistics?.[id] || null;

        // Merge statistics into the manga data
        if (statistics && data.data) {
          data.data.statistics = statistics;
        }
      }

      // If user is authenticated, append isFollowing status (non-blocking)
      let isFollowing = false;
      let followId: string | undefined;
      const userId = req.userId;
      if (userId) {
        try {
          const followStatus = await FollowService.isFollowing(userId, id, 'MANGADEX');
          isFollowing = followStatus.isFollowing;
          followId = followStatus.followId;
        } catch {
          // silently ignore — follow check failure should not break manga detail
        }
      }

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        isFollowing,
        followId,
        cached: true,
      });
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Manga deleted or private on MangaDex (orphan relation) — skip logging to avoid noise.
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Manga not found',
        });
      } else {
        console.error('Get manga by ID error:', error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to get manga',
          error: error.message,
        });
      }
    }
  },

  // Lấy feed (chapters) của manga
  async getMangaFeed(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        limit = 20,
        offset = 0,
        translatedLanguage,
        order,
      } = req.query;

      // Optimized parameters for manga feed
      const params = {
        limit: Math.min(Number(limit), 100), // Cap limit at 100 for performance
        offset: Number(offset),
        translatedLanguage: Array.isArray(translatedLanguage)
          ? translatedLanguage as string[]
          : translatedLanguage
            ? [translatedLanguage as string]
            : undefined,
        order: (order && typeof order === 'object' && !Array.isArray(order))
          ? order as Record<string, string>
          : { chapter: 'desc' },
      };

      const data = await mangaDexClient.getMangaFeed(id, params);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get manga feed error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get manga feed',
        error: error.message,
      });
    }
  },

  // Lấy tất cả tags
  async getTags(req: Request, res: Response) {
    try {
      const data = await mangaDexClient.getTags();

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get tags error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get tags',
        error: error.message,
      });
    }
  },

  // Lấy manga ngẫu nhiên
  async getRandomManga(req: Request, res: Response) {
    try {
      const { includes } = req.query;

      // Optimized includes for random manga
      const includesArray = Array.isArray(includes)
        ? includes as string[]
        : includes
          ? [includes as string]
          : ['cover_art'];

      const data = await mangaDexClient.getRandomManga(includesArray);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: false, // Random không cache
      });
    } catch (error: any) {
      console.error('Get random manga error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get random manga',
        error: error.message,
      });
    }
  },

  // Lấy thông tin chapter
  async getChapter(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { includes } = req.query;

      const includesArray = Array.isArray(includes)
        ? includes as string[]
        : includes
          ? [includes as string]
          : undefined;

      const data = await mangaDexClient.getChapter(id, includesArray);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: true,
      });
    } catch (error: any) {
      console.error('Get chapter error:', error);
      if (error.response?.status === 404) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'Chapter not found',
        });
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to get chapter',
          error: error.message,
        });
      }
    }
  },

  // Lấy danh sách ảnh của chapter (MangaDex@Home)
  async getChapterPages(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const data = await mangaDexClient.getChapterPages(id);

      res.status(StatusCodes.OK).json({
        success: true,
        data,
        cached: false, // Không cache vì baseUrl CDN thay đổi theo thời điểm
      });
    } catch (error: any) {
      console.error('Get chapter pages error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get chapter pages',
        error: error.message,
      });
    }
  },

  // Lấy chapters mới nhất (dùng cho Dashboard)
  async getLatestChapters(req: Request, res: Response) {
    try {
      const { limit = 20, offset = 0, translatedLanguage, contentRating } = req.query;

      const parsedLimit = Math.min(Number(limit), 32);
      const parsedOffset = Number(offset);

      const langArray = Array.isArray(translatedLanguage)
        ? translatedLanguage as string[]
        : translatedLanguage
          ? [translatedLanguage as string]
          : undefined;

      const ratingArray = Array.isArray(contentRating)
        ? contentRating as string[]
        : contentRating
          ? [contentRating as string]
          : ['safe', 'suggestive', 'erotica'];

      const cacheKey = `latest_chapters:${parsedLimit}:${parsedOffset}:${langArray?.join(',') ?? 'all'}:${ratingArray.join(',')}`;

      // Try cache first
      const cached = await redisClient.getClient().get(cacheKey);
      if (cached) {
        res.status(StatusCodes.OK).json(JSON.parse(cached));
        return;
      }

      const chaptersData = await mangaDexClient.getLatestChapters({
        limit: parsedLimit,
        offset: parsedOffset,
        translatedLanguage: langArray,
        contentRating: ratingArray,
      });

      const chapters = chaptersData.data ?? [];

      // Collect unique manga IDs for cover bulk fetch
      const mangaIds: string[] = [
        ...new Set(
          chapters
            .map((ch: any) => ch.relationships?.find((r: any) => r.type === 'manga')?.id)
            .filter(Boolean) as string[]
        ),
      ];

      // Bulk fetch manga covers (/manga?ids[] is capped at 100 per request)
      const coverMap: Record<string, string> = {};
      if (mangaIds.length > 0) {
        try {
          const mangaData = await mangaDexClient.getMultipleMangaById(mangaIds.slice(0, 100), ['cover_art']);
          for (const manga of mangaData.data ?? []) {
            const coverRel = manga.relationships?.find((r: any) => r.type === 'cover_art');
            const fileName = coverRel?.attributes?.fileName;
            if (fileName) {
              coverMap[manga.id] = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.256.jpg`;
            }
          }
        } catch {
          // Non-fatal: cards will show without covers
        }
      }

      // Inject coverUrl into each chapter's manga relationship
      const enrichedChapters = chapters.map((ch: any) => ({
        ...ch,
        relationships: ch.relationships?.map((rel: any) => {
          if (rel.type === 'manga' && coverMap[rel.id]) {
            return { ...rel, attributes: { ...rel.attributes, coverUrl: coverMap[rel.id] } };
          }
          return rel;
        }),
      }));

      const result = {
        success: true,
        data: { ...chaptersData, data: enrichedChapters, limit: parsedLimit },
        cached: false,
      };

      // Cache for 5 minutes
      await redisClient.getClient().setEx(cacheKey, 300, JSON.stringify(result));

      res.status(StatusCodes.OK).json(result);
      return;
    } catch (error: any) {
      console.error('Get latest chapters error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get latest chapters',
        error: error.message,
      });
      return;
    }
  },
};

export default mangaController;