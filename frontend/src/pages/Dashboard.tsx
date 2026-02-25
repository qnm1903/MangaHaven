import React, { useMemo } from 'react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAtom, useAtomValue } from 'jotai';
import { chapterLanguagesAtom } from '@/store/settingsAtoms';
import { recentHistoryAtom, readingHistoryAtom, type ReadingHistoryEntry } from '@/store/historyAtoms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LazyMangaCover from '@/components/manga/LazyMangaCover';
import { FeaturedMangaSlider } from '@/components/manga/FeaturedMangaSlider';
import { LatestMangaCard } from '@/components/dashboard/LatestMangaCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLatestManga,
  useLatestChapters,
  usePopularNewTitles,
} from '@/hooks/useMangaDex';
import type { Manga, MangaList, Chapter } from '@/types/mangadex_types';
import { formatRelativeTime } from '@/utils/mangaDexUtils';
import { BookOpen, Clock, History as HistoryIcon, Sparkles, Star, SquareArrowOutUpRight, Users } from 'lucide-react';
import { LatestCommentsWidget } from '@/components/dashboard/LatestCommentsWidget';
import { LanguageFlag } from '@/components/LanguageFlag';

const HISTORY_RECENT_MAX = 10;

interface BackendResponse<T> {
  success: boolean;
  data: T;
  cached: boolean;
  message?: string;
}

const FALLBACK_COVER = '/image-placeholder-612x612.jpg';

