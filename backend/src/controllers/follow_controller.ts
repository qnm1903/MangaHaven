import { Request, Response } from 'express';
import { FollowService, MangaSource } from '../services/follow_service';
import { HttpException } from '../exceptions/http_exception';
import { MangaDexClient } from '../services/mangadex_client';

const mangadexClient = new MangaDexClient();

/** Wrap async controller handlers to forward errors to Express error middleware */
const asyncHandler =
    (fn: (req: Request, res: Response) => Promise<void>) =>
        (req: Request, res: Response, next: (err: unknown) => void) =>
            fn(req, res).catch(next);

export class FollowController {
    /** POST /api/v1/follows — Follow a manga */
    static followManga = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.userId!;
        const { mangaId, source } = req.body as { mangaId: string; source: MangaSource };

        if (!mangaId || !source) {
            res.status(400).json({ success: false, message: 'mangaId and source are required' });
            return;
        }
        if (!['MANGADEX', 'LOCAL'].includes(source)) {
            res.status(400).json({ success: false, message: 'source must be MANGADEX or LOCAL' });
            return;
        }

        const follow = await FollowService.followManga(userId, mangaId, source);
        res.status(201).json({ success: true, data: follow });
    });

    /** DELETE /api/v1/follows — Unfollow a manga */
    static unfollowManga = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.userId!;
        const { mangaId, source } = req.body as { mangaId: string; source: MangaSource };

        if (!mangaId || !source) {
            res.status(400).json({ success: false, message: 'mangaId and source are required' });
            return;
        }

        await FollowService.unfollowManga(userId, mangaId, source);
        res.status(200).json({ success: true, message: 'Unfollowed successfully' });
    });

    /** GET /api/v1/follows — Get user's followed manga */
    static getUserFollows = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.userId!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await FollowService.getUserFollows(userId, { page, limit });

        // Enrich MangaDex follows with metadata (title, cover) from MangaDex API
        const mangadexFollows = result.data.filter(
            (f: any) => f.mangaSource === 'MANGADEX' && f.externalMangaId && !f.manga
        );

        if (mangadexFollows.length > 0) {
            try {
                const ids = mangadexFollows.map((f: any) => f.externalMangaId);
                const mangaData = await mangadexClient.getMultipleMangaById(ids, ['cover_art']);
                const mangaMap = new Map<string, any>();
                for (const m of mangaData?.data ?? []) {
                    const title = m.attributes?.title?.en
                        ?? Object.values(m.attributes?.title ?? {})[0]
                        ?? 'Unknown';
                    const coverRel = m.relationships?.find((r: any) => r.type === 'cover_art');
                    const fileName = coverRel?.attributes?.fileName;
                    const coverUrl = fileName
                        ? `https://uploads.mangadex.org/covers/${m.id}/${fileName}.256.jpg`
                        : null;
                    mangaMap.set(m.id, { title, status: m.attributes?.status ?? 'unknown', coverUrl });
                }
                // Attach metadata to follows
                for (const f of result.data as any[]) {
                    if (f.mangaSource === 'MANGADEX' && f.externalMangaId && !f.manga) {
                        const meta = mangaMap.get(f.externalMangaId);
                        if (meta) {
                            f.manga = { title: meta.title, status: meta.status, coverUrl: meta.coverUrl };
                        }
                    }
                }
            } catch {
                // Silently ignore — show raw IDs if MangaDex is down
            }
        }

        res.status(200).json({ success: true, ...result });
    });

    /** GET /api/v1/follows/status?mangaId=&source= — Check follow status */
    static checkFollowStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.userId!;
        const { mangaId, source } = req.query as { mangaId: string; source: MangaSource };

        if (!mangaId || !source) {
            res.status(400).json({ success: false, message: 'mangaId and source are required' });
            return;
        }

        const result = await FollowService.isFollowing(userId, mangaId, source);
        res.status(200).json({ success: true, ...result });
    });

    /** GET /api/v1/follows/feed — Latest chapter updates from followed manga */
    static getFollowedMangaFeed = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const userId = req.userId!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const dateRange = req.query.dateRange as 'today' | 'week' | 'month' | undefined;
        const translatedLanguage = req.query.lang
            ? (req.query.lang as string).split(',')
            : undefined;

        const result = await FollowService.getFollowedMangaFeed(userId, {
            page,
            limit,
            dateRange,
            translatedLanguage,
        });
        res.status(200).json({ success: true, ...result });
    });
}