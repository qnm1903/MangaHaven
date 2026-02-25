export interface MangaDexManga {
  id: string;
  type: 'manga';
  attributes: {
    title: LocalizedString;
    altTitles: LocalizedString[];
    description: LocalizedString;
    isLocked: boolean;
    links: Record<string, string>;
    originalLanguage?: string;
    lastVolume?: string | null;
    lastChapter?: string | null;
    publicationDemographic?: "shounen" | "shoujo" | "josei" | "seinen" | null;
    status: 'completed' | 'ongoing' | 'cancelled' | 'hiatus';
    year?: number | null;
    contentRating: 'safe' | 'suggestive' | 'erotica' | 'pornographic';
    tags?: Tag[];
    state: string;
    chapterNumbersResetOnNewVolume: boolean;
    createdAt: string;
    updatedAt: string;
    version: number;
    availableTranslatedLanguages: string[];
    latestUploadedChapter: string;
  };
  relationships: Relationship[];
}

export interface MangaDexChapter {
  id: string;
  type: 'chapter';
  attributes: {
    title: string | null;
    volume: string | null;
    chapter: string | null;
    pages: number;
    translatedLanguage: string;
    uploader: string;
    externalUrl: string | null;
    version: number;
    createdAt: string;
    updatedAt: string;
    publishAt: string;
    readableAt: string;
  };
  relationships: Relationship[];
}

export interface LocalizedString {
  [languageCode: string]: string;
}

export interface Tag {
  id: string;
  type: 'tag';
  attributes: {
    name: LocalizedString;
    description: LocalizedString;
    group: string;
    version: number;
  };
}

export interface Relationship {
  /** UUID formatted string */
  id: string;
  type: string;
  /** Only present if you are on a Manga entity and a Manga relationship */
  related:
    | "monochrome"
    | "main_story"
    | "adapted_from"
    | "based_on"
    | "prequel"
    | "side_story"
    | "doujinshi"
    | "same_franchise"
    | "shared_universe"
    | "sequel"
    | "spin_off"
    | "alternate_story"
    | "alternate_version"
    | "preserialization"
    | "colored"
    | "serialization";
  /** If Reference Expansion is applied, contains objects attributes */
  attributes: any | null;
}