function getErrorMessage(error: unknown): string {
  if (!error) return t`Unable to load data.`;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return t`An unknown error occurred.`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t`Just now`;
  if (minutes < 60) return t`${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t`${hours}h ago`;
  const days = Math.floor(hours / 24);
  return t`${days}d ago`;
}

const Dashboard: React.FC = () => {
  const recentHistory = useAtomValue(recentHistoryAtom);
  const [fullHistory] = useAtom(readingHistoryAtom);
  const [chapterLanguages] = useAtom(chapterLanguagesAtom);
  const navigate = useNavigate();

  const {
    data: latestChaptersData,
    isLoading: isChaptersLoading,
    error: chaptersError,
  } = useLatestChapters(12, chapterLanguages);

  const {
    data: latestData,
    isLoading: isLatestLoading,
    error: latestError,
  } = useLatestManga(16, 0, chapterLanguages);

  const {
    data: featuredData,
    isLoading: isFeaturedLoading,
    error: featuredError,
  } = usePopularNewTitles(10);

  const latestChapters = useMemo<Chapter[]>(() => {
    const response = latestChaptersData as BackendResponse<{ data: Chapter[] }> | undefined;
    return response?.data?.data ?? [];
  }, [latestChaptersData]);

  const featuredManga = useMemo<Manga[]>(() => {
    const response = featuredData as BackendResponse<MangaList> | undefined;
    return response?.data?.data ?? [];
  }, [featuredData]);

  const newSeriesManga = useMemo<Manga[]>(() => {
    const response = latestData as BackendResponse<MangaList> | undefined;
    return response?.data?.data?.slice(0, 12) ?? [];
  }, [latestData]);

  // Group recent history by manga (max 3 chapters per manga)
  const historyGroups = useMemo(() => {
    const map: Record<string, { mangaId: string; mangaTitle: string; chapters: ReadingHistoryEntry[]; newestTs: number }> = {};
    for (const entry of recentHistory) {
      if (!map[entry.mangaId]) {
        map[entry.mangaId] = { mangaId: entry.mangaId, mangaTitle: entry.mangaTitle, chapters: [], newestTs: entry.timestamp };
      }
      if (map[entry.mangaId].chapters.length < 3) map[entry.mangaId].chapters.push(entry);
      if (entry.timestamp > map[entry.mangaId].newestTs) map[entry.mangaId].newestTs = entry.timestamp;
    }
    return Object.values(map).sort((a, b) => b.newestTs - a.newestTs);
  }, [recentHistory]);

  return (
    <div className="space-y-10">
      {/* Featured Popular New Titles Slider */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground"><Trans>Featured Manga</Trans></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans>Top 10 trending new manga this month</Trans>
          </p>
        </div>

        {isFeaturedLoading ? (
          <Card className="h-[500px] animate-pulse border-none bg-gradient-to-br from-neutral-900 via-neutral-950 to-black">
            <div className="flex h-full items-center justify-center">
              <Sparkles className="h-12 w-12 animate-pulse text-white/20" />
            </div>
          </Card>
        ) : featuredError ? (
          <Card className="h-[500px] border-border/40 bg-muted/20">
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p><Trans>Unable to load featured data</Trans></p>
            </div>
          </Card>
        ) : (
          <FeaturedMangaSlider manga={featuredManga} />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground"><Trans>Latest Updates</Trans></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans>A collection of newly uploaded chapters</Trans>
          </p>
        </div>
        {isChaptersLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, skeletonIndex) => (
              <Card key={skeletonIndex} className="border border-border/40 bg-muted/20">
                <CardContent className="flex h-full items-center gap-4 p-4">
                  <Skeleton className="aspect-[3/4] w-1/5 min-w-[60px] rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <div className="flex justify-end">
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : chaptersError ? (
          <Card className="border border-destructive/40 bg-destructive/10">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-destructive">
                {getErrorMessage(chaptersError)}
              </p>
            </CardContent>
          </Card>
        ) : latestChapters.length === 0 ? (
          <Card className="border border-border/40 bg-muted/20">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                <Trans>No new chapters yet. Try again in a few minutes.</Trans>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestChapters.map((chapter) => {
              const mangaRel = chapter.relationships?.find((r) => r.type === 'manga');
              const groupRels = (chapter.relationships?.filter((r) => r.type === 'scanlation_group') ?? [])
                .map((r) => ({ id: r.id, name: (r.attributes?.name as string) ?? null }))
                .filter((g): g is { id: string; name: string } => !!g.name);
              const mangaId = mangaRel?.id ?? '';
              const titleRecord = mangaRel?.attributes?.title as Record<string, string> | undefined;
              const mangaTitle = titleRecord?.en ?? Object.values(titleRecord ?? {})[0] ?? 'Unknown';
              const coverUrl = (mangaRel?.attributes?.coverUrl as string) ?? FALLBACK_COVER;
              const chapterNum = chapter.attributes.chapter;
              const chapterTitle = chapter.attributes.title;
              const publishAt = chapter.attributes.readableAt || chapter.attributes.publishAt;
              const translatedLanguage = chapter.attributes.translatedLanguage ?? 'en';
              const chapterLabel = chapterNum
                ? `Ch. ${chapterNum}${chapterTitle ? ` - ${chapterTitle}` : ''}`
                : 'Oneshot';
              const externalUrl = chapter.attributes.externalUrl;

              return (
                <Link key={chapter.id} to="/manga/$mangaId" params={{ mangaId }} className="block">
                  <Card className="border border-border/40 bg-background/80 transition hover:-translate-y-1 hover:shadow-md">
                    <CardContent className="flex h-full gap-4 p-4">
                      <div className="relative aspect-[3/4] basis-1/5 overflow-hidden rounded-md bg-muted">
                        <LazyMangaCover
                          title={mangaTitle}
                          srcOverride={coverUrl}
                          fallbackSrc={FALLBACK_COVER}
                          sizes="(min-width: 1024px) 120px, 80px"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <h3 className="line-clamp-1 text-lg font-semibold text-foreground">{mangaTitle}</h3>
                        <div className="mt-1 flex items-center gap-1.5">
                          <LanguageFlag languageCode={translatedLanguage} className="h-3 w-4" />
                          <p
                            className="text-base text-primary hover:underline cursor-pointer flex items-center gap-1 min-w-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (externalUrl) {
                                window.open(externalUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                navigate({ to: '/chapter/$chapterId', params: { chapterId: chapter.id } });
                              }
                            }}
                          >
                            {externalUrl && <SquareArrowOutUpRight className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{chapterLabel}</span>
                          </p>
                        </div>
                        {groupRels.length > 0 ? (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {groupRels.map((gr) => (
                              <p
                                key={gr.id}
                                className="text-xs text-muted-foreground hover:underline cursor-pointer flex items-center gap-1 min-w-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate({ to: '/group/mangadex/$groupId', params: { groupId: gr.id } });
                                }}
                              >
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{gr.name}</span>
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3 shrink-0" />
                            <span className="italic"><Trans>No scanlation group info</Trans></span>
                          </p>
                        )}
                        <div className="mt-auto flex justify-end text-xs text-muted-foreground">
                          <span>{formatRelativeTime(publishAt)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground"><Trans>New Series</Trans></h2>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans>A collection of manga recently added to the catalog.</Trans>
          </p>
        </div>
        {isLatestLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 12 }).map((_, skeletonIndex) => (
              <Card key={skeletonIndex} className="border border-border/40 bg-muted/20">
                <Skeleton className="aspect-[3/4] w-full rounded-t-md" />
                <CardContent className="space-y-3 p-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : latestError ? (
          <Card className="border border-destructive/40 bg-destructive/10">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-destructive">
                {getErrorMessage(latestError)}
              </p>
            </CardContent>
          </Card>
        ) : newSeriesManga.length === 0 ? (
          <Card className="border border-border/40 bg-muted/20">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                <Trans>No new manga. Refresh or check back in a few minutes.</Trans>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {newSeriesManga.slice(0, 12).map((manga, index) => (
              <LatestMangaCard key={manga.id} manga={manga} priority={index < 6} />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <HistoryIcon className="h-5 w-5 text-primary" />
                  <Trans>Reading History</Trans>
                </CardTitle>
                <CardDescription className="mt-1"><Trans>Shows up to the last 10 chapters from this device.</Trans></CardDescription>
              </div>
              {fullHistory.length > HISTORY_RECENT_MAX && (
                <Link to="/reading-history">
                  <span className="text-xs text-primary hover:underline whitespace-nowrap">
                    <Trans>See all ({fullHistory.length})</Trans>
                  </span>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {historyGroups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground"><Trans>You haven't read any manga recently.</Trans></p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyGroups.map((group) => (
                  <div
                    key={group.mangaId}
                    className="flex overflow-hidden rounded-lg bg-background border border-border hover:border-foreground/20 transition-colors"
                  >
                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="px-3 pt-2 pb-1.5 border-b border-border">
                        <Link
                          to="/manga/$mangaId"
                          params={{ mangaId: group.mangaId }}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {group.mangaTitle}
                        </Link>
                      </div>
                      <div className="flex-1">
                        {group.chapters.map((entry) => (
                          <div
                            key={entry.chapterId}
                            onClick={() => {
                              if (entry.externalUrl) {
                                window.open(entry.externalUrl, '_blank', 'noopener,noreferrer');
                              } else {
                                navigate({ to: '/chapter/$chapterId', params: { chapterId: entry.chapterId } });
                              }
                            }}
                            className="flex items-center gap-2 px-3 h-10 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer last:border-b-0"
                          >
                            {entry.translatedLanguage && (
                              <LanguageFlag languageCode={entry.translatedLanguage} className="h-3 w-3.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-foreground flex items-center gap-1">
                                {entry.externalUrl && (
                                  <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-500" />
                                )}
                                <span className="truncate">
                                  {[entry.volume ? `Vol.${entry.volume}` : null, entry.chapterNumber ? `Ch.${entry.chapterNumber}` : 'Oneshot'].filter(Boolean).join(' ')}
                                  {entry.chapterTitle && (
                                    <span className="text-muted-foreground font-normal"> — {entry.chapterTitle}</span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                              <Clock className="h-3 w-3" />
                              {timeAgo(entry.timestamp)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {fullHistory.length > HISTORY_RECENT_MAX && (
                  <Link to="/reading-history" className="block">
                    <div className="rounded-lg border border-dashed border-border p-2 text-center text-xs text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                    <Trans>See {fullHistory.length - HISTORY_RECENT_MAX} more chapters →</Trans>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Star className="h-5 w-5 text-primary" />
              <Trans>Rankings</Trans>
            </CardTitle>
            <CardDescription><Trans>Manga that many readers are following this month.</Trans></CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <Trans>The rankings feature will be available soon.</Trans>
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <LatestCommentsWidget />
      </section>
    </div>
  );
};

export default Dashboard;