import React, { useMemo } from 'react';
import { Trans } from '@lingui/react/macro';
import { t } from '@lingui/core/macro';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAtom } from 'jotai';
import { readingHistoryAtom, type ReadingHistoryEntry } from '@/store/historyAtoms';
import { useManga } from '@/hooks/useMangaDex';
import { mangaDexUtils } from '@/utils/mangaDexUtils';
import type { Manga } from '@/types/mangadex_types';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LanguageFlag } from '@/components/LanguageFlag';
import {
  BookOpen,
  Clock,
  History,
  MessageSquare,
  SquareArrowOutUpRight,
  Trash2,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use_toast';

const CHAPTERS_PER_GROUP = 3;

interface HistoryGroup {
  mangaId: string;
  mangaTitle: string;
  chapters: ReadingHistoryEntry[];
  newestTimestamp: number;
}

function groupByManga(entries: ReadingHistoryEntry[]): HistoryGroup[] {
  const map: Record<string, HistoryGroup> = {};
  for (const entry of entries) {
    if (!map[entry.mangaId]) {
      map[entry.mangaId] = {
        mangaId: entry.mangaId,
        mangaTitle: entry.mangaTitle,
        chapters: [],
        newestTimestamp: entry.timestamp,
      };
    }
    if (map[entry.mangaId].chapters.length < CHAPTERS_PER_GROUP) {
      map[entry.mangaId].chapters.push(entry);
    }
    if (entry.timestamp > map[entry.mangaId].newestTimestamp) {
      map[entry.mangaId].newestTimestamp = entry.timestamp;
    }
  }
  return Object.values(map).sort((a, b) => b.newestTimestamp - a.newestTimestamp);
}

function MangaCoverById({ mangaId, title }: { mangaId: string; title: string }) {
  const [imgError, setImgError] = React.useState(false);
  const { data } = useManga(mangaId, ['cover_art'], undefined, false) as { data: { data: { data: Manga } } | undefined };
  const coverUrl = data?.data?.data ? mangaDexUtils.getCoverArt(data.data.data) : null;

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

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t`just now`;
  if (minutes < 60) return t`${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t`${hours}h ago`;
  const days = Math.floor(hours / 24);
  return t`${days}d ago`;
}

const ReadingHistory: React.FC = () => {
  const [history, setHistory] = useAtom(readingHistoryAtom);
  const navigate = useNavigate();
  const { toast } = useToast();

  const groups = useMemo(() => groupByManga(history), [history]);

  const handleClearHistory = () => {
    setHistory([]);
    toast({ title: t`History cleared`, description: t`Your reading history has been deleted.` });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            <Trans>Reading History</Trans>
          </h1>
          <p className="text-muted-foreground">
            {history.length > 0
              ? <Trans>{history.length} chapters read · saved on this device</Trans>
              : <Trans>Reading history is saved on this device</Trans>}
          </p>
        </div>
        {history.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/40 hover:border-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <Trans>Clear all</Trans>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle><Trans>Clear reading history?</Trans></AlertDialogTitle>
                <AlertDialogDescription>
                  <Trans>All {history.length} records will be permanently deleted. This action cannot be undone.</Trans>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                  <Trans>Clear all</Trans>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 py-20 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground/40" />
          <div>
            <p className="text-base font-medium text-foreground"><Trans>You haven't read any manga yet</Trans></p>
            <p className="mt-1 text-sm text-muted-foreground"><Trans>Reading history will appear here after you open a chapter.</Trans></p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/search"><Trans>Find manga to read</Trans></Link>
          </Button>
        </div>
      )}

      {/* Grouped feed */}
      {groups.length > 0 && (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.mangaId}
              className="flex overflow-hidden rounded-lg bg-card border border-border hover:border-foreground/20 transition-colors"
            >
              {/* Left: cover image */}
              <Link
                to="/manga/$mangaId"
                params={{ mangaId: group.mangaId }}
                className="self-stretch flex shrink-0"
              >
                <MangaCoverById mangaId={group.mangaId} title={group.mangaTitle} />
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

                {/* Chapter rows */}
                <div className="flex-1">
                  {group.chapters.map((entry) => (
                    <div
                      key={entry.chapterId}
                      onClick={() => {
                        if (entry.externalUrl) {
                          window.open(entry.externalUrl, '_blank', 'noopener,noreferrer');
                        } else {
                          navigate({
                            to: '/chapter/$chapterId',
                            params: { chapterId: entry.chapterId },
                          });
                        }
                      }}
                      className="flex items-center gap-3 px-4 h-14 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      {/* Language flag */}
                      {entry.translatedLanguage && (
                        <LanguageFlag
                          languageCode={entry.translatedLanguage}
                          className="h-3.5 w-[18px] shrink-0"
                        />
                      )}

                      {/* Chapter label + scanlation group */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground flex items-center gap-1">
                          {entry.externalUrl && (
                            <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-500" />
                          )}
                          <span className="truncate">
                            {[
                              entry.volume ? `Vol. ${entry.volume}` : null,
                              entry.chapterNumber ? `Ch. ${entry.chapterNumber}` : 'Oneshot',
                            ].filter(Boolean).join(' ')}
                            {entry.chapterTitle && (
                              <span className="text-muted-foreground font-normal">
                                {' '}— {entry.chapterTitle}
                              </span>
                            )}
                          </span>
                        </div>
                        {/* Scanlation groups — one line */}
                        {(entry.scanlationGroups?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-x-1.5 mt-0.5 flex-wrap">
                            <Users className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                            {entry.scanlationGroups.map((group, i) => (
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

                      {/* Right: timestamp + comment count */}
                      <div className="ml-auto flex flex-col items-start gap-0.5 shrink-0 w-[84px]">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap w-full justify-start">
                          <Clock className="h-3 w-3" />
                          {timeAgo(entry.timestamp)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap w-full justify-start">
                          <MessageSquare className="h-3 w-3" />
                          {entry.commentCount ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}
                  {/* Spacer rows to keep uniform card height */}
                  {Array.from({ length: CHAPTERS_PER_GROUP - group.chapters.length }).map((_, i) => (
                    <div key={`spacer-${i}`} className="h-14 border-b border-border last:border-b-0" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingHistory;