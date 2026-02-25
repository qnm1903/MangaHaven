import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Settings, SquareArrowOutUpRight } from 'lucide-react';
import type { Chapter } from '@/types/mangadex_types';
import { LanguageFlag } from '@/components/LanguageFlag';

interface ChapterNavigationBarProps {
  currentChapter: Chapter;
  allChapters: Chapter[];
  onChapterChange: (chapterId: string) => void;
  onSettingsClick: () => void;
  visible: boolean;
}

export const ChapterNavigationBar: React.FC<ChapterNavigationBarProps> = ({
  currentChapter,
  allChapters,
  onChapterChange,
  onSettingsClick,
  visible,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const currentIndex = allChapters.findIndex((ch) => ch.id === currentChapter.id);
  const hasPrevious = currentIndex < allChapters.length - 1;
  const hasNext = currentIndex > 0;

  const previousChapter = hasPrevious ? allChapters[currentIndex + 1] : null;
  const nextChapter = hasNext ? allChapters[currentIndex - 1] : null;

  const getChapterLabel = (chapter: Chapter) => {
    const chapterNum = chapter.attributes.chapter;
    const title = chapter.attributes.title || '';
    if (chapterNum) {
      return `Ch. ${chapterNum}${title ? ` · ${title}` : ''}`;
    }
    return title || '?';
  };

  return (
    <div
      className={`fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none`}
    >
      <div
        className={`pointer-events-auto transition-all duration-300 ease-in-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
      <div className="bg-black/90 backdrop-blur-md border border-neutral-700 rounded-full px-4 py-2 flex items-center gap-3 shadow-2xl">
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasPrevious}
          onClick={() => previousChapter && onChapterChange(previousChapter.id)}
          className="h-10 w-10 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Chapter Selector */}
        <Select value={currentChapter.id} onValueChange={onChapterChange}>
          <SelectTrigger className="w-[200px] border-0 bg-transparent text-white focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Chọn chương">
              <div className="flex items-center gap-2 min-w-0">
                <LanguageFlag languageCode={currentChapter.attributes.translatedLanguage} className="h-3 w-4 shrink-0" />
                <span className="truncate">{getChapterLabel(currentChapter)}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-black/95 border-neutral-700 text-white max-h-[300px]">
            {allChapters.map((chapter) => (
              <SelectItem
                key={chapter.id}
                value={chapter.id}
                className="text-white hover:bg-white/10 focus:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <LanguageFlag languageCode={chapter.attributes.translatedLanguage} className="h-3 w-4" />
                  {chapter.attributes.externalUrl && (
                    <SquareArrowOutUpRight className="h-3 w-3 shrink-0 text-blue-400" />
                  )}
                  {getChapterLabel(chapter)}
                </div>
              </SelectItem>
            ))}

          </SelectContent>
        </Select>

        {/* Next Chapter Button */}
        <Button
          variant="ghost"
          size="icon"
          disabled={!hasNext}
          onClick={() => nextChapter && onChapterChange(nextChapter.id)}
          className="h-10 w-10 rounded-full text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Settings Button */}
        <div className="h-6 w-px bg-neutral-700 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="h-10 w-10 rounded-full text-white hover:bg-white/10"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      </div>
    </div>
  );
};