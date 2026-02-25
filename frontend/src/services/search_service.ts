import { z } from 'zod';
import api from '../lib/axios';
import { AxiosError } from 'axios';
import type { MangaList, Tag, BackendResponse } from './manga_service';

// Author schema
const AuthorSchema = z.object({
    id: z.string(),
    type: z.literal('author'),
    attributes: z.object({
        name: z.string(),
        imageUrl: z.string().nullable().optional(),
        biography: z.record(z.string()).optional(),
        twitter: z.string().nullable().optional(),
        pixiv: z.string().nullable().optional(),
        website: z.string().nullable().optional(),
        version: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
    }),
    relationships: z.array(z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.record(z.unknown()).optional(),
    })).optional(),
});

// Scanlation Group schema
const GroupSchema = z.object({
    id: z.string(),
    type: z.literal('scanlation_group'),
    attributes: z.object({
        name: z.string(),
        altNames: z.array(z.record(z.string())).optional(),
        locked: z.boolean().optional(),
        website: z.string().nullable().optional(),
        discord: z.string().nullable().optional(),
        contactEmail: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        twitter: z.string().nullable().optional(),
        focusedLanguage: z.array(z.string()).nullable().optional(),
        official: z.boolean().optional(),
        verified: z.boolean().optional(),
        inactive: z.boolean().optional(),
        version: z.number(),
        createdAt: z.string(),
        updatedAt: z.string(),
    }),
    relationships: z.array(z.object({
        id: z.string(),
        type: z.string(),
        attributes: z.record(z.unknown()).optional(),
    })).optional(),
});

// List response schemas
const AuthorListSchema = z.object({
    data: z.array(AuthorSchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
});

const GroupListSchema = z.object({
    data: z.array(GroupSchema),
    limit: z.number(),
    offset: z.number(),
    total: z.number(),
});

// Advanced search params schema
const AdvancedSearchParamsSchema = z.object({
    title: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().nonnegative().optional(),
    includedTags: z.array(z.string()).optional(),
    excludedTags: z.array(z.string()).optional(),
    includedTagsMode: z.enum(['AND', 'OR']).optional(),
    excludedTagsMode: z.enum(['AND', 'OR']).optional(),
    status: z.array(z.enum(['ongoing', 'completed', 'hiatus', 'cancelled'])).optional(),
    publicationDemographic: z.array(z.enum(['shounen', 'shoujo', 'seinen', 'josei', 'none'])).optional(),
    contentRating: z.array(z.enum(['safe', 'suggestive', 'erotica', 'pornographic'])).optional(),
    year: z.union([z.number(), z.string()]).optional(),
    authors: z.array(z.string()).optional(),
    group: z.string().optional(),
    order: z.record(z.string()).optional(),
});

// Backend response wrapper
const BackendResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        data: dataSchema,
        cached: z.boolean(),
        message: z.string().optional(),
        error: z.string().optional(),
    });


// Types
export type Author = z.infer<typeof AuthorSchema>;
export type AuthorList = z.infer<typeof AuthorListSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type GroupList = z.infer<typeof GroupListSchema>;
export type AdvancedSearchParams = z.infer<typeof AdvancedSearchParamsSchema>;

// Tag state for tri-state filtering
export type TagState = 'none' | 'include' | 'exclude';

export interface TagFilter {
    id: string;
    name: string;
    group: string;
    state: TagState;
}

// Helpers
interface ApiErrorResponse {
    message: string;
}

function handleAxiosError(error: unknown): string {
    if (error instanceof Error) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        if (axiosError.response) {
            return axiosError.response.data?.message || axiosError.message;
        } else if (axiosError.request) {
            return 'Network error - please check your connection';
        } else {
            return axiosError.message;
        }
    }
    return 'An unexpected error occurred';
}

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.error('[SearchService] Validation error:', result.error.flatten());
        throw new Error('Invalid response data from server');
    }
    return result.data;
}

// ============================================================================
// Tags Caching (localStorage with 7-day TTL)
// ============================================================================

const TAGS_CACHE_KEY = 'mangadex_tags';
const TAGS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedTags {
    data: Tag[];
    timestamp: number;
}

function getCachedTags(): Tag[] | null {
    try {
        const cached = localStorage.getItem(TAGS_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp }: CachedTags = JSON.parse(cached);
        if (Date.now() - timestamp > TAGS_CACHE_TTL) {
            localStorage.removeItem(TAGS_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCachedTags(tags: Tag[]): void {
    try {
        const cached: CachedTags = {
            data: tags,
            timestamp: Date.now(),
        };
        localStorage.setItem(TAGS_CACHE_KEY, JSON.stringify(cached));
    } catch (e) {
        console.warn('[SearchService] Failed to cache tags:', e);
    }
}

// Search Service
export class SearchService {
    /**
     * Get tags with localStorage caching (7-day TTL)
     */
    async getTags(): Promise<TagFilter[]> {
        // Check cache first
        const cached = getCachedTags();
        if (cached) {
            return cached.map(tag => ({
                id: tag.id,
                name: tag.attributes.name['en'] || Object.values(tag.attributes.name)[0] || 'Unknown',
                group: tag.attributes.group,
                state: 'none' as TagState,
            }));
        }

        // Fetch from API
        try {
            const response = await api.get('/api/v1/manga/tags');
            const tags: Tag[] = response.data?.data?.data || [];

            // Cache the raw tags
            setCachedTags(tags);

            return tags.map(tag => ({
                id: tag.id,
                name: tag.attributes.name['en'] || Object.values(tag.attributes.name)[0] || 'Unknown',
                group: tag.attributes.group,
                state: 'none' as TagState,
            }));
        } catch (error) {
            console.error('[SearchService] Failed to fetch tags:', error);
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Quick search for search bar dropdown (top 5 results)
     */
    async quickSearch(query: string): Promise<BackendResponse<MangaList>> {
        if (!query || query.trim().length < 2) {
            return {
                success: true,
                data: { data: [], limit: 5, offset: 0, total: 0 },
                cached: false,
            };
        }

        try {
            const response = await api.get('/api/v1/search/quick', {
                params: { q: query.trim() },
            });
            return response.data;
        } catch (error) {
            console.error('[SearchService] Quick search error:', error);
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Advanced manga search with all filters
     */
    async advancedSearch(params: AdvancedSearchParams): Promise<BackendResponse<MangaList>> {
        // Validate input params
        const validatedParams = AdvancedSearchParamsSchema.parse(params);

        try {
            const response = await api.get('/api/v1/search/manga', {
                params: {
                    ...validatedParams,
                    order: validatedParams.order ? JSON.stringify(validatedParams.order) : undefined,
                },
            });
            return response.data;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error('Invalid search parameters');
            }
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Search authors for autocomplete
     */
    async searchAuthors(name: string, limit = 10): Promise<BackendResponse<AuthorList>> {
        if (!name || name.trim().length < 2) {
            return {
                success: true,
                data: { data: [], limit, offset: 0, total: 0 },
                cached: false,
            };
        }

        try {
            const response = await api.get('/api/v1/search/authors', {
                params: { name: name.trim(), limit },
            });
            return parseResponse(
                BackendResponseSchema(AuthorListSchema),
                response.data
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error('Invalid author search response');
            }
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Search scanlation groups for autocomplete
     */
    async searchGroups(name: string, limit = 10): Promise<BackendResponse<GroupList>> {
        if (!name || name.trim().length < 2) {
            return {
                success: true,
                data: { data: [], limit, offset: 0, total: 0 },
                cached: false,
            };
        }

        try {
            const response = await api.get('/api/v1/search/groups', {
                params: { name: name.trim(), limit },
            });
            return parseResponse(
                BackendResponseSchema(GroupListSchema),
                response.data
            );
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new Error('Invalid group search response');
            }
            throw new Error(handleAxiosError(error));
        }
    }
}

// Export singleton instance
export const searchService = new SearchService();
export default searchService;

// Export Schemas
export const searchSchemas = {
    Author: AuthorSchema,
    AuthorList: AuthorListSchema,
    Group: GroupSchema,
    GroupList: GroupListSchema,
    AdvancedSearchParams: AdvancedSearchParamsSchema,
};