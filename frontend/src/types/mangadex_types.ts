export interface Manga {
  id: string;
  type: 'manga';
  attributes: {
    title: Record<string, string>;
    altTitles: Array<Record<string, string>>;
    description: Record<string, string>;
    isLocked: boolean;
    links: Record<string, string>;
    originalLanguage: string;
    lastVolume: string | null;
    lastChapter: string | null;
    publicationDemographic: string | null;
    status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
    year: number | null;
    contentRating: 'safe' | 'suggestive' | 'erotica' | 'pornographic';
    tags: Array<{
      id: string;
      type: 'tag';
      attributes: {
        name: Record<string, string>;
        description: Record<string, string>;
        group: string;
        version: number;
      };
    }>;
    state: string;
    chapterNumbersResetOnNewVolume: boolean;
    createdAt: string;
    updatedAt: string;
    version: number;
    availableTranslatedLanguages?: string[];
    coverPublicId?: string | null;
  };
  relationships: Array<{
    id: string;
    type: string;
    related?: string;
    attributes?: Record<string, unknown>;
  }>;
  statistics?: {
    rating?: {
      average?: number | null;
      bayesian?: number | null;
      distribution?: Record<string, number> | null;
    };
    follows?: number | null;
  };
}

export interface MangaList {
  result: 'ok' | 'error';
  response: 'collection';
  data: Manga[];
  limit: number;
  offset: number;
  total: number;
}

export interface Tag {
  id: string;
  type: 'tag';
  attributes: {
    name: Record<string, string>;
    description: Record<string, string>;
    group: string;
    version: number;
  };
}

export interface Chapter {
  id: string;
  type: 'chapter';
  attributes: {
    volume: string | null;
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    externalUrl: string | null;
    publishAt: string;
    readableAt: string;
    createdAt: string;
    updatedAt: string;
    pages: number;
    version: number;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: Record<string, unknown>;
  }>;
}

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
