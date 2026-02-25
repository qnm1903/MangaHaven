import { z } from 'zod';
import api from '../lib/axios';
import { AxiosError } from 'axios';
// Zod Schemas

// Tag schema
const TagSchema = z.object({
  id: z.string(),
  type: z.literal('tag'),
  attributes: z.object({
    name: z.record(z.string()),
    description: z.record(z.string()),
    group: z.string(),
    version: z.number(),
  }),
});

// Manga attributes schema
const MangaAttributesSchema = z.object({
  title: z.record(z.string()),
  altTitles: z.array(z.record(z.string())),
  description: z.record(z.string()),
  isLocked: z.boolean(),
  links: z.record(z.string()).nullable().optional(),
  originalLanguage: z.string(),
  lastVolume: z.string().nullable(),
  lastChapter: z.string().nullable(),
  publicationDemographic: z.string().nullable(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  year: z.number().nullable(),
  contentRating: z.enum(['safe', 'suggestive', 'erotica', 'pornographic']),
  tags: z.array(TagSchema),
  state: z.string(),
  chapterNumbersResetOnNewVolume: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number(),
  availableTranslatedLanguages: z.array(z.string().nullable()).nullable().optional(),
  coverPublicId: z.string().nullable().optional(),
});

// Relationship schema
const RelationshipSchema = z.object({
  id: z.string(),
  type: z.string(),
  related: z.string().optional(),
  attributes: z.record(z.unknown()).optional(),
});

// Statistics schema
const StatisticsSchema = z.object({
  rating: z.object({
    average: z.number().nullable().optional(),
    bayesian: z.number().nullable().optional(),
    distribution: z.record(z.number()).nullable().optional(),
  }).nullable().optional(),
  follows: z.number().nullable().optional(),
}).nullable().optional();

// Manga schema
const MangaSchema = z.object({
  id: z.string(),
  type: z.literal('manga'),
  attributes: MangaAttributesSchema,
  relationships: z.array(RelationshipSchema),
  statistics: StatisticsSchema,
});

// Manga list schema
const MangaListSchema = z.object({
  result: z.string().optional(),
  response: z.string().optional(),
  data: z.array(MangaSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

// Chapter attributes schema
const ChapterAttributesSchema = z.object({
  title: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  chapter: z.string().nullable().optional(),
  pages: z.number().nullable().optional().transform((val) => val ?? 0),
  translatedLanguage: z.string().catch(''),
  uploader: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
  version: z.number().nullable().optional().transform((val) => val ?? 1),
  createdAt: z.string().nullable().optional().transform((val) => val ?? ''),
  updatedAt: z.string().nullable().optional().transform((val) => val ?? ''),
  publishAt: z.string().nullable().optional().transform((val) => val ?? ''),
  readableAt: z.string().nullable().optional().transform((val) => val ?? ''),
});

// Chapter schema
const ChapterSchema = z.object({
  id: z.string(),
  type: z.literal('chapter'),
  attributes: ChapterAttributesSchema,
  relationships: z.array(RelationshipSchema),
});

// Chapter list schema
const ChapterListSchema = z.object({
  data: z.array(ChapterSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
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

// MangaDex direct response schema (without backend wrapper)
const MangaDexResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    result: z.string(),
    response: z.string().optional(),
    data: dataSchema,
  });

// Chapter pages response type (for return type)
type ChapterPages = {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
};

// MangaDex At-Home response schema (with result field)
const MangaDexAtHomeResponseSchema = z.object({
  result: z.string(),
  baseUrl: z.string(),
  chapter: z.object({
    hash: z.string(),
    data: z.array(z.string()),
    dataSaver: z.array(z.string()),
  }),
});

// Search params schema
const SearchParamsSchema = z.object({
  title: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().nonnegative().optional(),
  includedTags: z.array(z.string()).optional(),
  excludedTags: z.array(z.string()).optional(),
  status: z.array(z.string()).optional(),
  originalLanguage: z.array(z.string()).optional(),
  contentRating: z.array(z.string()).optional(),
  order: z.record(z.string()).optional(),
  includes: z.array(z.string()).optional(),
});

export type Manga = z.infer<typeof MangaSchema>;
export type MangaList = z.infer<typeof MangaListSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Chapter = z.output<typeof ChapterSchema>;
export type ChapterList = z.output<typeof ChapterListSchema>;
export type BackendResponse<T> = {
  success: boolean;
  data: T;
  cached: boolean;
  message?: string;
  error?: string;
};

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
    console.error('[MangaService] Validation error:', result.error.flatten());
    throw new Error('Invalid response data from server');
  }
  return result.data;
}

// ============================================================================
// Manga Service
// ============================================================================

export class MangaService {
  /**
   * Search manga with filters
   * Validates search params and response
   */
  async searchManga(params: z.infer<typeof SearchParamsSchema>): Promise<BackendResponse<MangaList>> {
    // Validate input params
    const validatedParams = SearchParamsSchema.parse(params);

    // Optimize for performance
    const optimizedParams = {
      ...validatedParams,
      limit: Math.min(validatedParams.limit ?? 20, 50),
      includes: ['cover_art'],
    };

    try {
      const response = await api.get('/api/v1/manga/search', {
        params: optimizedParams,
      });
      return parseResponse(BackendResponseSchema(MangaListSchema), response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid search parameters or response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get popular manga
   */
  async getPopularManga(limit = 20, offset = 0): Promise<BackendResponse<MangaList>> {
    // Validate inputs
    const validatedLimit = z.number().int().min(1).max(50).parse(limit);
    const validatedOffset = z.number().int().nonnegative().parse(offset);

    try {
      const response = await api.get('/api/v1/manga/popular', {
        params: {
          limit: validatedLimit,
          offset: validatedOffset,
          includes: ['cover_art'],
        },
      });
      return parseResponse(BackendResponseSchema(MangaListSchema), response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid parameters or response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get popular new titles (manga mới + hot trong 1 tháng)
   */
  async getPopularNewTitles(limit = 10): Promise<BackendResponse<MangaList>> {
    const validatedLimit = z.number().int().min(1).max(20).parse(limit);

    try {
      const response = await api.get('/api/v1/manga/popular-new', {
        params: {
          limit: validatedLimit,
        },
      });
      return parseResponse(BackendResponseSchema(MangaListSchema), response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid parameters or response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get latest manga
   */
  async getLatestManga(limit = 20, offset = 0, availableTranslatedLanguage?: string[]): Promise<BackendResponse<MangaList>> {
    const validatedLimit = z.number().int().min(1).max(50).parse(limit);
    const validatedOffset = z.number().int().nonnegative().parse(offset);

    try {
      const response = await api.get('/api/v1/manga/latest', {
        params: {
          limit: validatedLimit,
          offset: validatedOffset,
          includes: ['cover_art'],
          ...(availableTranslatedLanguage && availableTranslatedLanguage.length > 0
            ? { availableTranslatedLanguage }
            : {}),
        },
      });
      return parseResponse(BackendResponseSchema(MangaListSchema), response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid parameters or response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get latest chapters across all manga (for Dashboard)
   * Returns Chapter[] enriched with coverUrl on the manga relationship
   */
  async getLatestChapters(limit = 20, translatedLanguage?: string[]): Promise<BackendResponse<ChapterList>> {
    const validatedLimit = z.number().int().min(1).max(32).parse(Math.min(limit, 32));

    try {
      const response = await api.get('/api/v1/manga/latest-chapters', {
        params: {
          limit: validatedLimit,
          ...(translatedLanguage && translatedLanguage.length > 0 ? { translatedLanguage } : {}),
        },
      });
      return parseResponse(BackendResponseSchema(ChapterListSchema), response.data) as BackendResponse<ChapterList>;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid response data from server');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get manga by ID
   */
  async getMangaById(
    id: string,
    includes?: string[],
    includeStatistics = true
  ): Promise<BackendResponse<{ data: Manga }>> {
    // Validate manga ID
    const validatedId = z.string().min(1).parse(id);
    const optimizedIncludes = includes && includes.length > 0 ? ['cover_art'] : undefined;

    try {
      const params: Record<string, unknown> = optimizedIncludes ? { includes: optimizedIncludes } : {};
      if (!includeStatistics) params['includeStatistics'] = 'false';
      const response = await api.get(`/api/v1/manga/${validatedId}`, { params });
      return parseResponse(
        BackendResponseSchema(z.object({ data: MangaSchema })).extend({
          isFollowing: z.boolean().optional(),
          followId: z.string().optional(),
        }),
        response.data
      );
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid manga ID or response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get manga chapters feed
   */
  async getMangaFeed(
    id: string,
    params?: {
      limit?: number;
      offset?: number;
      translatedLanguage?: string[];
      order?: Record<string, string>;
    }
  ): Promise<BackendResponse<ChapterList>> {
    const validatedId = z.string().min(1).parse(id);

    try {
      const response = await api.get(`/api/v1/manga/${validatedId}/feed`, {
        params: params
          ? {
            ...params,
            limit: params.limit ? Math.min(params.limit, 100) : 20,
          }
          : {},
      });
      return parseResponse(BackendResponseSchema(ChapterListSchema), response.data) as BackendResponse<ChapterList>;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid response data');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<BackendResponse<{ data: Tag[] }>> {
    try {
      const response = await api.get('/api/v1/manga/tags');
      return parseResponse(
        BackendResponseSchema(z.object({ data: z.array(TagSchema) })),
        response.data
      );
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid tags response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get random manga
   */
  async getRandomManga(includes?: string[]): Promise<BackendResponse<{ data: Manga }>> {
    const optimizedIncludes = includes && includes.length > 0 ? ['cover_art'] : undefined;

    try {
      const response = await api.get('/api/v1/manga/random', {
        params: optimizedIncludes ? { includes: optimizedIncludes } : {},
      });
      return parseResponse(
        BackendResponseSchema(z.object({ data: MangaSchema })),
        response.data
      );
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid manga response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get chapter details (via backend proxy)
   */
  async getChapter(
    chapterId: string,
    includes?: string[]
  ): Promise<BackendResponse<{ data: Chapter }>> {
    const validatedId = z.string().min(1).parse(chapterId);

    try {
      const response = await api.get(`/api/v1/manga/chapter/${validatedId}`, {
        params: includes ? { includes } : {},
      });
      const backendResponse = parseResponse(
        BackendResponseSchema(MangaDexResponseSchema(ChapterSchema)),
        response.data
      );

      return {
        success: backendResponse.success,
        data: { data: backendResponse.data.data as Chapter },
        cached: backendResponse.cached,
      };
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid chapter response');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get chapter pages (via backend proxy)
   */
  async getChapterPages(chapterId: string): Promise<ChapterPages> {
    const validatedId = z.string().min(1).parse(chapterId);

    try {
      const response = await api.get(
        `/api/v1/manga/at-home/server/${validatedId}`
      );
      const backendResponse = parseResponse(
        BackendResponseSchema(MangaDexAtHomeResponseSchema),
        response.data
      );

      // Return only the needed fields (without 'result')
      return {
        baseUrl: backendResponse.data.baseUrl,
        chapter: backendResponse.data.chapter,
      };
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid chapter pages response');
      }
      throw new Error(handleAxiosError(error));
    }
  }
}

// Export singleton instance
export const mangaService = new MangaService();
export default mangaService;