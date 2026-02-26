import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { useParams, useNavigate, useSearch } from '@tanstack/react-router';
import { useQueries } from '@tanstack/react-query';
import { useManga, useMangaFeed } from '@/hooks/useMangaDex';
import { mangaService } from '@/services/manga_service';
import type { Manga, Chapter } from '@/types/mangadex_types';
import FollowButton from '@/components/FollowButton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Heart,
  MoreVertical,
  Share2,
  SquareArrowOutUpRight,
  Star,
  Book,
  Users,
} from 'lucide-react';
import { mangaDexUtils } from '@/utils/mangaDexUtils';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use_toast';
import { useAtom, useAtomValue } from 'jotai'
import { chapterLanguagesAtom } from '@/store/settingsAtoms'
import { readingHistoryAtom } from '@/store/historyAtoms';
import { LanguageFlag } from '@/components/LanguageFlag';

type MangaDetailResponse = {
  success: boolean;
  data: {
    data: Manga;
  };
  cached: boolean;
  isFollowing?: boolean;
  followId?: string;
};

type ChapterFeedResponse = {
  success: boolean;
  data: {
    data: Chapter[];
  };
  cached: boolean;
};

const TABS = [
  { value: 'chapters', label: 'Chapters' },
  { value: 'comments', label: 'Comments' },
  { value: 'related', label: 'Related' },
  { value: 'recommendations', label: 'Recommendations' },
] as const;
type TabValue = typeof TABS[number]['value'];

// Priority order: lower = earlier. 999 = always last. Missing keys default to 500 (middle).
const RELATED_PRIORITY: Record<string, number> = {
  colored: 0,
  prequel: 1,
  side_story: 2,
  spin_off: 3,
  adapted_from: 4,
  doujinshi: 999,
};

const RELATED_LABELS: Record<string, string> = {
  monochrome: 'Monochrome',
  main_story: 'Main Story',
  adapted_from: 'Adapted From',
  based_on: 'Based On',
  prequel: 'Prequel',
  side_story: 'Side Story',
  doujinshi: 'Doujinshi',
  same_franchise: 'Same Franchise',
  shared_universe: 'Shared Universe',
  sequel: 'Sequel',
  spin_off: 'Spin Off',
  alternate_story: 'Alternate Story',
  alternate_version: 'Alternate Version',
  preserialization: 'Preserialization',
  serialization: 'Serialization',
  colored: 'Colored',
  manga: 'Related',
};

