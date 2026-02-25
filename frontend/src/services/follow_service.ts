import { z } from 'zod';
import api from '@/lib/axios';
import { AxiosError } from 'axios';

// Schemas

const MangaSourceSchema = z.enum(['MANGADEX', 'LOCAL']);

const FollowedMangaSchema = z.object({
    id: z.string(),
    userId: z.string(),
    mangaId: z.string().nullable(),
    externalMangaId: z.string().nullable(),
    mangaSource: MangaSourceSchema,
    createdAt: z.string(),
    manga: z
        .object({
            id: z.string().optional(),
            title: z.string(),
            coverPublicId: z.string().nullable().optional(),
            coverUrl: z.string().nullable().optional(),
            status: z.string(),
        })
        .nullable()
        .optional(),
});

const ChapterFeedItemSchema = z.object({
    chapterId: z.string(),
    chapterNumber: z.string().nullable(),
    volume: z.string().nullable().optional(),
    title: z.string().nullable(),
    publishAt: z.string(),
    readableAt: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    mangaId: z.string(),
    mangaTitle: z.string(),
    coverUrl: z.string().nullable(),
    translatedLanguage: z.string().nullable().optional(),
    scanlationGroup: z.string().nullable().optional(),
    scanlationGroupId: z.string().nullable().optional(),
    scanlationGroups: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
    commentCount: z.number().optional(),
    source: z.literal('MANGADEX'),
});

const PaginatedFollowSchema = z.object({
    success: z.boolean(),
    data: z.array(FollowedMangaSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
});

const ChapterFeedResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(ChapterFeedItemSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
});

const FollowStatusSchema = z.object({
    success: z.boolean(),
    isFollowing: z.boolean(),
    followId: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

export type MangaSource = z.infer<typeof MangaSourceSchema>;
export type FollowedManga = z.infer<typeof FollowedMangaSchema>;
export type ChapterFeedItem = z.infer<typeof ChapterFeedItemSchema>;
export type PaginatedFollowResponse = z.infer<typeof PaginatedFollowSchema>;
export type ChapterFeedResponse = z.infer<typeof ChapterFeedResponseSchema>;
export type FollowStatusResponse = z.infer<typeof FollowStatusSchema>;

export interface FeedParams {
    page?: number;
    limit?: number;
    dateRange?: 'today' | 'week' | 'month';
    lang?: string; // comma-separated, e.g. "en,vi"
}

// ============================================================================
// Error helper
// ============================================================================

function handleError(error: unknown): never {
    if (error instanceof AxiosError) {
        const msg =
            (error.response?.data as { message?: string })?.message ?? error.message;
        throw new Error(msg);
    }
    if (error instanceof Error) throw error;
    throw new Error('An unexpected error occurred');
}

// ============================================================================
// Follow Service
// ============================================================================

export const followService = {
    /** Follow a manga */
    async followManga(mangaId: string, source: MangaSource): Promise<void> {
        try {
            await api.post('/api/v1/follows', { mangaId, source });
        } catch (error) {
            handleError(error);
        }
    },

    /** Unfollow a manga */
    async unfollowManga(mangaId: string, source: MangaSource): Promise<void> {
        try {
            await api.delete('/api/v1/follows', { data: { mangaId, source } });
        } catch (error) {
            handleError(error);
        }
    },

    /** Get user's followed manga list, paginated */
    async getUserFollows(params?: {
        page?: number;
        limit?: number;
    }): Promise<PaginatedFollowResponse> {
        try {
            const response = await api.get('/api/v1/follows', { params });
            return PaginatedFollowSchema.parse(response.data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[FollowService] getUserFollows validation error:', error.flatten());
                throw new Error('Unexpected response format from server');
            }
            handleError(error);
        }
    },

    /** Check if the authenticated user is following a specific manga */
    async checkFollowStatus(
        mangaId: string,
        source: MangaSource,
    ): Promise<FollowStatusResponse> {
        try {
            const response = await api.get('/api/v1/follows/status', {
                params: { mangaId, source },
            });
            return FollowStatusSchema.parse(response.data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[FollowService] checkFollowStatus validation error:', error.flatten());
                throw new Error('Unexpected response format from server');
            }
            handleError(error);
        }
    },

    /** Get latest chapter feed from all followed manga */
    async getFollowedMangaFeed(params?: FeedParams): Promise<ChapterFeedResponse> {
        try {
            const response = await api.get('/api/v1/follows/feed', { params });
            return ChapterFeedResponseSchema.parse(response.data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                console.error('[FollowService] getFollowedMangaFeed validation error:', error.flatten());
                throw new Error('Unexpected response format from server');
            }
            handleError(error);
        }
    },
};

export default followService;