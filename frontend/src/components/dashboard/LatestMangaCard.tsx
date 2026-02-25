import React from 'react';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import LazyMangaCover from '@/components/manga/LazyMangaCover';
import type { Manga } from '@/types/mangadex_types';
import { getMangaDescription, getMangaTitle, getCoverImageVariants, formatRelativeTime } from '@/utils/mangaDexUtils';
import { t } from '@lingui/core/macro';

const FALLBACK_COVER = '/image-placeholder-612x612.jpg';

type LatestMangaCardProps = {
  manga: Manga;
  priority?: boolean;
};

export const LatestMangaCard: React.FC<LatestMangaCardProps> = ({ manga, priority = false }) => {
  const title = getMangaTitle(manga);
  const description = getMangaDescription(manga);
  const updatedAt = manga.attributes.updatedAt || manga.attributes.createdAt;
  const coverVariants = getCoverImageVariants(manga);

  return (
    <Link to="/manga/$mangaId" params={{ mangaId: manga.id }} className="block">
      <Card className="group overflow-hidden border border-border/40 bg-background py-0 transition hover:-translate-y-1 hover:shadow-md">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          <LazyMangaCover
            title={title}
            variants={coverVariants}
            fallbackSrc={FALLBACK_COVER}
            priority={priority}
            sizes="(max-width: 640px) 60vw, (max-width: 1024px) 28vw, 220px"
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 flex flex-col justify-end bg-black/0 opacity-0 transition-all duration-300 group-hover:bg-black/60 group-hover:opacity-100">
            <div className="max-h-full overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
              <p className="text-base leading-relaxed text-white/90">
                {description}
              </p>
            </div>
          </div>
        </div>
        <CardContent className="px-4 py-3">
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{title}</h3>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="capitalize">{manga.attributes.status || t`unknown`}</span>
            <span>{formatRelativeTime(updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
