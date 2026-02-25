import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export interface ReadingHistoryEntry {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string | null;
  chapterTitle: string | null;
  volume: string | null;
  translatedLanguage: string;
  externalUrl: string | null;
  scanlationGroups: Array<{ id: string; name: string }>;
  coverUrl?: string | null;
  timestamp: number;
  commentCount?: number;
}

const MAX_HISTORY = 100;
const RECENT_HISTORY_COUNT = 10;

export const readingHistoryAtom = atomWithStorage<ReadingHistoryEntry[]>('manga-history', []);

/** Derived atom: first 10 entries sorted newest-first */
export const recentHistoryAtom = atom((get) => {
  return get(readingHistoryAtom).slice(0, RECENT_HISTORY_COUNT);
});

/** Write-only atom: prepend entry, deduplicate by chapterId, cap at MAX_HISTORY */
export const addToHistoryAtom = atom(
  null,
  (get, set, entry: ReadingHistoryEntry) => {
    const current = get(readingHistoryAtom);
    const deduped = current.filter((e) => e.chapterId !== entry.chapterId);
    const updated = [entry, ...deduped].slice(0, MAX_HISTORY);
    set(readingHistoryAtom, updated);
  }
);