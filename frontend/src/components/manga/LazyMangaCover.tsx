import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import type { CoverImageVariants } from '@/types/mangadex_types';

const TRANSPARENT_PLACEHOLDER =
  'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';

interface LazyMangaCoverProps {
  title: string;
  variants?: CoverImageVariants | null;
  fallbackSrc: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  srcOverride?: string | null;
}

/**
 * Lightweight lazy-loading cover image with IntersectionObserver and responsive sources.
 */
const LazyMangaCover: React.FC<LazyMangaCoverProps> = React.memo(
  ({
    title,
    variants,
    fallbackSrc,
    className,
    priority = false,
    sizes,
    srcOverride,
  }) => {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(priority);
    const [hasError, setHasError] = useState<boolean>(false);

    const resolvedVariants = useMemo(() => {
      if (srcOverride) {
        return {
          small: srcOverride,
          medium: srcOverride,
          original: srcOverride,
          srcSet: `${srcOverride} 1x` as const,
        } satisfies CoverImageVariants;
      }
      return variants ?? null;
    }, [srcOverride, variants]);

    useEffect(() => {
      if (priority || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const node = imageRef.current;
      if (!node) {
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '200px',
          threshold: 0.1,
        }
      );

      observer.observe(node);
      return () => observer.disconnect();
    }, [priority]);

    useEffect(() => {
      if (priority) {
        setIsVisible(true);
      }
    }, [priority]);

    const displaySrc = useMemo(() => {
      if (hasError) {
        return fallbackSrc;
      }
      if (!isVisible) {
        return TRANSPARENT_PLACEHOLDER;
      }
      return resolvedVariants?.small ?? fallbackSrc;
    }, [fallbackSrc, hasError, isVisible, resolvedVariants]);

    const displaySrcSet = useMemo(() => {
      if (!isVisible || hasError) {
        return undefined;
      }
      return resolvedVariants?.srcSet;
    }, [hasError, isVisible, resolvedVariants]);

    return (
      <img
        ref={imageRef}
        src={displaySrc}
        srcSet={displaySrcSet}
        sizes={displaySrcSet ? sizes : undefined}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'low'}
        alt={title}
        className={clsx(className)}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
      />
    );
  }
);

LazyMangaCover.displayName = 'LazyMangaCover';

export default LazyMangaCover;