import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import mangaService from '@/services/manga_service';

// Re-export types from manga_service for convenience
export type { Manga, Tag, MangaList } from '@/services/manga_service';

// Search params interface
export interface SearchMangaParams {
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
}

/**
 * Hook để search manga - sử dụng backend API với caching
 */
export function useSearchManga(
  params: SearchMangaParams,
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'search', params],
    queryFn: () => mangaService.searchManga(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    refetchOnReconnect: false, // Prevent refetching on reconnect
    ...options,
  });
}

/**
 * Hook để lấy manga popular
 */
export function usePopularManga(
  limit = 20,
  offset = 0,
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'popular', limit, offset],
    queryFn: () => mangaService.getPopularManga(limit, offset),
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    ...options,
  });
}

/**
 * Hook để lấy popular new titles (manga mới + hot)
 */
export function usePopularNewTitles(
  limit = 10,
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'popular-new', limit],
    queryFn: () => mangaService.getPopularNewTitles(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes - data này ít thay đổi
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook để lấy manga latest
 */
export function useLatestManga(
  limit = 20,
  offset = 0,
  availableTranslatedLanguage?: string[],
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'latest', limit, offset, availableTranslatedLanguage],
    queryFn: () => mangaService.getLatestManga(limit, offset, availableTranslatedLanguage),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    ...options,
  });
}

/**
 * Hook để lấy các chapter mới nhất (dùng cho Dashboard "Cập nhật mới nhất")
 * Trả về Chapter[] đã được enriched với coverUrl từ backend
 */
export function useLatestChapters(
  limit = 12,
  translatedLanguage?: string[],
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['chapters', 'latest', limit, translatedLanguage],
    queryFn: () => mangaService.getLatestChapters(limit, translatedLanguage),
    staleTime: 2 * 60 * 1000, // 2 minutes — chapters update frequently
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Hook để lấy manga theo ID
 */
export function useManga(
  id: string,
  includes?: string[],
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  includeStatistics = true
) {
  return useQuery({
    queryKey: ['manga', id, includes, includeStatistics],
    queryFn: () => mangaService.getMangaById(id, includes, includeStatistics),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!id,
    ...options,
  });
}

/**
 * Hook để lấy chapters của manga
 */
export function useMangaFeed(
  id: string,
  params?: {
    limit?: number;
    offset?: number;
    translatedLanguage?: string[];
    order?: Record<string, string>;
  },
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', id, 'feed', params],
    queryFn: () => mangaService.getMangaFeed(id, params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    enabled: !!id,
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    ...options,
  });
}

/**
 * Hook để lấy tất cả tags
 */
export function useTags(
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'tags'],
    queryFn: () => mangaService.getTags(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 120 * 60 * 1000, // 2 hours
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    ...options,
  });
}

/**
 * Hook để lấy manga ngẫu nhiên
 */
export function useRandomManga(
  includes?: string[],
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['manga', 'random', includes],
    queryFn: () => mangaService.getRandomManga(includes),
    staleTime: 0, // Always fresh for random
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetching
    ...options,
  });
}

// Utility functions — re-exported from @/utils/mangaDexUtils
export {
  getMangaTitle,
  getMangaDescription,
  getMangaTagNames,
  getTagNames,
  getCoverImageVariants,
  getCoverUrl,
} from '@/utils/mangaDexUtils';
export type { CoverImageSize, CoverImageVariants } from '@/types/mangadex_types';

/**
 * Hook để lấy thông tin chapter
 */
export function useChapter(
  chapterId: string,
  includes?: string[],
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['chapter', chapterId, includes],
    queryFn: () => mangaService.getChapter(chapterId, includes),
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    enabled: !!chapterId,
    ...options,
  });
}

/**
 * Hook để lấy danh sách ảnh của chapter
 */
export function useChapterPages(
  chapterId: string,
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: ['chapter', chapterId, 'pages'],
    queryFn: () => mangaService.getChapterPages(chapterId),
    staleTime: 60 * 60 * 1000, // 1 hour - pages don't change
    gcTime: 120 * 60 * 1000, // 2 hours
    enabled: !!chapterId,
    refetchOnWindowFocus: false,
    ...options,
  });
}
