import prisma from '../db/prisma';
import { MangaDexClient } from './mangadex_client';
import { HttpException } from '../exceptions/http_exception';
import redisClient from '../db/redis_client';

const mangadexClient = new MangaDexClient();

// How long (seconds) the full sorted chapter list is cached per user+filters
const FEED_CACHE_TTL = 5 * 60; // 5 minutes

// Deterministic Redis key for a user feed cache
function buildFeedCacheKey(
    userId: string,
    dateRange?: FeedParams['dateRange'],
    lang?: string[]
): string {
    const langKey = lang?.sort().join(',') ?? 'all';
    const rangeKey = dateRange ?? 'all';
    return `feed_v3:${userId}:${rangeKey}:${langKey}`;
}

// Delete all feed cache keys for a user
async function invalidateUserFeedCache(userId: string): Promise<void> {
    try {
        const redis = redisClient.getClient();
        // Scan for all keys matching feed_v3:{userId}:* and delete them
        let cursor = '0';
        do {
            const reply = await redis.scan(cursor, { MATCH: `feed_v3:${userId}:*`, COUNT: 50 });
            cursor = String(reply.cursor);
            if (reply.keys.length > 0) {
                await redis.del(reply.keys);
            }
        } while (cursor !== '0');
    } catch {
        // Redis errors must not break the main flow
    }
}

// Types

export type MangaSource = 'MANGADEX' | 'LOCAL';

export interface FollowResult {
    id: string;
    userId: string;
    mangaId: string | null;
    externalMangaId: string | null;
    mangaSource: MangaSource;
    createdAt: Date;
}

export interface PaginationOptions {
    page?: number;
    limit?: number;
}

export interface FeedParams extends PaginationOptions {
    translatedLanguage?: string[];
    /** Filter: 'today' | 'week' | 'month' | undefined (all time) */
    dateRange?: 'today' | 'week' | 'month';
}

export interface ChapterFeedItem {
    chapterId: string;
    chapterNumber: string | null;
    volume: string | null;
    title: string | null;
    publishAt: string;
    readableAt: string | null;
    externalUrl: string | null;
    mangaId: string;
    mangaTitle: string;
    coverUrl: string | null;
    translatedLanguage: string | null;
    scanlationGroup: string | null;
    scanlationGroupId: string | null;
    scanlationGroups: Array<{ id: string; name: string }>;
    commentCount: number;
    source: 'MANGADEX';
}

export interface ChapterFeedResult {
    data: ChapterFeedItem[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
}

// Helper

function buildWhereBySource(
    userId: string,
    mangaIdentifier: string,
    source: MangaSource
) {
    if (source === 'MANGADEX') {
        return { userId, externalMangaId: mangaIdentifier };
    }
    return { userId, mangaId: mangaIdentifier };
}

function getPublishedAfter(dateRange?: FeedParams['dateRange']): Date {
    const now = new Date();
    if (dateRange === 'today') {
        now.setHours(0, 0, 0, 0);
        return now;
    }
    if (dateRange === 'week') {
        now.setDate(now.getDate() - 7);
        return now;
    }
    if (dateRange === 'month') {
        now.setMonth(now.getMonth() - 1);
        return now;
    }
    // Default safety: last 6 months — prevents fetching entire chapter history
    now.setMonth(now.getMonth() - 6);
    return now;
}

// Service

export class FollowService {
    /**
     * Follow a manga.
     * - source === 'LOCAL'    → set mangaId, externalMangaId = null
     * - source === 'MANGADEX' → set externalMangaId, mangaId = null
     */
    static async followManga(
        userId: string,
        mangaIdentifier: string,
        source: MangaSource
    ): Promise<FollowResult> {
        // Check duplicate
        const existing = await this.findFollow(userId, mangaIdentifier, source);
        if (existing) {
            throw new HttpException(409, 'Already following this manga');
        }

        if (source === 'LOCAL') {
            // Verify local manga exists
            const manga = await prisma.submittedManga.findUnique({
                where: { id: mangaIdentifier },
                select: { id: true },
            });
            if (!manga) throw new HttpException(404, 'Local manga not found');
        }

        const data =
            source === 'MANGADEX'
                ? {
                    userId,
                    externalMangaId: mangaIdentifier,
                    mangaId: null,
                    mangaSource: 'MANGADEX' as const,
                }
                : {
                    userId,
                    mangaId: mangaIdentifier,
                    externalMangaId: null,
                    mangaSource: 'LOCAL' as const,
                };

        const favorite = await prisma.favorite.create({ data });

        // Invalidate feed cache — the list of followed manga changed
        await invalidateUserFeedCache(userId);

        return favorite as FollowResult;
    }

