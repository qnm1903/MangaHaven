import React, { useState, useMemo } from 'react';
import { Trans } from '@lingui/react/macro';
import { t, msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    BookOpen,
    RefreshCw,
    Clock,
    Eye,
    EyeOff,
    Rss,
    Heart,
    Filter,
    Users,
    MessageSquare,
    SquareArrowOutUpRight,
} from 'lucide-react';
import { followService, type ChapterFeedItem, type FeedParams } from '@/services/follow_service';
import { LanguageFlag } from '@/components/LanguageFlag';
import { useAtomValue } from 'jotai';
import { chapterLanguagesAtom } from '@/store/settingsAtoms';
import { readingHistoryAtom } from '@/store/historyAtoms';
import { AuthGuard } from '@/components/auth/AuthGuard';


const DATE_RANGE_OPTIONS = [
    { label: msg`All time`, value: undefined },
    { label: msg`Today`, value: 'today' as const },
    { label: msg`This week`, value: 'week' as const },
    { label: msg`This month`, value: 'month' as const },
];

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return t`${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t`${hours}h ago`;
    const days = Math.floor(hours / 24);
    return t`${days}d ago`;
}

interface MangaGroup {
    mangaId: string;
    mangaTitle: string;
    coverUrl: string | null;
    chapters: ChapterFeedItem[];
}

const CHAPTERS_PER_GROUP = 3;

function groupByManga(chapters: ChapterFeedItem[]): MangaGroup[] {
    // Collect all chapters per manga
    const map: Record<string, MangaGroup> = {};
    for (const ch of chapters) {
        if (!map[ch.mangaId]) {
            map[ch.mangaId] = {
                mangaId: ch.mangaId,
                mangaTitle: ch.mangaTitle,
                coverUrl: ch.coverUrl,
                chapters: [],
            };
        }
        map[ch.mangaId].chapters.push(ch);
    }

    // For each manga sort newest-first, then split into chunks of CHAPTERS_PER_GROUP
    const allItems: MangaGroup[] = [];
    for (const manga of Object.values(map)) {
        const sorted = [...manga.chapters].sort(
            (a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
        );
        for (let i = 0; i < sorted.length; i += CHAPTERS_PER_GROUP) {
            allItems.push({
                mangaId: manga.mangaId,
                mangaTitle: manga.mangaTitle,
                coverUrl: manga.coverUrl,
                chapters: sorted.slice(i, i + CHAPTERS_PER_GROUP),
            });
        }
    }

    // Sort all items across all manga by their newest chapter
    return allItems.sort(
        (a, b) =>
            new Date(b.chapters[0].publishAt).getTime() -
            new Date(a.chapters[0].publishAt).getTime()
    );
}

function MangaCover({ coverUrl, title }: { coverUrl: string | null; title: string }) {
    const [imgError, setImgError] = React.useState(false);

    if (!coverUrl || imgError) {
        return (
            <div className="w-[140px] shrink-0 h-full bg-muted flex items-center justify-center rounded-l-lg">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
        );
    }

    return (
        <img
            src={coverUrl}
            alt={title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-[140px] shrink-0 h-full object-cover rounded-l-lg"
        />
    );
}

const LatestUpdatesContent: React.FC = () => {
    const [page, setPage] = useState(1);
    const [dateRange, setDateRange] = useState<FeedParams['dateRange']>(undefined);
    const limit = 20;
    const navigate = useNavigate();
    const { _ } = useLingui();
    const chapterLanguages = useAtomValue(chapterLanguagesAtom);
    const lang = chapterLanguages.join(',');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['follows-feed', page, limit, dateRange, lang],
        queryFn: () => followService.getFollowedMangaFeed({ page, limit, dateRange, lang }),
        staleTime: 60_000,
    });

    const chapters: ChapterFeedItem[] = data?.data ?? [];
    const total = data?.total ?? 0;
    const hasMore = data?.hasMore ?? false;
    const groups = groupByManga(chapters);
    const history = useAtomValue(readingHistoryAtom);
    const readChapterIds = useMemo(() => new Set(history.map((e) => e.chapterId)), [history]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
                        <Rss className="h-7 w-7 text-primary" />
                        <Trans>Latest Updates</Trans>
                    </h1>
                    <p className="text-muted-foreground"><Trans>New chapters from manga you follow</Trans></p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link to="/favorites">
                            <Heart className="mr-2 h-4 w-4" />
                            <Trans>My Library</Trans>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                {DATE_RANGE_OPTIONS.map((opt) => (
                    <Button
                        key={String(opt.value)}
                        variant={dateRange === opt.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setDateRange(opt.value); setPage(1); }}
                    >
                        {_(opt.label)}
                    </Button>
                ))}
            </div>

            {/* Stats bar */}
            {!isLoading && !error && (
                <p className="text-sm text-muted-foreground">
                    <Trans>{total} chapter update{total !== 1 ? 's' : ''} found</Trans>
                </p>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-800 bg-red-950/40 p-6 text-center text-red-400">
                    <Trans>Failed to load feed. Please try again.</Trans>
                    <Button variant="outline" size="sm" className="ml-4" onClick={() => refetch()}>
                        <Trans>Retry</Trans>
                    </Button>
                </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex overflow-hidden rounded-lg bg-card border border-border h-[214px]">
                            <Skeleton className="w-[140px] shrink-0 rounded-none rounded-l-lg" />
                            <div className="flex-1 p-4 space-y-3">
                                <Skeleton className="h-5 w-1/2" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Grouped manga feed */}
            {!isLoading && !error && groups.length > 0 && (
                <>
                    <div className="space-y-3">
                        {groups.map((group, groupIdx) => (
                            <div
                                key={`${group.mangaId}-${groupIdx}`}
                                className="flex overflow-hidden rounded-lg bg-card border border-border hover:border-foreground/20 transition-colors"
                            >
                                {/* Cover image */}
                                <Link
                                    to="/manga/$mangaId"
                                    params={{ mangaId: group.mangaId }}
                                    className="self-stretch flex shrink-0"
                                >
                                    <MangaCover coverUrl={group.coverUrl} title={group.mangaTitle} />
                                </Link>

                                {/* Right side content */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    {/* Manga title row */}
                                    <div className="px-4 pt-3 pb-2 border-b border-border">
                                        <Link
                                            to="/manga/$mangaId"
                                            params={{ mangaId: group.mangaId }}
                                            className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1 text-base"
                                        >
                                            {group.mangaTitle}
                                        </Link>
                                    </div>

                                    {/* Chapter rows — always CHAPTERS_PER_GROUP rows for uniform height */}
                                    <div className="flex-1">
                                        {group.chapters.map((ch) => (
                                            <div
                                                key={ch.chapterId}
                                                onClick={() => {
                                                    if (ch.externalUrl) {
                                                        window.open(ch.externalUrl, '_blank', 'noopener,noreferrer');
                                                    } else {
                                                        navigate({
                                                            to: '/chapter/$chapterId',
                                                            params: { chapterId: ch.chapterId },
                                                        });
                                                    }
                                                }}
                                                className="flex items-center gap-3 px-4 h-14 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                                            >
                                                {/* Language flag */}
                                                {ch.translatedLanguage && (
                                                    <LanguageFlag
                                                        languageCode={ch.translatedLanguage}
                                                        className="h-3.5 w-[18px] shrink-0"
                                                    />
                                                )}

                                                {/* Chapter label + title */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-foreground flex items-center gap-1">
                                                        {ch.externalUrl && (
                                                            <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-500" />
                                                        )}
                                                        {readChapterIds.has(ch.chapterId)
                                                            ? <EyeOff className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                                                            : <Eye className="h-3 w-3 shrink-0 text-foreground/80" />
                                                        }
                                                        <span className="truncate">
                                                            {[ch.volume ? `Vol. ${ch.volume}` : null, ch.chapterNumber ? `Ch. ${ch.chapterNumber}` : 'Oneshot'].filter(Boolean).join(' ')}
                                                            {ch.title && (
                                                                <span className="text-muted-foreground font-normal">
                                                                    {' '}— {ch.title}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                    {/* Scanlation groups */}
                                                    {((ch.scanlationGroups?.length ?? 0) > 0 || ch.scanlationGroup) && (
                                                        <div className="flex items-center gap-x-1.5 mt-0.5 flex-wrap">
                                                            <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                                                            {(ch.scanlationGroups?.length
                                                                ? ch.scanlationGroups
                                                                : [{ id: ch.scanlationGroupId ?? '', name: ch.scanlationGroup! }]
                                                            ).map((group, i) => (
                                                                <React.Fragment key={group.id || group.name}>
                                                                    {i > 0 && <span className="text-xs text-muted-foreground">·</span>}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (group.id) navigate({ to: '/group/mangadex/$groupId', params: { groupId: group.id } });
                                                                        }}
                                                                        className="text-xs text-primary hover:underline"
                                                                    >
                                                                        {group.name}
                                                                    </button>
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right: 2-story — readable time + comment count */}
                                                <div className="ml-auto flex flex-col items-start gap-0.5 shrink-0 w-[84px]">
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap w-full justify-start">
                                                        <Clock className="h-3 w-3" />
                                                        {timeAgo(ch.readableAt ?? ch.publishAt)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap w-full justify-start">
                                                        <MessageSquare className="h-3 w-3" />
                                                        {ch.commentCount ?? 0}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Empty spacer rows to keep card height uniform */}
                                        {Array.from({ length: CHAPTERS_PER_GROUP - group.chapters.length }).map((_, i) => (
                                            <div key={`spacer-${i}`} className="h-14 border-b border-border last:border-b-0" />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <Trans>Previous</Trans>
                        </Button>
                        <span className="text-sm text-muted-foreground"><Trans>Page {page}</Trans></span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!hasMore}
                        >
                            <Trans>Next</Trans>
                        </Button>
                    </div>
                </>
            )}

            {/* Empty state */}
            {!isLoading && !error && chapters.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-12 text-center space-y-4">
                    <Rss className="w-16 h-16 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-xl font-semibold text-foreground"><Trans>No updates yet</Trans></h3>
                    <p className="text-muted-foreground">
                        {total === 0
                            ? <Trans>Follow some manga to see their latest chapters here!</Trans>
                            : <Trans>No chapters found for the selected time range.</Trans>}
                    </p>
                    <Button asChild>
                        <Link to="/search"><Trans>Browse Manga</Trans></Link>
                    </Button>
                </div>
            )}
        </div>
    );
};

const LatestUpdates: React.FC = () => (
    <AuthGuard>
        <LatestUpdatesContent />
    </AuthGuard>
);

export default LatestUpdates;