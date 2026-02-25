// Re-export core types from manga_service (Zod-inferred, single source of truth)
export type { Manga, MangaList, Tag, Chapter, ChapterList } from '@/services/manga_service';

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

export type CoverImageSize = 'small' | 'medium' | 'original';

export interface CoverImageVariants {
  small: string;
  medium: string;
  original: string;
  srcSet: string;
}