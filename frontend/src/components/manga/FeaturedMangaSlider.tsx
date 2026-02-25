import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Manga } from '@/types/mangadex_types';
import { mangaDexUtils } from '@/utils/mangaDexUtils';

interface FeaturedMangaSliderProps {
  manga: Manga[];
  className?: string;
}

export function FeaturedMangaSlider({ manga, className }: FeaturedMangaSliderProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      skipSnaps: true,
      duration: 15,
    },
    [
      Autoplay({
        delay: 5000,
        stopOnLastSnap: false,
      }),
    ]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Handle autoplay pause on user interaction
  useEffect(() => {
    if (!emblaApi) return;
    
    const autoplay = emblaApi.plugins().autoplay;
    if (!autoplay) return;

    const container = emblaApi.containerNode();
    if (!container) return;

    const onPointerDown = () => autoplay.stop();
    const onPointerUp = () => autoplay.play();

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);

    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
    };
  }, [emblaApi]);

  if (manga.length === 0) {
    return null;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div ref={emblaRef} className="overflow-hidden rounded-3xl">
        <div className="flex touch-pan-y">
          {manga.map((item, index) => {
            const coverUrl = mangaDexUtils.getCoverArt(item) || '/placeholder-manga-cover.jpg';
            const title = mangaDexUtils.getTitle(item.attributes.title);
            const description = mangaDexUtils.getDescription(item.attributes.description);
            const authors = mangaDexUtils.getAuthors(item);
            const genres = mangaDexUtils.getTagsByGroup(item.attributes.tags, 'genre').slice(0, 5);

            return (
              <div key={item.id} className="relative min-w-0 flex-[0_0_100%]">
                <Card className="relative h-[500px] overflow-hidden border border-border/40 bg-gradient-to-br from-background via-muted/50 to-muted dark:from-neutral-900 dark:via-neutral-950 dark:to-black">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <img
                      src={coverUrl}
                      alt=""
                      className="h-full w-full object-cover opacity-15 blur-sm dark:opacity-25"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent dark:from-black/90 dark:via-black/70" />
                  </div>

                  {/* Content */}
                  <div className="relative flex h-full items-center gap-8 px-12">
                    {/* Cover */}
                    <Link
                      to="/manga/$mangaId"
                      params={{ mangaId: item.id }}
                      className="group relative z-10 hidden flex-shrink-0 overflow-hidden rounded-2xl shadow-2xl transition-transform hover:scale-105 md:block"
                    >
                      <img
                        src={coverUrl}
                        alt={title}
                        className="h-[380px] w-[260px] object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                    </Link>

                    {/* Info */}
                    <div className="z-10 flex h-full max-w-2xl flex-col text-foreground text-left">
                      <span className="inline-flex w-fit items-center text-3xl font-black tracking-wider text-foreground">
                        #{index + 1}
                      </span>

                      <div className="flex flex-1 flex-col justify-center space-y-4">
                        <Link
                          to="/manga/$mangaId"
                          params={{ mangaId: item.id }}
                          className="group"
                        >
                          <div className="h-20 flex items-start">
                            <h2 className="text-4xl font-bold leading-tight text-foreground transition-colors line-clamp-2">
                              {title}
                            </h2>
                          </div>
                        </Link>

                        {authors.length > 0 && (
                          <p className="text-lg text-muted-foreground">
                            by {authors.map(a => a.name).join(', ')}
                          </p>
                        )}

                        <p className="line-clamp-3 text-base leading-relaxed text-muted-foreground">
                          {description || 'No description available.'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {genres.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="border-foreground/20 bg-background/30 text-foreground backdrop-blur-sm"
                            >
                              {mangaDexUtils.getTitle(tag.attributes.name)}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          {item.attributes.year && (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{item.attributes.year}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Button asChild size="lg" className="shadow-lg">
                            <Link to="/manga/$mangaId" params={{ mangaId: item.id }}>
                              Xem Chi Tiết
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      {manga.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-sm transition-all hover:scale-110 hover:bg-background/90"
            onClick={scrollPrev}
            disabled={!canScrollPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 z-20 h-12 w-12 -translate-y-1/2 rounded-full border border-border/60 bg-background/70 text-foreground backdrop-blur-sm transition-all hover:scale-110 hover:bg-background/90"
            onClick={scrollNext}
            disabled={!canScrollNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {manga.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {manga.map((_, index) => (
            <button
              key={index}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === selectedIndex
                  ? 'w-8 bg-foreground'
                  : 'bg-foreground/30 hover:bg-foreground/50'
              )}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}