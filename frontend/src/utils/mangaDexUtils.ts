import type { Manga, Chapter, Tag, CoverImageVariants, CoverImageSize } from '@/types/mangadex_types';

// Utility functions for MangaDex data processing
export const mangaDexUtils = {
  // Get title in preferred language 
  getTitle: (titleObject: Record<string, string>, preferredLang: string = 'en'): string => {
    return titleObject[preferredLang] ||
      titleObject['en'] ||
      titleObject[Object.keys(titleObject)[0]] ||
      'Untitled';
  },

  // Get description in preferred language
  getDescription: (descriptionObject: Record<string, string>, preferredLang: string = 'en'): string => {
    return descriptionObject[preferredLang] ||
      descriptionObject['en'] ||
      descriptionObject[Object.keys(descriptionObject)[0]] ||
      'No Description';
  },

  // Get title from Manga object in preferred language
  getMangaTitle: (manga: Manga, language = 'en'): string => {
    return manga.attributes.title[language] ||
      manga.attributes.title['en'] ||
      Object.values(manga.attributes.title)[0] ||
      'No Title';
  },

  // Get description in preferred language
  getMangaDescription: (manga: Manga, language = 'en'): string => {
    return manga.attributes.description[language] ||
      manga.attributes.description['en'] ||
      Object.values(manga.attributes.description)[0] ||
      'No Description';
  },

  // Get cover art URL from relationships
  getCoverArt: (manga: Manga): string | null => {
    if (manga.attributes.coverPublicId) {
      return `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${manga.attributes.coverPublicId}`;
    }
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    if (coverArt?.attributes?.fileName) {
      const fileName = coverArt.attributes.fileName as string;
      return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg`;
    }
    return null;
  },

  // Get authors from relationships
  getAuthors: (manga: Manga): Array<{ id: string; name: string }> => {
    return manga.relationships
      .filter(rel => rel.type === 'author')
      .map(rel => ({
        id: rel.id,
        name: (rel.attributes?.name as string) || 'Unknown Author'
      }));
  },

  // Get artists from relationships
  getArtists: (manga: Manga): Array<{ id: string; name: string }> => {
    return manga.relationships
      .filter(rel => rel.type === 'artist')
      .map(rel => ({
        id: rel.id,
        name: (rel.attributes?.name as string) || 'Unknown Artist'
      }));
  },

  // Get scanlation group from chapter relationships
  getScanlationGroup: (chapter: Chapter): { id: string; name: string } | null => {
    const group = chapter.relationships.find(rel => rel.type === 'scanlation_group');
    if (group) {
      return {
        id: group.id,
        name: (group.attributes?.name as string) || 'Unknown Group'
      };
    }
    return null;
  },

  // Format chapter number for display
  formatChapterNumber: (chapter: Chapter): string => {
    const vol = chapter.attributes.volume;
    const ch = chapter.attributes.chapter;
    const title = chapter.attributes.title;

    let formatted = '';
    if (vol) formatted += `Vol. ${vol} `;
    if (ch) formatted += `Ch. ${ch}`;
    if (title) formatted += `: ${title}`;

    return formatted.trim() || 'Oneshot';
  },

  // Get manga status with formatted text
  getStatusText: (status: Manga['attributes']['status']): string => {
    const statusMap: Record<Manga['attributes']['status'], string> = {
      ongoing: 'Ongoing',
      completed: 'Completed',
      hiatus: 'On Hiatus',
      cancelled: 'Cancelled'
    };
    return statusMap[status] || 'Unknown';
  },

  // Get content rating with formatted text
  getContentRatingText: (rating: Manga['attributes']['contentRating']): string => {
    const ratingMap: Record<Manga['attributes']['contentRating'], string> = {
      safe: 'Safe',
      suggestive: 'Suggestive',
      erotica: 'Erotica',
      pornographic: 'Pornographic'
    };
    return ratingMap[rating] || 'Unknown';
  },

  // Get demographic with formatted text
  getDemographicText: (demographic: string | null): string => {
    if (!demographic) return 'None';

    const demographicMap: Record<string, string> = {
      shounen: 'Shounen',
      shoujo: 'Shoujo',
      josei: 'Josei',
      seinen: 'Seinen'
    };
    return demographicMap[demographic] || demographic;
  },

  // Get tag names from Manga object in preferred language
  getMangaTagNames: (manga: Manga, language = 'en'): string[] => {
    return manga.attributes.tags.map(tag =>
      tag.attributes.name[language] ||
      tag.attributes.name['en'] ||
      Object.values(tag.attributes.name)[0] ||
      'Unknown Tag'
    );
  },

  // Get tag names in preferred language
  getTagNames: (tags: Tag[], preferredLang: string = 'en'): string[] => {
    return tags.map(tag =>
      tag.attributes.name[preferredLang] ||
      tag.attributes.name.en ||
      tag.attributes.name[Object.keys(tag.attributes.name)[0]] ||
      'Unknown Tag'
    );
  },

  // Get tags by group
  getTagsByGroup: (tags: Tag[], group: string): Tag[] => {
    return tags.filter(tag => tag.attributes.group === group);
  },

  // Build search parameters for API
  buildSearchParams: (params: Record<string, unknown>): URLSearchParams => {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(`${key}[]`, v.toString()));
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (subValue !== undefined && subValue !== null) {
              searchParams.append(`${key}[${subKey}]`, subValue.toString());
            }
          });
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams;
  },

  // Format date for display
  formatDate: (dateString: string, locale: string = 'en-US'): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Unknown Date';
    }
  },

  // Format relative time (e.g., "2 giờ trước")
  formatRelativeTime: (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMinutes / 60);
      const diffInDays = Math.floor(diffInHours / 24);

      if (diffInMinutes < 1) {
        return 'Vừa xong';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} phút trước`;
      } else if (diffInHours < 24) {
        return `${diffInHours} giờ trước`;
      } else if (diffInDays < 7) {
        return `${diffInDays} ngày trước`;
      } else {
        // Format as dd/mm/yyyy
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch {
      return 'Unknown time';
    }
  },

  // Get reading progress percentage
  getReadingProgress: (readChapters: string[], totalChapters: number): number => {
    if (totalChapters === 0) return 0;
    return Math.round((readChapters.length / totalChapters) * 100);
  },

  // Filter chapters by language
  filterChaptersByLanguage: (chapters: Chapter[], language: string): Chapter[] => {
    return chapters.filter(chapter => chapter.attributes.translatedLanguage === language);
  },

  // Get unique languages from chapters
  getAvailableLanguages: (chapters: Chapter[]): string[] => {
    const languages = new Set(chapters.map(chapter => chapter.attributes.translatedLanguage));
    return Array.from(languages).sort();
  },

  // Sort chapters by chapter number
  sortChapters: (chapters: Chapter[]): Chapter[] => {
    return chapters.sort((a, b) => {
      const aChapter = parseFloat(a.attributes.chapter || '0');
      const bChapter = parseFloat(b.attributes.chapter || '0');
      const aVolume = parseFloat(a.attributes.volume || '0');
      const bVolume = parseFloat(b.attributes.volume || '0');

      if (aVolume !== bVolume) {
        return aVolume - bVolume;
      }
      return aChapter - bChapter;
    });
  },

  // Group chapters by volume
  groupChaptersByVolume: (chapters: Chapter[]): Record<string, Chapter[]> => {
    const grouped: Record<string, Chapter[]> = {};

    chapters.forEach(chapter => {
      const volume = chapter.attributes.volume || 'No Volume';
      if (!grouped[volume]) {
        grouped[volume] = [];
      }
      grouped[volume].push(chapter);
    });

    // Sort chapters within each volume
    Object.keys(grouped).forEach(volume => {
      if (grouped[volume]) {
        grouped[volume] = mangaDexUtils.sortChapters(grouped[volume]);
      }
    });

    return grouped;
  },

  // Validate chapter number format
  isValidChapterNumber: (chapterNumber: string): boolean => {
    return /^\d+(\.\d+)?$/.test(chapterNumber);
  },

  // Generate chapter URL slug
  generateChapterSlug: (chapter: Chapter): string => {
    const vol = chapter.attributes.volume;
    const ch = chapter.attributes.chapter;
    const title = chapter.attributes.title;

    let slug = '';
    if (vol) slug += `volume-${vol}-`;
    if (ch) slug += `chapter-${ch}`;
    if (title) slug += `-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    return slug.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  },

  // Generate manga URL slug
  generateMangaSlug: (manga: Manga, preferredLang: string = 'en'): string => {
    const title = mangaDexUtils.getMangaTitle(manga, preferredLang);
    return title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

// Export individual utility functions for easier imports
export const {
  getTitle,
  getDescription,
  getMangaTitle,
  getMangaDescription,
  getCoverArt,
  getAuthors,
  getArtists,
  getScanlationGroup,
  formatChapterNumber,
  getStatusText,
  getContentRatingText,
  getDemographicText,
  getMangaTagNames,
  getTagNames,
  getTagsByGroup,
  buildSearchParams,
  formatDate,
  formatRelativeTime,
  getReadingProgress,
  filterChaptersByLanguage,
  getAvailableLanguages,
  sortChapters,
  groupChaptersByVolume,
  isValidChapterNumber,
  generateChapterSlug,
  generateMangaSlug
} = mangaDexUtils;

export function getCoverImageVariants(manga: Manga): CoverImageVariants | null {
  const coverRelation = manga.relationships.find((relation) => relation.type === 'cover_art');
  if (!coverRelation?.attributes) {
    return null;
  }
  const { fileName } = coverRelation.attributes as { fileName: string };
  const basePath = `https://uploads.mangadex.org/covers/${manga.id}/${fileName}`;
  const small = `${basePath}.256.jpg`;
  const medium = `${basePath}.512.jpg`;
  return {
    small,
    medium,
    original: basePath,
    srcSet: `${small} 256w, ${medium} 512w, ${basePath} 1024w`,
  };
}

export function getCoverUrl(manga: Manga, size: CoverImageSize = 'small'): string | null {
  const variants = getCoverImageVariants(manga);
  if (!variants) {
    return null;
  }
  switch (size) {
    case 'medium': return variants.medium;
    case 'original': return variants.original;
    default: return variants.small;
  }
}