import React, { useState } from 'react';
import { Trans } from '@lingui/react/macro';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, BookOpen, Calendar, Rss, RefreshCw } from 'lucide-react';
import { followService, type FollowedManga } from '@/services/follow_service';
import { AuthGuard } from '@/components/auth/AuthGuard';

import FollowButton from '@/components/FollowButton';

const FavoritesContent: React.FC = () => {
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['follows', page, limit],
    queryFn: () => followService.getUserFollows({ page, limit }),
    staleTime: 30_000,
  });

  const follows: FollowedManga[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const completedCount = follows.filter(
    (f) => f.manga?.status === 'completed'
  ).length;
  const ongoingCount = follows.filter(
    (f) => f.manga?.status === 'ongoing'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2"><Trans>My Library</Trans></h1>
          <p className="text-muted-foreground"><Trans>Manga you're following</Trans></p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/latest-updates">
              <Rss className="mr-2 h-4 w-4" />
              <Trans>Latest Updates</Trans>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground"><Trans>Total Following</Trans></p>
                <p className="text-2xl font-bold">{isLoading ? '—' : total}</p>
              </div>
              <Heart className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground"><Trans>Completed</Trans></p>
                <p className="text-2xl font-bold">{isLoading ? '—' : completedCount}</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground"><Trans>Ongoing</Trans></p>
                <p className="text-2xl font-bold">{isLoading ? '—' : ongoingCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-600">
            <Trans>Failed to load your library. Please try again.</Trans>
            <Button variant="outline" size="sm" className="ml-4" onClick={() => refetch()}>
              <Trans>Retry</Trans>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[360px] rounded-xl" />
          ))}
        </div>
      )}

      {/* Follows Grid */}
      {!isLoading && !error && follows.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {follows.map((follow) => {
              const title = follow.manga?.title ?? follow.externalMangaId ?? 'Unknown';
              const status = follow.manga?.status ?? 'unknown';
              const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
              const mangaId = follow.externalMangaId ?? follow.mangaId ?? '';
              const source = follow.mangaSource;

              return (
                <Card key={follow.id} className="group cursor-pointer hover:shadow-lg transition-shadow overflow-hidden">
                  <div className="relative bg-muted h-52 flex items-center justify-center">
                    {follow.manga?.coverPublicId ? (
                      <img
                        src={`https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/${follow.manga.coverPublicId}`}
                        referrerPolicy="no-referrer"
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : follow.manga?.coverUrl ? (
                      <img
                        src={follow.manga.coverUrl}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                    )}
                    <Badge
                      variant={status === 'completed' ? 'secondary' : 'default'}
                      className="absolute top-2 right-2"
                    >
                      {statusLabel}
                    </Badge>
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold text-base line-clamp-2 min-h-[2lh]">{title}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        {source === 'MANGADEX' ? 'MangaDex' : 'Local'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(follow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {source === 'MANGADEX' && mangaId && (
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          <Link to="/manga/$mangaId" params={{ mangaId }}>
                            <BookOpen className="mr-1 h-3 w-3" />
                            <Trans>View</Trans>
                          </Link>
                        </Button>
                      )}
                      <FollowButton
                        mangaId={mangaId}
                        source={source}
                        initialIsFollowing={true}
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-rose-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4 pt-4">
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

      {/* Empty State */}
      {!isLoading && !error && follows.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Heart className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2"><Trans>No manga followed yet</Trans></h3>
            <p className="text-muted-foreground mb-4">
              <Trans>Browse manga and click "Follow" to add them to your library!</Trans>
            </p>
            <Button asChild>
              <Link to="/search"><Trans>Browse Manga</Trans></Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Favorites: React.FC = () => (
  <AuthGuard>
    <FavoritesContent />
  </AuthGuard>
);

export default Favorites;