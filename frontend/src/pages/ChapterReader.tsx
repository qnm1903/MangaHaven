import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useChapter, useChapterPages, useMangaFeed } from '@/hooks/useMangaDex';
import type { Chapter } from '@/types/mangadex_types';
import { ChapterNavigationBar } from '@/components/chapter/ChapterNavigationBar';
import {
  ReaderSettingsModal,
  type ReaderSettings,
} from '@/components/chapter/ReaderSettingsModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, SquareArrowOutUpRight } from 'lucide-react';
import useLocalStorage from '@/hooks/useLocalStorage';
import { CommentSection } from '@/components/comments/CommentSection';
import { useAtom, useSetAtom } from 'jotai'
import { chapterLanguagesAtom } from '@/store/settingsAtoms'
import { LanguageFlag } from '@/components/LanguageFlag';
import { addToHistoryAtom } from '@/store/historyAtoms';
import { useAuth } from '@/hooks/useAuth';

interface ChapterResponse {
  data: {
    data: Chapter;
  };
}

interface ChapterPagesResponse {
  baseUrl: string;
  chapter: {
    hash: string;
    data: string[];
    dataSaver: string[];
  };
}

interface ChapterFeedResponse {
  data: {
    data: Chapter[];
  };
}

const ChapterReader: React.FC = () => {
  const { chapterId } = useParams({ from: '/chapter/$chapterId' });
  const navigate = useNavigate();

  // Fetch chapter data
  const {
    data: chapterData,
    isLoading: isChapterLoading,
    error: chapterError,
  } = useChapter(chapterId, ['manga', 'scanlation_group']) as { data: ChapterResponse | undefined; isLoading: boolean; error: unknown };

  // Fetch chapter pages
  const {
    data: pagesData,
    isLoading: isPagesLoading,
    error: pagesError,
  } = useChapterPages(chapterId) as { data: ChapterPagesResponse | undefined; isLoading: boolean; error: unknown };

  // Get manga ID from chapter relationships
  const mangaId =
    chapterData?.data?.data?.relationships?.find((rel) => rel.type === 'manga')?.id || '';

  const [chapterLanguages] = useAtom(chapterLanguagesAtom);
  const addToHistory = useSetAtom(addToHistoryAtom);
  const { user } = useAuth();

  // Fetch all chapters of this manga
  const { data: chaptersData } = useMangaFeed(
    mangaId,
    {
      limit: 500,
      translatedLanguage: chapterLanguages,
      order: { chapter: 'desc' },
    },
    { enabled: !!mangaId }
  ) as { data: ChapterFeedResponse | undefined };

  // Settings
  const [settings, setSettings] = useLocalStorage<ReaderSettings>('reader-settings', {
    readingMode: 'scroll-vertical',
    imageGap: 4,
    imageOrientation: 'vertical',
    showHeader: false,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navBarVisible, setNavBarVisible] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  // Refs mirror volatile state so the stable scroll listener never captures stale closures
  const isAtBottomRef = useRef(false);
  const readingModeRef = useRef(settings.readingMode);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);
  useEffect(() => { readingModeRef.current = settings.readingMode; }, [settings.readingMode]);

  const showNavTemporarily = useCallback(() => {
    setNavBarVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => {
      if (!isAtBottomRef.current) setNavBarVisible(false);
    }, 5000);
  }, []);

  // Effect: find scroll parent + attach scroll listener once content has loaded.
  // Must depend on loading states — on first mount the early-return loading spinner
  // is rendered instead of the scroll container, so scrollContainerRef is null.
  useEffect(() => {
    if (isChapterLoading || isPagesLoading) return;

    const root = scrollContainerRef.current;
    if (!root) return;

    // Walk up DOM to find the overflow-y: auto|scroll ancestor (MainLayout's <main>)
    if (!scrollParentRef.current) {
      let parent = root.parentElement;
      while (parent) {
        const oy = window.getComputedStyle(parent).overflowY;
        if (oy === 'auto' || oy === 'scroll') {
          scrollParentRef.current = parent as HTMLElement;
          break;
        }
        parent = parent.parentElement;
      }
    }
    const scrollEl = scrollParentRef.current;

    const handleScroll = () => {
      if (!scrollEl) return;
      const currentY = scrollEl.scrollTop;
      const isUp = currentY < lastScrollY.current;
      lastScrollY.current = currentY;

      if (readingModeRef.current === 'scroll-vertical') {
        if (isUp && currentY > 0) {
          showNavTemporarily();
        } else if (!isUp && currentY > 100) {
          setNavBarVisible(false);
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }
      } else {
        showNavTemporarily();
      }
    };

    if (scrollEl) scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [isChapterLoading, isPagesLoading, showNavTemporarily]);

  // Effect: re-create IntersectionObserver whenever chapter changes or content loads.
  // Separate from scroll listener so the observer always watches the current sentinel.
  useEffect(() => {
    if (isChapterLoading || isPagesLoading) return;

    const scrollEl = scrollParentRef.current;
    if (!scrollEl || !bottomSentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0].isIntersecting;
        isAtBottomRef.current = visible;
        setIsAtBottom(visible);
        if (visible) {
          setNavBarVisible(false);
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        }
      },
      { root: scrollEl, threshold: 0.1 }
    );

    observer.observe(bottomSentinelRef.current);

    return () => observer.disconnect();
  }, [chapterId, isChapterLoading, isPagesLoading]);

  // Initialize: show nav on mount
  useEffect(() => {
    showNavTemporarily();
    return () => { if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current); };
  }, [showNavTemporarily]);

  // Reset all scroll state when navigating between chapters.
  // The component stays mounted (same route type), so refs/state carry over otherwise.
  useEffect(() => {
    // Reset stale scroll position tracker
    lastScrollY.current = 0;
    // Clear the "at bottom" flag so the scroll handler isn't permanently suppressed
    isAtBottomRef.current = false;
    setIsAtBottom(false);
    // Clear loaded image set so skeletons show for the new chapter
    setLoadedImages(new Set());
    // Scroll the container back to the top
    if (scrollParentRef.current) {
      scrollParentRef.current.scrollTop = 0;
    }
    // Show nav for the new chapter
    showNavTemporarily();
  }, [chapterId, showNavTemporarily]);

  // Track reading history when chapter data is fully loaded
  useEffect(() => {
    if (!chapterData?.data?.data || !mangaId) return;
    if (!user) return; // Only track history for logged-in users
    const ch = chapterData.data.data;
    const mangaRel = ch.relationships.find((r) => r.type === 'manga');
    const mangaAttrs = mangaRel?.attributes as { title?: Record<string, string> } | undefined;
    const titleMap = mangaAttrs?.title ?? {};
    const resolvedMangaTitle =
      titleMap['en'] ||
      titleMap['vi'] ||
      titleMap['ja-ro'] ||
      titleMap['ja'] ||
      Object.values(titleMap).find(Boolean) ||
      'Unknown Manga';
    const scanlationGroups = ch.relationships
      .filter((r) => r.type === 'scanlation_group')
      .map((r) => ({ id: r.id, name: (r.attributes as { name?: string } | undefined)?.name ?? '' }))
      .filter((g) => g.name);
    const coverUrl = (mangaRel?.attributes as { coverUrl?: string } | undefined)?.coverUrl ?? null;
    addToHistory({
      chapterId: ch.id,
      mangaId,
      mangaTitle: resolvedMangaTitle,
      chapterNumber: ch.attributes.chapter ?? null,
      chapterTitle: ch.attributes.title ?? null,
      volume: ch.attributes.volume ?? null,
      translatedLanguage: ch.attributes.translatedLanguage,
      externalUrl: ch.attributes.externalUrl ?? null,
      scanlationGroups,
      coverUrl,
      timestamp: Date.now(),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, !!chapterData?.data?.data, user]);

  const handleChapterChange = (newChapterId: string) => {
    const target = allChapters.find((ch) => ch.id === newChapterId);
    if (target?.attributes.externalUrl) {
      window.open(target.attributes.externalUrl, '_blank', 'noopener,noreferrer');
    } else {
      navigate({ to: '/chapter/$chapterId', params: { chapterId: newChapterId } });
    }
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages((prev) => new Set(prev).add(index));
  };

  if (isChapterLoading || isPagesLoading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-white text-lg">Đang tải chương truyện...</p>
        </div>
      </div>
    );
  }

  if (chapterError || pagesError) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-bold text-white">Lỗi tải chương</h2>
          <p className="text-neutral-400">
            Không thể tải chương truyện. Vui lòng thử lại sau.
          </p>
          <Button onClick={() => navigate({ to: '/' })} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Về trang chủ
          </Button>
        </div>
      </div>
    );
  }

  const chapter = chapterData?.data?.data;
  const pages = pagesData?.chapter;
  const baseUrl = pagesData?.baseUrl;
  const allChapters = chaptersData?.data?.data || [];

  if (!chapter || !pages || !baseUrl) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-white text-lg">Đang xử lý...</p>
        </div>
      </div>
    );
  }

  const imageUrls = pages.data.map(
    (filename) => `${baseUrl}/data/${pages.hash}/${filename}`
  );

  const mangaRelationship = chapter.relationships.find((rel) => rel.type === 'manga');
  const mangaAttributes = mangaRelationship?.attributes as { title?: Record<string, string> } | undefined;
  const titleMap = mangaAttributes?.title || {};
  const mangaTitle =
    titleMap['en'] ||
    titleMap['vi'] ||
    titleMap['ja-ro'] ||
    titleMap['ja'] ||
    Object.values(titleMap).find(Boolean) ||
    'Unknown Manga';
  const chapterTitle = chapter.attributes.title || '';
  const chapterNumber = chapter.attributes.chapter || '';
  const chapterDisplayLabel = chapterNumber
    ? `Ch. ${chapterNumber}${chapterTitle ? ` · ${chapterTitle}` : ''}`
    : chapterTitle || '?';

  // Filter chapters to the same scanlation group + same translated language as current chapter
  const currentGroupId = chapter.relationships.find((rel) => rel.type === 'scanlation_group')?.id;
  const currentLang = chapter.attributes.translatedLanguage;
  const filteredChapters = allChapters.filter((ch) => {
    const sameLanguage = ch.attributes.translatedLanguage === currentLang;
    const sameGroup = currentGroupId
      ? ch.relationships.some((rel) => rel.type === 'scanlation_group' && rel.id === currentGroupId)
      : true;
    return sameLanguage && sameGroup;
  });

  // Compute prev/next within the filtered list
  const currentIndex = filteredChapters.findIndex((ch) => ch.id === chapter.id);
  const previousChapter = currentIndex < filteredChapters.length - 1 ? filteredChapters[currentIndex + 1] : null;
  const nextChapter = currentIndex > 0 ? filteredChapters[currentIndex - 1] : null;

  const getChapterLabel = (ch: Chapter) => {
    const num = ch.attributes.chapter;
    const title = ch.attributes.title || '';
    return num ? `Ch. ${num}${title ? ` · ${title}` : ''}` : title || '?';
  };

  return (
    <div className="min-h-screen bg-neutral-900" ref={scrollContainerRef}>
      {/* Header - Only show if settings.showHeader is true */}
      {settings.showHeader && (
        <header className="sticky top-0 z-40 w-full bg-black/80 backdrop-blur-md border-b border-neutral-800">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: `/manga/${mangaId}` })}
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Quay lại
            </Button>
            <div className="text-center flex-1">
              <h1 className="text-white font-semibold text-sm sm:text-base truncate">
                {mangaTitle}
              </h1>
              <p className="text-neutral-400 text-xs flex items-center justify-center gap-1.5">
                <LanguageFlag languageCode={chapter.attributes.translatedLanguage} className="h-3 w-4 shrink-0" />
                <span>{chapterDisplayLabel}</span>
              </p>
            </div>
            <div className="w-20" />
          </div>
        </header>
      )}

      {/* Main content - Image list */}
      <main className="pb-32">
        <div className="flex flex-col items-center">
          {imageUrls.map((url: string, index: number) => {
            const marginTopValue = index === 0 ? 0 : settings.imageGap;
            return (
              <div
                key={index}
                className={`relative ${settings.imageOrientation === 'vertical' ? 'w-full' : 'w-auto'
                  }`}
                {...(marginTopValue > 0 && { style: { marginTop: marginTopValue } })}
              >
                {!loadedImages.has(index) && (
                  <Skeleton
                    className={`${settings.imageOrientation === 'vertical'
                      ? 'w-full h-[800px]'
                      : 'w-[600px] h-[800px]'
                      } bg-neutral-800`}
                  />
                )}
                <img
                  src={url}
                  alt={`Page ${index + 1}`}
                  className={`${
                    settings.imageOrientation === 'vertical' ? 'w-full h-auto' : 'h-screen w-auto'
                  } ${!loadedImages.has(index) ? 'absolute opacity-0 pointer-events-none' : ''}`}
                  onLoad={() => handleImageLoad(index)}
                  loading="lazy"
                />
              </div>
            );
          })}


        </div>
      </main>

      {/* Floating Chapter Navigation Bar — hidden when end-of-chapter section is visible */}
      {filteredChapters.length > 0 && (
        <ChapterNavigationBar
          currentChapter={chapter}
          allChapters={filteredChapters}
          onChapterChange={handleChapterChange}
          onSettingsClick={() => setSettingsOpen(true)}
          visible={navBarVisible && !isAtBottom}
        />
      )}

      {/* End of Chapter Section */}
      {filteredChapters.length > 0 && (
        <div
          ref={bottomSentinelRef}
          className="bg-neutral-900 border-t border-neutral-700/50"
        >
          <div className="max-w-2xl mx-auto py-10 px-4 flex flex-col items-center gap-6">
            <div className="text-center">
              <p className="text-neutral-500 text-xs uppercase tracking-widest mb-1">Đã đọc hết</p>
              <h3 className="text-white text-xl font-semibold">
                {chapterDisplayLabel}
              </h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap justify-center">
              <Button
                variant="outline"
                disabled={!previousChapter}
                onClick={() => previousChapter && handleChapterChange(previousChapter.id)}
                className="border-neutral-600 text-white hover:bg-neutral-700 bg-neutral-800 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Chương trước
              </Button>

              <Select value={chapter.id} onValueChange={handleChapterChange}>
                <SelectTrigger className="w-[220px] border-neutral-600 bg-neutral-800 text-white focus:ring-0">
                  <SelectValue>
                    <div className="flex items-center gap-2 min-w-0">
                      <LanguageFlag languageCode={chapter.attributes.translatedLanguage} className="h-3 w-4 shrink-0" />
                      <span className="truncate">{getChapterLabel(chapter)}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-neutral-800 border-neutral-600 text-white max-h-[300px]">
                  {filteredChapters.map((ch) => (
                    <SelectItem
                      key={ch.id}
                      value={ch.id}
                      className="text-white focus:bg-neutral-700 focus:text-white"
                    >
                      <div className="flex items-center gap-2">
                        <LanguageFlag languageCode={ch.attributes.translatedLanguage} className="h-3 w-4 shrink-0" />
                        {ch.attributes.externalUrl && (
                          <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-400" />
                        )}
                        <span>{getChapterLabel(ch)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                disabled={!nextChapter}
                onClick={() => nextChapter && handleChapterChange(nextChapter.id)}
                className="border-neutral-600 text-white hover:bg-neutral-700 bg-neutral-800 disabled:opacity-30"
              >
                Chương tiếp
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="text-neutral-400 hover:text-white hover:bg-neutral-700"
            >
              Cài đặt đọc truyện
            </Button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <section className="bg-neutral-800 border-t border-neutral-700 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <CommentSection mangaId={mangaId} chapterId={chapterId} />
        </div>
      </section>

      {/* Settings Modal */}
      <ReaderSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
};

export default ChapterReader;