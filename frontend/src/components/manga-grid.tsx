import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  lazy,
  Suspense
} from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  useSearchManga,
  useTags,
  type SearchMangaParams,
  type Manga,
  type Tag
} from '../hooks/useMangaDex';
import { mangaDexUtils } from '../utils/mangaDexUtils';

// UI Components
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { Separator } from '@/components/ui/separator';

interface MangaDexSearchResponse {
  success: boolean;
  data: {
    result: string;
    response: string;
    data: Manga[];
    total?: number;
    limit?: number;
    offset?: number;
  };
  cached?: boolean;
}

interface MangaDexTagsResponse {
  success: boolean;
  data: {
    result: string;
    response: string;
    data: Tag[];
  };
  cached?: boolean;
}

const MangaCard = lazy(() =>
  import('./manga-card').then((module) => ({ default: module.MangaCard }))
);

const renderSkeletonGrid = (count: number) => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="space-y-3">
        <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    ))}
  </div>
);

// Component hiển thị danh sách manga
export const MangaGrid: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const limit = 20;
  const offset = (currentPage - 1) * limit;

  useEffect(() => {
    const handler = window.setTimeout(() => {
      const normalized = searchInput.trim();
      if (normalized === searchTerm) {
        return;
      }

      setSearchTerm(normalized);
      setCurrentPage(1);
    }, 500);

    return () => window.clearTimeout(handler);
  }, [searchInput, searchTerm]);

  // Build search params with useMemo for performance
  const searchParams: SearchMangaParams = useMemo(() => ({
    limit,
    offset,
    includes: ['cover_art'],
    ...(searchTerm && { title: searchTerm }),
    ...(selectedTag && selectedTag !== 'all' && { includedTags: [selectedTag] }),
    contentRating: ['safe', 'suggestive', 'erotica'], // Limit content rating for better performance
    order: { latestUploadedChapter: 'desc' }
  }), [limit, offset, searchTerm, selectedTag]);

  // Fetch data using hooks with optimized parameters
  const {
    data: searchResults,
    isLoading,
    error
  } = useSearchManga(searchParams, {
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  });

  const { data: tags } = useTags({
    staleTime: 60 * 60 * 1000,
    gcTime: 120 * 60 * 1000
  });

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const handleTagFilter = useCallback((tagId: string) => {
    setSelectedTag(tagId);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const { mangaList, totalManga, totalPages } = useMemo(() => {
    const apiData = (searchResults as MangaDexSearchResponse | undefined)?.data;
    const list = apiData?.data ?? [];
    const total = apiData?.total ?? 0;
    const safeTotal = total > 0 ? total : list.length;

    return {
      mangaList: list,
      totalManga: safeTotal,
      totalPages: safeTotal > 0 ? Math.ceil(safeTotal / limit) : 0
    };
  }, [searchResults, limit]);

  const genreOptions = useMemo(() => {
    const tagData = (tags as MangaDexTagsResponse | undefined)?.data?.data;
    if (!Array.isArray(tagData)) {
      return [] as Tag[];
    }
    return tagData
      .filter((tag: Tag) => tag.attributes.group === 'genre')
      .slice(0, 15);
  }, [tags]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-48" />
        </div>
        {renderSkeletonGrid(12)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-500">
          <p className="text-lg font-semibold">Failed to load manga</p>
          <p className="text-sm">{error.message}</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Search manga titles..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <Select value={selectedTag} onValueChange={handleTagFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genreOptions.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {mangaDexUtils.getTitle(tag.attributes.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-gray-600">
            Showing {mangaList.length} of {totalManga.toLocaleString()} manga
          </div>
        </div>
      </div>

      <Separator />

      {mangaList.length > 0 ? (
        <Suspense fallback={renderSkeletonGrid(8)}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {mangaList.map((manga: Manga) => (
              <MangaCard
                key={manga.id}
                manga={manga}
                onClick={() => navigate({ to: '/manga/$mangaId', params: { mangaId: manga.id } })}
              />
            ))}
          </div>
        </Suspense>
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">No manga found</p>
          <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <ShadcnPagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) {
                      handlePageChange(currentPage - 1);
                    }
                  }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>

              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 3) {
                  pageNum = i + 1;
                } else if (currentPage <= 2) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 1) {
                  pageNum = totalPages - 2 + i;
                } else {
                  pageNum = currentPage - 1 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(pageNum);
                      }}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {totalPages > 3 && currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                      handlePageChange(currentPage + 1);
                    }
                  }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </ShadcnPagination>
        </div>
      )}
    </div>
  );
};



