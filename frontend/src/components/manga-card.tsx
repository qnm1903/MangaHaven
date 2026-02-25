import React, { useState, useCallback, memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Book, Calendar } from 'lucide-react';
import { mangaDexUtils } from '@/utils/mangaDexUtils';
import type { Manga } from '@/types/mangadex_types';

interface MangaCardProps {
  manga: Manga;
  onClick?: () => void;
}

const PLACEHOLDER_COVER = '/image-placeholder-612x612.jpg';

const MangaCardComponent: React.FC<MangaCardProps> = ({ manga, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const title = mangaDexUtils.getTitle(manga.attributes.title);
  const description = mangaDexUtils.getDescription(manga.attributes.description);
  const author =
    (manga.relationships.find((rel) => rel.type === 'author')?.attributes?.name as string) || 'Unknown Author';
  const coverUrl = mangaDexUtils.getCoverArt(manga) || PLACEHOLDER_COVER;
  const status = mangaDexUtils.getStatusText(manga.attributes.status);
  const genreTags = mangaDexUtils.getTagsByGroup(manga.attributes.tags, 'genre').slice(0, 2);
  const year = manga.attributes.year?.toString() || 'Unknown';
  const demographic = mangaDexUtils.getDemographicText(manga.attributes.publicationDemographic);

  const handleClick = useCallback(() => {
    if (onClick) onClick();
  }, [onClick]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    (event.target as HTMLImageElement).src = PLACEHOLDER_COVER;
  }, []);

  return (
    <HoverCard openDelay={500} closeDelay={100}>
      <HoverCardTrigger asChild>
        <Card
          className="group h-full cursor-pointer overflow-hidden hover-lift"
          onClick={handleClick}
        >
          <div className="relative">
            <img
              src={coverUrl}
              alt={title}
              className={`aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              onLoad={() => setImageLoaded(true)}
              onError={handleError}
              loading="lazy"
            />
            {!imageLoaded && <div className="aspect-[3/4] w-full animate-pulse bg-muted" />}
            <Badge
              variant="outline"
              className={cn(
                'absolute right-2 top-2 border',
                manga.attributes.status === 'ongoing' && 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
                manga.attributes.status === 'completed' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
                manga.attributes.status === 'hiatus' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
                manga.attributes.status === 'cancelled' && 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
              )}
            >
              {status}
            </Badge>
            {demographic && demographic !== 'None' && (
              <Badge variant="outline" className="absolute left-2 top-2 bg-background/90">
                {demographic}
              </Badge>
            )}
          </div>

          <CardContent className="flex h-full flex-col p-4">
            <h3 className="mb-1 text-lg font-semibold leading-tight line-clamp-1 break-words" title={title}>{title}</h3>
            <p className="mb-2 text-sm text-muted-foreground line-clamp-1 break-all" title={author}>by {author}</p>

            <div className="mb-3 flex flex-wrap gap-1">
              {genreTags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {mangaDexUtils.getTitle(tag.attributes.name)}
                </Badge>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{year}</span>
              </div>
              <div className="flex items-center gap-1">
                <Book className="h-4 w-4" />
                <span>{manga.attributes.lastChapter || '?'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </HoverCardTrigger>

      <HoverCardContent className="w-80" side="right">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold line-clamp-2 break-words text-left">{title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-1 break-all text-left">by {author}</p>
          </div>

          <div className="flex flex-wrap gap-1">
            {mangaDexUtils
              .getTagsByGroup(manga.attributes.tags, 'genre')
              .slice(0, 3)
              .map((tag) => (
                <Badge key={tag.id} variant="outline" className="text-xs">
                  {mangaDexUtils.getTitle(tag.attributes.name)}
                </Badge>
              ))}
          </div>

          <p className="text-sm line-clamp-3">
            {description.length > 150 ? `${description.substring(0, 150)}...` : description}
          </p>

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status: {status}</span>
            <span>Year: {year}</span>
          </div>

          {manga.attributes.contentRating && (
            <Badge variant="outline">{mangaDexUtils.getContentRatingText(manga.attributes.contentRating)}</Badge>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export const MangaCard = memo(MangaCardComponent);
