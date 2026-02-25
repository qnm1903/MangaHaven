import axios, { AxiosInstance } from 'axios';
import http from 'http';
import https from 'https';
import redisClient from '../db/redis_client';

const getHeaderValue = (header: unknown): string | undefined => {
  if (Array.isArray(header)) {
    return header.length > 0 ? header[0] : undefined;
  }
  return typeof header === 'string' ? header : undefined;
};

export class MangaDexClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private authPromise: Promise<void> | null = null;

  constructor() {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({ keepAlive: true });

    this.client = axios.create({
      baseURL: process.env.MANGADEX_API_BASE_URL || 'https://api.mangadex.org',
      timeout: 10000,
      headers: {
        'User-Agent': 'MangaVerse/1.0',
      },
      httpAgent,
      httpsAgent,
      // MangaDex expects arrays as key[]=val and nested objects as key[sub]=val
      paramsSerializer: {
        serialize: (params: Record<string, unknown>) => {
          const parts: string[] = [];
          for (const key of Object.keys(params)) {
            const val = params[key];
            if (val === undefined || val === null) continue;
            if (Array.isArray(val)) {
              for (const item of val) {
                parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`);
              }
            } else if (typeof val === 'object') {
              for (const subKey of Object.keys(val as Record<string, unknown>)) {
                parts.push(`${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(String((val as Record<string, unknown>)[subKey]))}`);
              }
            } else {
              parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
            }
          }
          return parts.join('&');
        }
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      await this.ensureAuthenticated();

      if (this.accessToken) {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config || {};

        // 404 = deleted/private resource — reject immediately, no retry, minimal log.
        if (error.response?.status === 404) {
          console.warn('MangaDex 404:', error.response?.data?.errors?.[0]?.detail || error.message);
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && this.hasAuthConfig() && !originalRequest._retry) {
          originalRequest._retry = true;
          console.log('Access token expired, attempting to refresh...');

          try {
            await this.refreshAccessToken();
            return this.client.request(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            return Promise.reject(refreshError);
          }
        }

        if (error.response?.status === 429 && !originalRequest._retry429) {
          originalRequest._retry429 = true;
          const retryAfterHeader =
            getHeaderValue(error.response.headers?.['retry-after']) ||
            getHeaderValue(error.response.headers?.['x-ratelimit-retry-after']);
          const retryAfterMs =
            this.parseRetryAfter(retryAfterHeader) ??
            this.parseRetryAfter(error.response.data?.retryAfter) ??
            (typeof error.response.data?.retryAfterMs === 'number' && error.response.data.retryAfterMs >= 0
              ? error.response.data.retryAfterMs
              : null) ??
            1000;

          console.warn(`Received code 429 from MangaDex, retrying after ${retryAfterMs}ms`);
          await MangaDexClient.sleep(retryAfterMs);
          return this.client.request(originalRequest);
        }

        console.error('MangaDex API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  private hasAuthConfig(): boolean {
    return Boolean(
      process.env.MANGADEX_USERNAME &&
      process.env.MANGADEX_PASSWORD &&
      process.env.MANGADEX_ID &&
      process.env.MANGADEX_SECRET
    );
  }

  private applyTokens(accessToken: string | null | undefined, refreshToken?: string | null) {
    if (typeof accessToken !== 'undefined') {
      this.accessToken = accessToken;
    }
    if (typeof refreshToken !== 'undefined') {
      this.refreshToken = refreshToken;
    }

    if (this.accessToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;
    } else {
      delete this.client.defaults.headers.common['Authorization'];
    }
  }

  private async ensureAuthenticated() {
    if (!this.hasAuthConfig()) {
      return;
    }

    if (this.accessToken) {
      return;
    }

    if (!this.authPromise) {
      this.authPromise = (async () => {
        try {
          await this.authenticate();
        } finally {
          this.authPromise = null;
        }
      })();
    }

    await this.authPromise;
  }

  private parseRetryAfter(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value >= 0 ? value * 1000 : null;
    }

    if (typeof value === 'string') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric >= 0 ? numeric * 1000 : null;
      }

      const parsedDate = Date.parse(value);
      if (!Number.isNaN(parsedDate)) {
        const diff = parsedDate - Date.now();
        return diff > 0 ? diff : null;
      }
    }

    return null;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async authenticate() {
    if (!this.hasAuthConfig()) {
      console.warn('MangaDex credentials are not configured; skipping authentication');
      this.applyTokens(null, null);
      return;
    }

    try {
      const creds = new URLSearchParams({
        grant_type: 'password',
        username: process.env.MANGADEX_USERNAME || '',
        password: process.env.MANGADEX_PASSWORD || '',
        client_id: process.env.MANGADEX_ID || '',
        client_secret: process.env.MANGADEX_SECRET || '',
      });

      const resp = await axios.post(
        'https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token',
        creds,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = resp.data;
      this.applyTokens(access_token ?? null, refresh_token ?? null);
    } catch (error) {
      console.error('MangaDex authentication failed:', error);
      this.applyTokens(null, null);
    }
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      console.log('No refresh token available, attempting full authentication');
      await this.authenticate();
      return;
    }

    try {
      const creds = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.MANGADEX_ID || '',
        client_secret: process.env.MANGADEX_SECRET || '',
      });

      const resp = await axios.post(
        'https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token',
        creds,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = resp.data;
      this.applyTokens(access_token ?? null, typeof refresh_token === 'undefined' ? undefined : refresh_token ?? null);
    } catch (error) {
      console.error('Failed to refresh MangaDex access token:', error);
      await this.authenticate();
    }
  }

  async searchManga(params: {
    title?: string;
    limit?: number;
    offset?: number;
    includedTags?: string[];
    excludedTags?: string[];
    status?: string[];
    originalLanguage?: string[];
    contentRating?: string[];
    order?: Record<string, string>;
    includes?: string[];
  }) {
    const searchParams = {
      ...params,
    };

    const response = await this.client.get('/manga', { params: searchParams });
    return response.data;
  }

  async getManga(id: string, includes?: string[]) {
    const cacheKey = `manga:${id}:${includes?.join(',') || ''}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const optimizedIncludes = includes && includes.length > 0 ? includes : ['cover_art'];
    const params = { includes: optimizedIncludes };
    const response = await this.client.get(`/manga/${id}`, { params });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_MANGA) || 86400,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  async getMangaStatistics(mangaIds: string[]) {
    // If single ID, use the /statistics/manga/{id} endpoint which includes distribution
    // Batch endpoint /statistics/manga?manga[]= does NOT return distribution
    if (mangaIds.length === 1) {
      const id = mangaIds[0];
      const cacheKey = `statistics:single:${id}`;
      const cached = await redisClient.getClient().get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        // Return in same shape as batch endpoint for compatibility
        return { statistics: { [id]: parsed } };
      }

      const response = await this.client.get(`/statistics/manga/${id}`);
      const stats = response.data?.statistics?.[id] ?? null;

      if (stats) {
        await redisClient.getClient().setEx(
          cacheKey,
          Number(process.env.CACHE_TTL_STATISTICS) || 7200,
          JSON.stringify(stats)
        );
      }

      return response.data;
    }

    // Batch path (no distribution) for multiple IDs
    const cacheKey = `statistics:batch:${mangaIds.join(',')}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const params = { manga: mangaIds };
    const response = await this.client.get('/statistics/manga', { params });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_STATISTICS) || 7200,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  async getMangaFeed(id: string, params?: {
    limit?: number;
    offset?: number;
    translatedLanguage?: string[];
    order?: Record<string, string>;
  }) {
    const cacheKey = `manga_feed:${id}:${JSON.stringify(params || {})}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.client.get(`/manga/${id}/feed`, {
      params: {
        ...params,
        includes: ['scanlation_group'],
      },
    });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_CHAPTER) || 3600,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  async getChapter(id: string, includes?: string[]) {
    const cacheKey = `chapter:${id}:${includes?.join(',') || ''}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const params = includes && includes.length > 0 ? { includes } : {};
    const response = await this.client.get(`/chapter/${id}`, { params });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_CHAPTER) || 3600,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  async getChapterPages(chapterId: string) {
    const response = await this.client.get(`/at-home/server/${chapterId}`);
    return response.data;
  }

  async getTags() {
    const cacheKey = 'manga_tags';
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.client.get('/manga/tag');

    await redisClient.getClient().setEx(
      cacheKey,
      3600 * 24 * 7,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  async getRandomManga(includes?: string[]) {
    const optimizedIncludes = includes && includes.length > 0 ? includes : ['cover_art'];
    const params = { includes: optimizedIncludes };
    const response = await this.client.get('/manga/random', { params });
    return response.data;
  }

  // Search authors for autocomplete
  async searchAuthors(params: {
    name: string;
    limit?: number;
    offset?: number;
  }) {
    const searchParams = {
      name: params.name,
      limit: params.limit || 10,
      offset: params.offset || 0,
    };

    const response = await this.client.get('/author', { params: searchParams });
    return response.data;
  }

  // Search scanlation groups for autocomplete
  async searchGroups(params: {
    name: string;
    limit?: number;
    offset?: number;
  }) {
    const searchParams = {
      name: params.name,
      limit: params.limit || 10,
      offset: params.offset || 0,
    };

    const response = await this.client.get('/group', { params: searchParams });
    return response.data;
  }

  // Get single scanlation group by ID
  async getGroup(id: string) {
    const cacheKey = `group:${id}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.client.get(`/group/${id}`, {
      params: { includes: ['leader', 'member'] }
    });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_GROUP) || 86400,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  // Get single author by ID
  async getAuthor(id: string) {
    const cacheKey = `author:${id}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.client.get(`/author/${id}`, {
      params: { includes: ['manga'] }
    });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_AUTHOR) || 86400,
      JSON.stringify(response.data)
    );

    return response.data;
  }

  // Advanced manga search with extended filters
  async advancedSearchManga(params: {
    title?: string;
    limit?: number;
    offset?: number;
    includedTags?: string[];
    excludedTags?: string[];
    includedTagsMode?: 'AND' | 'OR';
    excludedTagsMode?: 'AND' | 'OR';
    status?: string[];
    originalLanguage?: string[];
    availableTranslatedLanguage?: string[];
    publicationDemographic?: string[];
    contentRating?: string[];
    year?: number | string;
    authors?: string[];
    artists?: string[];
    group?: string;
    order?: Record<string, string>;
    includes?: string[];
  }) {
    const searchParams: Record<string, unknown> = {
      limit: params.limit || 20,
      offset: params.offset || 0,
      includes: params.includes || ['cover_art', 'author'],
    };

    // Add optional params only if provided
    if (params.title) searchParams.title = params.title;
    if (params.includedTags?.length) searchParams['includedTags'] = params.includedTags;
    if (params.excludedTags?.length) searchParams['excludedTags'] = params.excludedTags;
    if (params.includedTagsMode) searchParams.includedTagsMode = params.includedTagsMode;
    if (params.excludedTagsMode) searchParams.excludedTagsMode = params.excludedTagsMode;
    if (params.status?.length) searchParams['status'] = params.status;
    if (params.originalLanguage?.length) searchParams['originalLanguage'] = params.originalLanguage;
    if (params.availableTranslatedLanguage?.length) searchParams['availableTranslatedLanguage'] = params.availableTranslatedLanguage;
    if (params.publicationDemographic?.length) searchParams['publicationDemographic'] = params.publicationDemographic;
    if (params.contentRating?.length) searchParams['contentRating'] = params.contentRating;
    if (params.year) searchParams.year = params.year;
    if (params.authors?.length) searchParams['authors'] = params.authors;
    if (params.artists?.length) searchParams['artists'] = params.artists;
    if (params.group) searchParams.group = params.group;
    if (params.order) searchParams.order = params.order;

    const response = await this.client.get('/manga', { params: searchParams });
    return response.data;
  }

  // Fetch chapters for a single manga via /manga/{id}/feed.
  // This is the correct MangaDex endpoint — /chapter doesn't support manga[] array param.
  // Feed endpoints allow limit up to 500.
  async getChaptersForManga(mangaId: string, params?: {
    limit?: number;
    offset?: number;
    translatedLanguage?: string[];
    createdAtSince?: string;
    order?: Record<string, string>;
    includes?: string[];
  }) {
    const { limit = 100, offset = 0, translatedLanguage, createdAtSince, order, includes } = params ?? {};

    const qp: Record<string, unknown> = {
      limit: Math.min(limit, 500),
      offset,
      includes: includes ?? ['manga'],
    };

    if (translatedLanguage?.length) qp['translatedLanguage'] = translatedLanguage;
    if (createdAtSince) qp.createdAtSince = createdAtSince;
    if (order) qp.order = order;

    const response = await this.client.get(`/manga/${mangaId}/feed`, { params: qp });
    return response.data;
  }

  // Bulk fetch manga details by IDs
  async getMultipleMangaById(ids: string[], includes?: string[]) {
    const searchParams: Record<string, unknown> = {
      ids,
      limit: Math.min(ids.length, 100),
      includes: includes ?? ['cover_art'],
    };

    const response = await this.client.get('/manga', { params: searchParams });
    return response.data;
  }

  // Fetch latest chapters across all manga, ordered by publishAt desc
  async getLatestChapters(params?: {
    limit?: number;
    offset?: number;
    translatedLanguage?: string[];
    contentRating?: string[];
  }) {
    const { limit = 20, offset = 0, translatedLanguage, contentRating } = params ?? {};

    const qp: Record<string, unknown> = {
      limit: Math.min(limit, 50),
      offset,
      includes: ['manga', 'scanlation_group'],
      order: { readableAt: 'desc' },
    };

    if (translatedLanguage?.length) qp['translatedLanguage'] = translatedLanguage;
    if (contentRating?.length) qp['contentRating'] = contentRating;

    const response = await this.client.get('/chapter', { params: qp });
    return response.data;
  }

  // Get manga worked on by a scanlation group
  async getMangaByGroup(groupId: string, limit = 20, offset = 0) {
    const cacheKey = `group-manga:${groupId}:${limit}:${offset}`;
    const cached = await redisClient.getClient().get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const response = await this.client.get('/manga', {
      params: {
        limit,
        offset,
        group: groupId,
        includes: ['cover_art', 'author'],
        order: { updatedAt: 'desc' },
      },
    });

    await redisClient.getClient().setEx(
      cacheKey,
      Number(process.env.CACHE_TTL_GROUP) || 86400,
      JSON.stringify(response.data)
    );

    return response.data;
  }
}