const EXTERNAL_LINK_CONFIGS: Record<string, { label: string; buildUrl: (id: string) => string; category: 'buy' | 'track' }> = {
  mdx: { label: 'MangaDex', category: 'buy', buildUrl: (id) => `https://mangadex.org/title/${id}` },
  raw: { label: 'Official Raw', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://mangadex.org` },
  engtl: { label: 'Official English', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://mangadex.org` },
  amz: { label: 'Amazon', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://www.amazon.co.jp/dp/${id}` },
  cdj: { label: 'CDJapan', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://www.cdjapan.co.jp/product/${id}` },
  ebj: { label: 'eBookJapan', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://ebookjapan.yahoo.co.jp/books/${id}.html` },
  bw: { label: 'Book☆Walker', category: 'buy', buildUrl: (id) => id.startsWith('http') ? id : `https://bookwalker.jp/${id}` },
  mu: { label: 'MangaUpdates', category: 'track', buildUrl: (id) => `https://www.mangaupdates.com/series/${id}` },
  ap: { label: 'Anime-Planet', category: 'track', buildUrl: (id) => `https://www.anime-planet.com/manga/${id}` },
  al: { label: 'AniList', category: 'track', buildUrl: (id) => `https://anilist.co/manga/${id}` },
  kt: { label: 'Kitsu', category: 'track', buildUrl: (id) => `https://kitsu.app/manga/${id}` },
  mal: { label: 'MyAnimeList', category: 'track', buildUrl: (id) => `https://myanimelist.net/manga/${id}` },
};

const MangaDetail: React.FC = () => {
  const routeParameters = useParams({ strict: false }) as { mangaId: string };
  const mangaIdentifier = routeParameters.mangaId;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedChapterIdentifier, setSelectedChapterIdentifier] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(true);

  const {
    data: mangaQueryData,
    isLoading: isMangaLoading,
    error: mangaError,
  } = useManga(mangaIdentifier, ['cover_art', 'author', 'artist']);

  const [chapterLanguages] = useAtom(chapterLanguagesAtom);
  const history = useAtomValue(readingHistoryAtom);
  const readChapterIds = useMemo(() => new Set(history.map((e) => e.chapterId)), [history]);

  const searchParams = useSearch({ strict: false }) as Record<string, string>;
  const activeTab: TabValue = (searchParams.tab as TabValue) || 'chapters';

  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const prevTabIndexRef = useRef<number>(0);
  const tabButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tabIndicator, setTabIndicator] = useState<{ left: number; width: number; ready: boolean }>({ left: 0, width: 0, ready: false });

  const setTab = (tab: TabValue) => {
    const nextIndex = TABS.findIndex((tabItem) => tabItem.value === tab);
    const prevIndex = prevTabIndexRef.current;
    setSlideDir(nextIndex > prevIndex ? 'right' : 'left');
    prevTabIndexRef.current = nextIndex;
    navigate({
      to: '/manga/$mangaId' as string,
      params: { mangaId: mangaIdentifier },
      search: (prev: Record<string, string>) => ({ ...prev, tab }),
    });
  };

  // Sync ref when tab changes via URL (browser back/forward)
  useEffect(() => {
    prevTabIndexRef.current = TABS.findIndex((tab) => tab.value === activeTab);
  }, [activeTab]);

  const tabLabels: Record<TabValue, string> = {
    chapters: t`Chapters`,
    comments: t`Comments`,
    related: t`Related`,
    recommendations: t`Recommendations`,
  };

  const {
    data: chapterQueryData,
    isLoading: isChapterLoading,
    error: chapterError,
  } = useMangaFeed(mangaIdentifier, {
    limit: 200,
    translatedLanguage: chapterLanguages,
    order: { chapter: 'desc' },
  });

  const {
    sortedChapters,
    volumeEntries,
    totalChapterCount,
  } = useMemo(() => {
    const response = chapterQueryData as ChapterFeedResponse | undefined;
    const rawChapters = response?.data?.data ?? [];

    if (rawChapters.length === 0) {
      return {
        sortedChapters: [] as Chapter[],
        volumeEntries: [] as Array<[string, Chapter[]]>,
        totalChapterCount: 0,
      };
    }

    const sortedChaptersClone = mangaDexUtils.sortChapters([...rawChapters]);
    const groupedChapters = mangaDexUtils.groupChaptersByVolume([...sortedChaptersClone]);

    return {
      sortedChapters: sortedChaptersClone,
      volumeEntries: Object.entries(groupedChapters) as Array<[string, Chapter[]]>,
      totalChapterCount: sortedChaptersClone.length,
    };
  }, [chapterQueryData]);

  const mangaResponse = mangaQueryData as MangaDetailResponse | undefined;
  const mangaEntity = mangaResponse?.data?.data as Manga | undefined;

  const relatedItems = useMemo(() => {
    if (!mangaEntity) return [];
    return mangaEntity.relationships
      .filter((r: { type: string; related?: string }) => r.type === 'manga' && r.related)
      .map((r: { id: string; related?: string }) => ({ id: r.id, related: r.related! }));
  }, [mangaEntity]);

  const relatedByGroup = useMemo(() => {
    const groups: Record<string, Array<{ id: string; queryIndex: number }>> = {};
    relatedItems.forEach((item, i) => {
      const group = item.related;
      if (!groups[group]) groups[group] = [];
      groups[group].push({ id: item.id, queryIndex: i });
    });
    return groups;
  }, [relatedItems]);

  const relatedQueries = useQueries({
    queries: relatedItems.map((item) => ({
      queryKey: ['manga', item.id, ['cover_art'], false],
      queryFn: () => mangaService.getMangaById(item.id, ['cover_art'], false),
      staleTime: 30 * 60 * 1000,
      enabled: activeTab === 'related' && !!item.id,
      // Some MangaDex relation entries point to deleted/private manga (orphan relations).
      // Setting retry: false prevents TanStack Query from retrying 404s 3× on each orphan.
      retry: false,
    })),
  });

  // Tabs visible to user — hide Related when no related items exist
  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.value !== 'related' || relatedItems.length > 0),
    [relatedItems],
  );

  // Update sliding tab indicator position — must be after visibleTabs
  useEffect(() => {
    const idx = visibleTabs.findIndex((tabItem) => tabItem.value === activeTab);
    const el = tabButtonRefs.current[idx];
    if (el) {
      setTabIndicator({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
    }
  }, [activeTab, visibleTabs]);

  const allAltTitles = useMemo(() => {
    if (!mangaEntity) return [];
    const mainTitle = mangaDexUtils.getTitle(mangaEntity.attributes.title).toLowerCase();
    return mangaEntity.attributes.altTitles
      .flatMap((titleRecord) =>
        Object.entries(titleRecord).map(([lang, value]) => ({ lang, value }))
      )
      .filter(({ value }) => value && value.toLowerCase() !== mainTitle);
  }, [mangaEntity]);

  const tagsByGroup = useMemo(() => {
    const tags = mangaEntity?.attributes.tags ?? [];
    const groups: Record<string, typeof tags> = {};
    for (const tag of tags) {
      const g = tag.attributes.group;
      if (!groups[g]) groups[g] = [];
      groups[g].push(tag);
    }
    return groups;
  }, [mangaEntity]);

  const externalLinks = useMemo(() => {
    const links = mangaEntity?.attributes.links ?? {};
    const buy: Array<{ label: string; url: string }> = [
      { label: 'MangaDex', url: `https://mangadex.org/title/${mangaIdentifier}` },
    ];
    const track: Array<{ label: string; url: string }> = [];
    for (const [key, value] of Object.entries(links)) {
      const config = EXTERNAL_LINK_CONFIGS[key];
      if (!config || !value) continue;
      const entry = { label: config.label, url: config.buildUrl(value) };
      if (config.category === 'buy') buy.push(entry);
      else track.push(entry);
    }
    return { buy, track };
  }, [mangaEntity, mangaIdentifier]);

  if (isMangaLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="px-2" disabled>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <Trans>Back</Trans>
          </Button>
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-muted/50 p-8">
          <div className="flex flex-col gap-8 md:flex-row">
            <Skeleton className="h-[360px] w-[260px] rounded-3xl" />
            <div className="flex-1 space-y-6">
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
              <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (mangaError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-12 text-center shadow-lg">
        <div className="text-red-500">
          <p className="text-xl font-semibold"><Trans>Unable to load this manga</Trans></p>
          <p className="mt-2 text-sm text-red-400">
            {mangaError.message || t`Something went wrong while contacting the server.`}
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          <Trans>Retry</Trans>
        </Button>
      </div>
    );
  }

  if (!mangaEntity) {
    return (
      <div className="rounded-3xl border border-border bg-card p-12 text-center shadow-lg">
        <p className="text-lg text-muted-foreground"><Trans>We could not find this manga. It may have been removed.</Trans></p>
        <Button variant="ghost" className="mt-4" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          <Trans>Go Back</Trans>
        </Button>
      </div>
    );
  }


  const coverImageUrl =
    mangaDexUtils.getCoverArt(mangaEntity) ?? '/placeholder-manga-cover.jpg';
  const mangaTitle = mangaDexUtils.getTitle(mangaEntity.attributes.title);
  const primaryAlternativeTitle = mangaEntity.attributes.altTitles
    .map((titleRecord) => mangaDexUtils.getTitle(titleRecord))
    .find((value) => value && value.toLowerCase() !== mangaTitle.toLowerCase());
  const descriptionText = mangaDexUtils.getDescription(mangaEntity.attributes.description);
  const publicationStatusText = mangaDexUtils.getStatusText(mangaEntity.attributes.status);
  const demographicText = mangaDexUtils.getDemographicText(mangaEntity.attributes.publicationDemographic);
  const contentRatingText = mangaDexUtils.getContentRatingText(mangaEntity.attributes.contentRating);
  const publicationYear = mangaEntity.attributes.year;
  const originalLanguage = mangaEntity.attributes.originalLanguage?.toUpperCase() ?? 'N/A';
  const translatedLanguages = (mangaEntity.attributes.availableTranslatedLanguages ?? []).filter((l): l is string => !!l);
  const authorList = mangaDexUtils.getAuthors(mangaEntity);
  const artistList = mangaDexUtils.getArtists(mangaEntity);

  // Get statistics from the statistics field
  const ratingValue = mangaEntity.statistics?.rating?.bayesian;
  const ratingDisplay = typeof ratingValue === 'number' ? ratingValue.toFixed(2) : 'N/A';
  const followerCount = mangaEntity.statistics?.follows;
  const followerDisplay = typeof followerCount === 'number' ? followerCount.toLocaleString() : 'N/A';

  const handleBackNavigation = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/search';
    }
  };


  const handleReadNow = () => {
    if (sortedChapters.length === 0) {
      toast({
        title: t`Chapters unavailable`,
        description: t`This series does not have readable chapters yet.`,
        variant: 'destructive',
      });
      return;
    }

    const earliestChapter = sortedChapters[0];
    setSelectedChapterIdentifier(earliestChapter.id);
    toast({
      title: t`Chapter ready`,
      description: t`Opening ${mangaDexUtils.formatChapterNumber(earliestChapter)}.`,
    });
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: t`Link copied`,
        description: t`Share this manga with your friends.`,
      });
    } catch {
      toast({
        title: t`Clipboard error`,
        description: t`We could not copy the link. Please copy it manually.`,
        variant: 'destructive',
      });
    }
  };

  const handleMoreOptions = () => {
    toast({
      title: t`More actions coming soon`,
      description: t`Additional options will be available in a future update.`,
    });
  };

  const handleTranslateDescription = () => {
    toast({
      title: t`Translation coming soon`,
      description: t`Vietnamese translation will be available in a future release.`,
    });
  };

  const getStatusButtonClass = (status: string) => {
    const baseClasses = 'inline-flex items-center rounded-sm px-3 py-1 text-sm font-medium transition-colors';
    switch (status?.toLowerCase()) {
      case 'ongoing':
        return baseClasses + ' bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400';
      case 'completed':
        return baseClasses + ' bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400';
      case 'hiatus':
        return baseClasses + ' bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400';
      case 'cancelled':
        return baseClasses + ' bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400';
      default:
        return baseClasses + ' bg-primary/10 text-primary hover:bg-primary/20';
    }
  };

  const getContentRatingButtonClass = (rating: string) => {
    const baseClasses = 'inline-flex items-center gap-1 rounded-sm border px-3 py-1 text-sm transition-colors';
    switch (rating?.toLowerCase()) {
      // case 'safe':
      //   return baseClasses + ' border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400';
      case 'suggestive':
        return baseClasses + ' border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400';
      case 'erotica':
        return baseClasses + ' border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400';
      // case 'pornographic':
      //   return baseClasses + ' border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400';
      default:
        return baseClasses + ' border-foreground/20 bg-background/30 text-foreground/90 hover:border-foreground/40 hover:bg-background/50';
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" className="px-2" onClick={handleBackNavigation}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          <Trans>Back</Trans>
        </Button>
      </div>

      <section className="relative rounded-3xl border border-border bg-card text-foreground shadow-2xl">
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <img
            src={coverImageUrl}
            alt=""
            className="h-full w-full object-cover opacity-20 dark:opacity-35"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/70 to-background/40 dark:from-neutral-950 dark:via-neutral-950/80 dark:to-neutral-900/40" />
        </div>

        <div className="relative flex flex-col gap-10 px-6 py-8 md:flex-row md:px-12 md:py-14">
          <div className="flex flex-col items-center gap-6 md:w-[280px] md:items-start">
            <div className="overflow-hidden rounded-3xl border border-border/40 shadow-2xl">
              <img
                src={coverImageUrl}
                alt={mangaTitle}
                className="h-[380px] w-[260px] object-cover"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  (event.target as HTMLImageElement).src = '/placeholder-manga-cover.jpg';
                }}
              />
            </div>

            <div className="flex w-full flex-wrap gap-3">
              <FollowButton
                mangaId={mangaIdentifier}
                source="MANGADEX"
                initialIsFollowing={mangaResponse?.isFollowing ?? false}
                variant="outline"
                className="flex-1 min-w-[160px] border-border/70 bg-background/60 text-foreground hover:bg-accent"
              />
              <Button className="flex-1 min-w-[160px] bg-rose-600 hover:bg-rose-700 text-white shadow-lg" onClick={handleReadNow}>
                <BookOpen className="mr-2 h-4 w-4" />
                Read Now
              </Button>
            </div>

            <div className="flex w-full flex-wrap gap-3">
              <Button
                variant="outline"
                className="flex-1 min-w-[140px] border-border/70 bg-background/60 text-foreground hover:bg-accent hover:text-foreground"
                onClick={handleShareLink}
              >
                <Share2 className="mr-2 h-4 w-4" />
                <Trans>Share</Trans>
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-w-[140px] border-border/70 bg-background/60 text-foreground hover:bg-accent hover:text-foreground"
                onClick={handleMoreOptions}
              >
                <MoreVertical className="mr-2 h-4 w-4" />
                <Trans>More</Trans>
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">{publicationStatusText}</p>
              <h1 className="text-4xl font-extrabold leading-tight text-foreground md:text-5xl">
                {mangaTitle}
              </h1>
              {primaryAlternativeTitle && (
                <p className="text-lg text-muted-foreground">{primaryAlternativeTitle}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {authorList.length > 0 && (
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/70"><Trans>Author</Trans></span>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex flex-wrap gap-x-1">
                    {authorList.map((author, i) => (
                      <React.Fragment key={author.id}>
                        <button
                          type="button"
                          onClick={() => navigate({ to: '/author/$authorId', params: { authorId: author.id } })}
                          className="text-foreground hover:text-rose-500 hover:underline transition-colors"
                        >
                          {author.name}
                        </button>
                        {i < authorList.length - 1 && <span className="text-muted-foreground">,</span>}
                      </React.Fragment>
                    ))}
                  </span>
                </span>
              )}
              {artistList.length > 0 && (
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-foreground/70"><Trans>Artist</Trans></span>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex flex-wrap gap-x-1">
                    {artistList.map((artist, i) => (
                      <React.Fragment key={artist.id}>
                        <button
                          type="button"
                          onClick={() => navigate({ to: '/author/$authorId', params: { authorId: artist.id } })}
                          className="text-foreground hover:text-rose-500 hover:underline transition-colors"
                        >
                          {artist.name}
                        </button>
                        {i < artistList.length - 1 && <span className="text-muted-foreground">,</span>}
                      </React.Fragment>
                    ))}
                  </span>
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="border-foreground/20 bg-background/30 text-foreground/90">
                <Calendar className="mr-1 h-3 w-3" />
                {publicationYear ?? '?'}
              </Badge>
              <button
                type="button"
                onClick={() => navigate({ to: '/search' as string, search: { status: mangaEntity.attributes.status } as Record<string, string> })}
                className={getStatusButtonClass(mangaEntity.attributes.status)}
              >
                {publicationStatusText ?? '?'}
              </button>
              {mangaEntity.attributes.contentRating && mangaEntity.attributes.contentRating !== 'safe' && (
                <button
                  type="button"
                  onClick={() => navigate({ to: '/search' as string, search: { contentRating: mangaEntity.attributes.contentRating } as Record<string, string> })}
                  className={getContentRatingButtonClass(mangaEntity.attributes.contentRating)}
                >
                  <Globe className="h-3 w-3" />
                  {contentRatingText}
                </button>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Community Score */}
              <div className="group relative flex items-center gap-3 rounded-2xl bg-background/50 p-4 backdrop-blur">
                <Star className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="text-xl font-semibold text-foreground">{ratingDisplay}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground"><Trans>Community Score</Trans></p>
                </div>
                {/* Distribution tooltip */}
                <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    {ratingDisplay} Bayesian · {typeof mangaEntity.statistics?.rating?.average === 'number' ? mangaEntity.statistics.rating.average.toFixed(4) : 'N/A'} Average
                  </p>
                  {(() => {
                    const dist = mangaEntity.statistics?.rating?.distribution;
                    if (!dist) return <p className="text-xs text-muted-foreground">No distribution data</p>;
                    const entries = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => ({ star: n, count: dist[String(n)] ?? 0 }));
                    const maxCount = Math.max(...entries.map(e => e.count), 1);
                    const total = entries.reduce((s, e) => s + e.count, 0);
                    return (
                      <>
                        <div className="space-y-1">
                          {entries.map(({ star, count }) => (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="w-3 shrink-0 text-right text-muted-foreground">{star}</span>
                              <div className="flex-1 rounded-full bg-muted/60 h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-rose-500"
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                              <span className="w-7 shrink-0 text-right tabular-nums text-muted-foreground">({count})</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-right text-xs text-muted-foreground">{total} ratings</p>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-background/50 p-4 backdrop-blur">
                <Heart className="h-6 w-6 text-rose-500" />
                <div>
                  <p className="text-xl font-semibold text-foreground">{followerDisplay}</p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground"><Trans>Readers</Trans></p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-background/50 p-4 backdrop-blur">
                <BookOpen className="h-6 w-6 text-sky-500" />
                <div>
                  <p className="text-xl font-semibold text-foreground">
                    {totalChapterCount > 0 ? totalChapterCount : '—'}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground"><Trans>Chapters</Trans></p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground"><Trans>Synopsis</Trans></h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleTranslateDescription}
                >
                  <Trans>Translate to Vietnamese</Trans>
                </Button>
              </div>
              <p className="whitespace-pre-line text-base leading-relaxed text-muted-foreground">
                {descriptionText}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr,3fr]">
        {/* Information Panel - Left Side (1/4) */}
        <div className="space-y-6">
          <Card className="border bg-card shadow-sm">
            <CardContent className="p-6">
              {/* Header with toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-foreground"><Trans>Information</Trans></h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setInfoOpen((v) => !v)}
                >
                  {infoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {/* Animated content */}
              <div className={cn('grid transition-all duration-300 ease-in-out', infoOpen ? 'grid-rows-[1fr] mt-4' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <div className="space-y-5">

                    {/* Basic info */}
                    <dl className="space-y-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground"><Trans>Status</Trans></dt>
                        <dd className="text-right text-foreground/80">{publicationStatusText}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground"><Trans>Publication Year</Trans></dt>
                        <dd className="text-right text-foreground/80">{publicationYear ?? '—'}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground"><Trans>Original Language</Trans></dt>
                        <dd className="text-right text-foreground/80">{originalLanguage}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground"><Trans>Languages</Trans></dt>
                        <dd className="text-right text-foreground/80">
                          {translatedLanguages.length > 0
                            ? translatedLanguages.map((code: string) => code.toUpperCase()).join(', ')
                            : '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="font-semibold text-foreground"><Trans>Last Updated</Trans></dt>
                        <dd className="text-right text-foreground/80">
                          {mangaDexUtils.formatRelativeTime(mangaEntity.attributes.updatedAt)}
                        </dd>
                      </div>
                    </dl>

                    {/* Alternative Titles */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground"><Trans>Alternative Titles</Trans></h4>
                      {allAltTitles.length > 0 && (
                        <ul className="space-y-1">
                          {allAltTitles.map(({ lang, value }, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono uppercase text-muted-foreground">{lang}</span>
                              <span className="text-foreground/80">{value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Tag groups */}
                    {Object.entries(tagsByGroup).map(([group, tags]) => (
                      <div key={group} className="space-y-2">
                        <h4 className="text-sm font-semibold capitalize text-foreground">{group}</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => navigate({ to: '/search' as string, search: { includedTags: tag.id } as Record<string, string> })}
                              className="inline-flex items-center rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/80 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                            >
                              {mangaDexUtils.getTitle(tag.attributes.name)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Demographic */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground"><Trans>Demographic</Trans></h4>
                      {demographicText && demographicText !== 'None' && (
                        <button
                          type="button"
                          onClick={() => navigate({ to: '/search' as string, search: { demographic: mangaEntity.attributes.publicationDemographic ?? '' } as Record<string, string> })}
                          className="inline-flex items-center rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-xs font-medium text-foreground/80 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                        >
                          {demographicText}
                        </button>
                      )}
                    </div>


                    {/* Read or Buy */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground"><Trans>Read or Buy</Trans></h4>
                      {externalLinks.buy.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {externalLinks.buy.map(({ label, url }) => (
                            <a
                              key={label}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent hover:border-border transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Track */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground"><Trans>Track</Trans></h4>
                      {externalLinks.track.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {externalLinks.track.map(({ label, url }) => (
                            <a
                              key={label}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent hover:border-border transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Side - Tab System */}
        <div className="flex flex-col gap-0">
          {/* Tab Bar */}
          <div className="relative flex rounded-t-xl border border-b-0 border-border bg-muted/40 px-2 pt-2">
            {/* Sliding active-tab background */}
            <div
              className={cn(
                'pointer-events-none absolute bottom-0 top-2 rounded-t-lg bg-card shadow-sm',
                tabIndicator.ready && 'transition-all duration-200 ease-out',
              )}
              style={{ left: tabIndicator.left, width: tabIndicator.width }}
            />
            {visibleTabs.map((tab, i) => (
              <button
                key={tab.value}
                ref={(el) => { tabButtonRefs.current[i] = el; }}
                type="button"
                onClick={() => setTab(tab.value)}
                className={cn(
                  'relative z-10 px-4 py-2 text-sm font-medium transition-colors rounded-t-lg',
                  activeTab === tab.value
                    ? 'text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-card'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {tabLabels[tab.value]}
              </button>
            ))}
          </div>

          <Card className="rounded-tl-none border bg-card shadow-sm">
            <CardContent className="overflow-hidden p-6">
              <div
                key={activeTab}
                className={cn(
                  'animate-in duration-200 ease-out',
                  slideDir === 'right' ? 'slide-in-from-right-8' : 'slide-in-from-left-8',
                )}
              >

                {/* ── Chapters Tab ── */}
                {activeTab === 'chapters' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-foreground"><Trans>Chapter List</Trans></h2>
                      <span className="text-sm text-muted-foreground">
                        {totalChapterCount} <Trans>{totalChapterCount === 1 ? 'chapter' : 'chapters'}</Trans>
                      </span>
                    </div>

                    {isChapterLoading ? (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <Skeleton key={index} className="h-20 rounded-xl" />
                        ))}
                      </div>
                    ) : chapterError ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-600">
                        <Trans>Failed to load chapters. Please try again later.</Trans>
                      </div>
                    ) : totalChapterCount === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-muted-foreground">
                        <Trans>Chapters have not been published yet.</Trans>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {volumeEntries.map(([volumeLabel, volumeChapters]) => {
                          const safeLabel = volumeLabel === 'No Volume' ? t`No Volume` : t`Volume ` + volumeLabel;
                          return (
                            <div
                              key={volumeLabel}
                              className="rounded-2xl border border-border bg-muted/20 p-5 shadow-sm"
                            >
                              <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Book className="h-5 w-5 text-muted-foreground" />
                                  <p className="text-lg font-semibold text-foreground">{safeLabel}</p>
                                </div>
                                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  {volumeChapters.length} <Trans>{volumeChapters.length === 1 ? 'chapter' : 'chapters'}</Trans>
                                </span>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                {volumeChapters.map((chapterItem) => {
                                  const chapterTitle = mangaDexUtils.formatChapterNumber(chapterItem);
                                  const chapterDate = mangaDexUtils.formatDate(
                                    chapterItem.attributes.publishAt,
                                    'en-US'
                                  );
                                  const isSelected = selectedChapterIdentifier === chapterItem.id;
                                  const chapterClasses = [
                                    'group flex items-center justify-between rounded-2xl border px-4 py-3 text-left shadow-sm transition',
                                    isSelected
                                      ? 'border-primary bg-primary/10 shadow-md'
                                      : 'border-transparent bg-card hover:border-primary/30 hover:bg-accent/50',
                                  ].join(' ');
                                  return (
                                    <button
                                      key={chapterItem.id}
                                      type="button"
                                      onClick={() => {
                                        const ext = chapterItem.attributes.externalUrl;
                                        if (ext) {
                                          window.open(ext, '_blank', 'noopener,noreferrer');
                                        } else {
                                          navigate({ to: '/chapter/$chapterId', params: { chapterId: chapterItem.id } });
                                        }
                                      }}
                                      className={chapterClasses}
                                    >
                                      <div>
                                        <p className="font-medium text-foreground flex items-center gap-1.5 min-w-0">
                                          <LanguageFlag languageCode={chapterItem.attributes.translatedLanguage} className="h-3 w-4 shrink-0" />
                                          {chapterItem.attributes.externalUrl && (
                                            <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-500" />
                                          )}
                                          <span className="truncate">{chapterTitle}</span>
                                        </p>
                                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                          <span>{chapterDate}</span>
                                          {(() => {
                                            const groupRels = (chapterItem.relationships?.filter((r) => r.type === 'scanlation_group') ?? [])
                                              .map((r) => ({ id: r.id, name: (r.attributes as { name?: string } | undefined)?.name }))
                                              .filter((g): g is { id: string; name: string } => !!g.name);
                                            if (groupRels.length === 0) return (
                                              <>
                                                <span className="text-border">·</span>
                                                <Users className="h-3 w-3" />
                                                <span className="text-muted-foreground italic"><Trans>No group</Trans></span>
                                              </>
                                            );
                                            return (
                                              <>
                                                <span className="text-border">·</span>
                                                {groupRels.map((gr) => (
                                                  <button
                                                    key={gr.id}
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate({ to: '/group/mangadex/$groupId', params: { groupId: gr.id } });
                                                    }}
                                                    className="flex items-center gap-1 hover:underline text-muted-foreground hover:text-primary transition-colors"
                                                  >
                                                    <Users className="h-3 w-3" />
                                                    <span className="line-clamp-1 max-w-[120px]">{gr.name}</span>
                                                  </button>
                                                ))}
                                              </>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      {readChapterIds.has(chapterItem.id)
                                        ? <EyeOff className="h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition" />
                                        : <Eye className="h-4 w-4 flex-shrink-0 text-foreground/70 transition group-hover:text-primary" />
                                      }
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Comments Tab ── */}
                {activeTab === 'comments' && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <Users className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground"><Trans>Comments coming soon</Trans></p>
                    <p className="text-sm text-muted-foreground">
                      <Trans>Community discussion will be available in a future update.</Trans>
                    </p>
                  </div>
                )}

                {/* ── Related Tab ── */}
                {activeTab === 'related' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground"><Trans>Related Titles</Trans></h2>
                    {relatedItems.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-muted-foreground">
                        <Trans>No related titles found.</Trans>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {Object.entries(relatedByGroup)
                          .sort(([a], [b]) => {
                            const pa = RELATED_PRIORITY[a] ?? 500;
                            const pb = RELATED_PRIORITY[b] ?? 500;
                            return pa - pb;
                          })
                          .map(([group, items]) => (
                            <div key={group} className="space-y-3">
                              <h3 className="text-base font-semibold capitalize text-foreground">
                                {RELATED_LABELS[group] ?? group}
                              </h3>
                              <div className="space-y-3">
                                {items.map(({ id, queryIndex }) => {
                                  const q = relatedQueries[queryIndex];
                                  const relManga = (q?.data as { data?: { data?: Manga } } | undefined)?.data?.data;
                                  const coverUrl = relManga ? mangaDexUtils.getCoverArt(relManga) : null;
                                  const title = relManga ? mangaDexUtils.getTitle(relManga.attributes.title) : null;
                                  const status = relManga?.attributes?.status;
                                  const description = relManga
                                    ? mangaDexUtils.getDescription(relManga.attributes.description)
                                    : null;
                                  const tags = relManga?.attributes?.tags ?? [];
                                  if (q?.isLoading) return <Skeleton key={id} className="h-32 rounded-xl" />;
                                  // Orphaned relation (manga deleted/private on MangaDex) — skip silently.
                                  if (q?.isError || !relManga) return null;
                                  return (
                                    <button
                                      key={relManga.id}
                                      type="button"
                                      onClick={() =>
                                        navigate({
                                          to: '/manga/$mangaId',
                                          params: { mangaId: relManga.id },
                                        })
                                      }
                                      className="flex w-full gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent/30"
                                    >
                                      <div className="shrink-0 overflow-hidden rounded-lg">
                                        {coverUrl ? (
                                          <img
                                            src={coverUrl}
                                            alt={title ?? ''}
                                            className="h-[120px] w-[80px] object-cover"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          <div className="flex h-[120px] w-[80px] items-center justify-center bg-muted">
                                            <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0 flex-1 space-y-1.5">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                          <p className="font-semibold text-foreground line-clamp-1">{title}</p>
                                          {status && (
                                            <span
                                              className={cn(
                                                'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                                                status === 'ongoing' && 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
                                                status === 'completed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                                                status === 'hiatus' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                                status === 'cancelled' && 'bg-red-500/10 text-red-600 dark:text-red-400',
                                              )}
                                            >
                                              {status.charAt(0).toUpperCase() + status.slice(1)}
                                            </span>
                                          )}
                                        </div>
                                        {tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {tags.slice(0, 6).map((tag) => (
                                              <span
                                                key={tag.id}
                                                className="rounded-sm border border-border/50 bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                                              >
                                                {mangaDexUtils.getTitle(tag.attributes.name)}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                        {description && (
                                          <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Recommendations Tab ── */}
                {activeTab === 'recommendations' && (
                  <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                    <div className="rounded-full bg-muted p-4">
                      <Star className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-semibold text-foreground"><Trans>Recommendations coming soon</Trans></p>
                    <p className="text-sm text-muted-foreground">
                      <Trans>Personalized recommendations will be available in a future update.</Trans>
                    </p>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default MangaDetail;