    /**
     * Unfollow by favoriteId (or by mangaIdentifier + source).
     */
    static async unfollowManga(
        userId: string,
        mangaIdentifier: string,
        source: MangaSource
    ): Promise<void> {
        const existing = await this.findFollow(userId, mangaIdentifier, source);
        if (!existing) {
            throw new HttpException(404, 'Follow record not found');
        }

        await prisma.favorite.delete({ where: { id: existing.id } });

        // Invalidate feed cache — the list of followed manga changed
        await invalidateUserFeedCache(userId);
    }

    /** Check if a user is following a specific manga */
    static async isFollowing(
        userId: string,
        mangaIdentifier: string,
        source: MangaSource
    ): Promise<{ isFollowing: boolean; followId?: string }> {
        const record = await this.findFollow(userId, mangaIdentifier, source);
        return record
            ? { isFollowing: true, followId: record.id }
            : { isFollowing: false };
    }

    /** Get all follows for a user, paginated */
    static async getUserFollows(
        userId: string,
        options: PaginationOptions = {}
    ) {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(50, options.limit ?? 20);
        const skip = (page - 1) * limit;

        const [data, total] = await prisma.$transaction([
            prisma.favorite.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    manga: {
                        select: {
                            id: true,
                            title: true,
                            coverPublicId: true,
                            status: true,
                        },
                    },
                },
            }),
            prisma.favorite.count({ where: { userId } }),
        ]);

        return { data, total, page, limit, hasMore: skip + data.length < total };
    }

    /**
     * Get latest chapter feed from all followed MangaDex manga.
     * Uses a single batched request (GET /chapter?manga[]=...) to respect rate limits.
     * Local manga feed is not yet supported (no chapter polling for local uploads).
     */
    static async getFollowedMangaFeed(
        userId: string,
        params: FeedParams = {}
    ): Promise<ChapterFeedResult> {
        const page = Math.max(1, params.page ?? 1);
        const limit = Math.min(100, params.limit ?? 20);
        const offset = (page - 1) * limit;

        // 1. Try to serve from Redis cache
        const cacheKey = buildFeedCacheKey(userId, params.dateRange, params.translatedLanguage);
        let allChapters: ChapterFeedItem[] | null = null;

        if (redisClient.isReady()) {
            try {
                const cached = await redisClient.getClient().get(cacheKey);
                if (cached) {
                    allChapters = JSON.parse(cached) as ChapterFeedItem[];
                }
            } catch {
                // Cache read failed — fall through to MangaDex fetch
            }
        }

        // 2. Cache miss: fetch from MangaDex
        if (!allChapters) {
            const allMangadexFollows = await prisma.favorite.findMany({
                where: { userId, mangaSource: 'MANGADEX' },
                select: { externalMangaId: true },
            });

            if (allMangadexFollows.length === 0) {
                return { data: [], total: 0, page, limit, hasMore: false };
            }

            const mangadexIds = allMangadexFollows
                .map((f: { externalMangaId: string | null }) => f.externalMangaId!)
                .filter(Boolean);

            const publishedAfter = getPublishedAfter(params.dateRange);
            allChapters = [];

            // Pre-fetch cover art for all followed manga in one bulk request.
            // MangaDex /manga/{id}/feed does NOT nest cover_art inside manga relationships,
            // so we must fetch covers separately via GET /manga?ids[]=...&includes[]=cover_art.
            const coverMap: Record<string, string> = {};
            try {
                const IDS_PER_BATCH = 100;
                for (let ci = 0; ci < mangadexIds.length; ci += IDS_PER_BATCH) {
                    const coverBatch = mangadexIds.slice(ci, ci + IDS_PER_BATCH);
                    const mangaData = await mangadexClient.getMultipleMangaById(coverBatch, ['cover_art']);
                    for (const manga of mangaData.data ?? []) {
                        const coverRel = manga.relationships?.find((r: any) => r.type === 'cover_art');
                        const fileName = coverRel?.attributes?.fileName;
                        if (fileName) {
                            coverMap[manga.id] = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.256.jpg`;
                        }
                    }
                }
            } catch {
                // Non-fatal: chapters will render without covers
            }

            // Fetch chapters per manga using /manga/{id}/feed (correct MangaDex endpoint).
            // Process in parallel batches of 5 to respect rate limits.
            const CONCURRENCY = 5;
            for (let i = 0; i < mangadexIds.length; i += CONCURRENCY) {
                if (i > 0) await new Promise((r) => setTimeout(r, 300));

                const batch = mangadexIds.slice(i, i + CONCURRENCY);
                const results = await Promise.allSettled(
                    batch.map((mangaId: string) =>
                        mangadexClient.getChaptersForManga(mangaId, {
                            limit: 500,
                            offset: 0,
                            translatedLanguage: params.translatedLanguage,
                            // MangaDex accepts: YYYY-MM-DDTHH:mm:ss - ISO without ms and z
                            createdAtSince: publishedAfter?.toISOString().slice(0, 19),
                            order: { createdAt: 'desc' },
                            includes: ['manga', 'scanlation_group'],
                        })
                    )
                );

                for (const result of results) {
                    if (result.status !== 'fulfilled' || !result.value?.data) continue;
                    const chapters = result.value.data.map((ch: any) => {
                        const mangaRel = ch.relationships?.find((r: any) => r.type === 'manga');
                        const groupRel = ch.relationships?.find((r: any) => r.type === 'scanlation_group');
                        const groupRels = (ch.relationships ?? []).filter((r: any) => r.type === 'scanlation_group');
                        const title =
                            mangaRel?.attributes?.title?.en ??
                            Object.values(mangaRel?.attributes?.title ?? {})[0] ??
                            'Unknown';
                        const resolvedMangaId = mangaRel?.id ?? '';
                        const coverUrl = coverMap[resolvedMangaId] ?? null;
                        const scanlationGroup = groupRel?.attributes?.name ?? null;
                        const scanlationGroupId = groupRel?.id ?? null;
                        const scanlationGroups = groupRels
                            .map((r: any) => ({ id: r.id, name: r.attributes?.name ?? '' }))
                            .filter((g: any) => g.name);

                        return {
                            chapterId: ch.id,
                            chapterNumber: ch.attributes?.chapter ?? null,
                            volume: ch.attributes?.volume ?? null,
                            title: ch.attributes?.title ?? null,
                            publishAt: ch.attributes?.publishAt,
                            readableAt: ch.attributes?.readableAt ?? null,
                            externalUrl: ch.attributes?.externalUrl ?? null,
                            mangaId: resolvedMangaId,
                            mangaTitle: title as string,
                            coverUrl,
                            translatedLanguage: ch.attributes?.translatedLanguage ?? null,
                            scanlationGroup,
                            scanlationGroupId,
                            scanlationGroups,
                            commentCount: 0,
                            source: 'MANGADEX' as const,
                        } satisfies ChapterFeedItem;
                    });
                    allChapters!.push(...chapters);
                }
            }

            // Sort once after all batches
            allChapters.sort(
                (a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
            );

            // Enrich with comment counts from our DB
            const chapterIds = allChapters.map((c) => c.chapterId);
            if (chapterIds.length > 0) {
                const counts = await prisma.comment.groupBy({
                    by: ['chapterId'],
                    where: { chapterId: { in: chapterIds } },
                    _count: { id: true },
                });
                const countMap: Record<string, number> = {};
                for (const row of counts) {
                    if (row.chapterId) countMap[row.chapterId] = row._count.id;
                }
                allChapters = allChapters.map((ch) => ({
                    ...ch,
                    commentCount: countMap[ch.chapterId] ?? 0,
                }));
            }

            // Store in Redis
            if (redisClient.isReady()) {
                redisClient
                    .getClient()
                    .set(cacheKey, JSON.stringify(allChapters), { EX: FEED_CACHE_TTL })
                    .catch((err: unknown) => {
                        console.warn('[FeedCache] Failed to write to Redis:', (err as Error).message);
                    });
            }
        }

        // 3. Paginate from sorted array
        const total = allChapters.length;
        const paged = allChapters.slice(offset, offset + limit);

        return { data: paged, total, page, limit, hasMore: offset + paged.length < total };
    }

    // Private helpers

    private static async findFollow(
        userId: string,
        mangaIdentifier: string,
        source: MangaSource
    ) {
        const where = buildWhereBySource(userId, mangaIdentifier, source);
        return prisma.favorite.findFirst({ where });
    }
}