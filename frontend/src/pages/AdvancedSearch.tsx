import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { searchService } from '@/services/search_service';
import type { Author, Group } from '@/services/search_service';
import { useSearchFilters } from '@/hooks/useSearchFilters';
import { TagFilterGrid } from '@/components/search/TagFilterGrid';
import { AuthorSearch } from '@/components/search/AuthorSearch';
import { GroupSearch } from '@/components/search/GroupSearch';
import { MangaCard } from '@/components/manga-card';
import type { Manga } from '@/types/mangadex_types';
import { Trans } from '@lingui/react/macro';
import { t, msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';

// Filter option constants
const STATUS_OPTIONS = [
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'hiatus', label: 'Hiatus' },
    { value: 'cancelled', label: 'Cancelled' },
];

const CONTENT_RATING_OPTIONS = [
    { value: 'safe', label: 'Safe' },
    { value: 'suggestive', label: 'Suggestive' },
    { value: 'erotica', label: 'Erotica' },
];

const DEMOGRAPHIC_OPTIONS = [
    { value: 'shounen', label: 'Shounen' },
    { value: 'shoujo', label: 'Shoujo' },
    { value: 'seinen', label: 'Seinen' },
    { value: 'josei', label: 'Josei' },
];

const SORT_OPTIONS = [
    { value: 'relevance', label: msg`Relevance` },
    { value: 'latestUploadedChapter', label: msg`Latest Update` },
    { value: 'followedCount', label: msg`Most Popular` },
    { value: 'rating', label: msg`Highest Rated` },
    { value: 'createdAt', label: msg`Newest Added` },
];

const AdvancedSearch: React.FC = () => {
    const navigate = useNavigate();
    const { filters, tagMap, updateFilters, updateTags, resetFilters, hasActiveFilters } = useSearchFilters();
    const { _ } = useLingui();

    const [searchResults, setSearchResults] = useState<Manga[]>([]);
    const [totalResults, setTotalResults] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(true);
    const [localQuery, setLocalQuery] = useState(filters.query);

    const [selectedAuthors, setSelectedAuthors] = useState<Author[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    // Perform search
    const performSearch = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await searchService.advancedSearch({
                title: filters.query || undefined,
                limit: 20,
                offset: (filters.page - 1) * 20,
                includedTags: filters.includedTags.length > 0 ? filters.includedTags : undefined,
                excludedTags: filters.excludedTags.length > 0 ? filters.excludedTags : undefined,
                status: filters.status.length > 0 ? filters.status as ('ongoing' | 'completed' | 'hiatus' | 'cancelled')[] : undefined,
                contentRating: filters.contentRating as ('safe' | 'suggestive' | 'erotica' | 'pornographic')[],
                publicationDemographic: filters.publicationDemographic.length > 0 ? filters.publicationDemographic as ('shounen' | 'shoujo' | 'seinen' | 'josei' | 'none')[] : undefined,
                year: filters.year || undefined,
                authors: filters.authors.length > 0 ? filters.authors : undefined,
                group: filters.group || undefined,
                order: { [filters.sortBy]: filters.sortOrder },
            });

            if (response.success && response.data) {
                setSearchResults(response.data.data as unknown as Manga[]);
                setTotalResults(response.data.total || 0);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
            setTotalResults(0);
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    // Trigger search on filter changes
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    // Sync local query with filters
    useEffect(() => {
        setLocalQuery(filters.query);
    }, [filters.query]);

    // Handle search submit
    const handleSearchSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        updateFilters({ query: localQuery });
    }, [localQuery, updateFilters]);

    // Handle manga click
    const handleMangaClick = useCallback((manga: Manga) => {
        navigate({ to: '/manga/$mangaId', params: { mangaId: manga.id } });
    }, [navigate]);

    // Toggle filter option
    const toggleFilterOption = useCallback((
        filterKey: 'status' | 'contentRating' | 'publicationDemographic',
        value: string
    ) => {
        const current = filters[filterKey];
        if (current.includes(value)) {
            updateFilters({ [filterKey]: current.filter(v => v !== value) });
        } else {
            updateFilters({ [filterKey]: [...current, value] });
        }
    }, [filters, updateFilters]);

    // Handle author change
    const handleAuthorsChange = useCallback((authors: Author[]) => {
        setSelectedAuthors(authors);
        updateFilters({ authors: authors.map(a => a.id) });
    }, [updateFilters]);

    // Handle group change
    const handleGroupChange = useCallback((group: Group | null) => {
        setSelectedGroup(group);
        updateFilters({ group: group?.id || '' });
    }, [updateFilters]);

    // Pagination
    const totalPages = Math.ceil(totalResults / 20);

    return (
        <div className="container mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2"><Trans>Advanced Search</Trans></h1>
                <p className="text-gray-600"><Trans>Find manga with powerful filtering options</Trans></p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="mb-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="text"
                            value={localQuery}
                            onChange={(e) => setLocalQuery(e.target.value)}
                            placeholder={t`Search manga titles...`}
                            className="pl-10 pr-4 py-6 text-lg"
                        />
                    </div>
                    <Button type="submit" size="lg">
                        <Search className="h-5 w-5 mr-2" />
                        <Trans>Search</Trans>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <SlidersHorizontal className="h-5 w-5 mr-2" />
                        <Trans>Filters</Trans>
                    </Button>
                </div>
            </form>

            <div className="flex gap-6">
                {/* Filters Sidebar */}
                {showFilters && (
                    <div className="w-80 flex-shrink-0 space-y-4">
                        {/* Reset Filters */}
                        {hasActiveFilters && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={resetFilters}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                <Trans>Reset All Filters</Trans>
                            </Button>
                        )}

                        {/* Tags */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Tags</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <TagFilterGrid
                                    selectedTags={tagMap}
                                    onTagsChange={updateTags}
                                />
                            </CardContent>
                        </Card>

                        {/* Authors */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Authors</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AuthorSearch
                                    selectedAuthors={selectedAuthors}
                                    onAuthorsChange={handleAuthorsChange}
                                />
                            </CardContent>
                        </Card>

                        {/* Scanlation Group */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Scanlation Group</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <GroupSearch
                                    selectedGroup={selectedGroup}
                                    onGroupChange={handleGroupChange}
                                />
                            </CardContent>
                        </Card>

                        {/* Status */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Publication Status</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS.map(option => (
                                        <Badge
                                            key={option.value}
                                            variant={filters.status.includes(option.value) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleFilterOption('status', option.value)}
                                        >
                                            {option.label}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Content Rating */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Content Rating</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {CONTENT_RATING_OPTIONS.map(option => (
                                        <Badge
                                            key={option.value}
                                            variant={filters.contentRating.includes(option.value) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleFilterOption('contentRating', option.value)}
                                        >
                                            {option.label}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Demographic */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Demographic</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {DEMOGRAPHIC_OPTIONS.map(option => (
                                        <Badge
                                            key={option.value}
                                            variant={filters.publicationDemographic.includes(option.value) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleFilterOption('publicationDemographic', option.value)}
                                        >
                                            {option.label}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Year */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base"><Trans>Publication Year</Trans></CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    type="text"
                                    value={filters.year}
                                    onChange={(e) => updateFilters({ year: e.target.value })}
                                    placeholder="e.g., 2023 or 2020-2023"
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Results */}
                <div className="flex-1">
                    {/* Sort and Results Count */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-muted-foreground">
                            {isLoading ? <Trans>Searching...</Trans> : <Trans>{totalResults.toLocaleString()} results found</Trans>}
                        </p>
                        <Select
                            value={filters.sortBy}
                            onValueChange={(value) => updateFilters({ sortBy: value })}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder={t`Sort by`} />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {_(option.label)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="aspect-[3/4] w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Results Grid */}
                    {!isLoading && searchResults.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {searchResults.map(manga => (
                                <MangaCard
                                    key={manga.id}
                                    manga={manga}
                                    onClick={() => handleMangaClick(manga)}
                                />
                            ))}
                        </div>
                    )}

                    {/* No Results */}
                    {!isLoading && searchResults.length === 0 && (
                        <div className="text-center py-12">
                            <Search className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-xl font-medium mb-2"><Trans>No results found</Trans></h3>
                            <p className="text-gray-500 mb-4">
                                <Trans>Try adjusting your search or filters</Trans>
                            </p>
                            <Button variant="outline" onClick={resetFilters}>
                                <Trans>Clear all filters</Trans>
                            </Button>
                        </div>
                    )}

                    {/* Pagination */}
                    {!isLoading && totalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-8">
                            <Button
                                variant="outline"
                                disabled={filters.page <= 1}
                                onClick={() => updateFilters({ page: filters.page - 1 })}
                            >
                                <Trans>Previous</Trans>
                            </Button>
                            <span className="flex items-center px-4">
                                <Trans>Page {filters.page} of {totalPages}</Trans>
                            </span>
                            <Button
                                variant="outline"
                                disabled={filters.page >= totalPages}
                                onClick={() => updateFilters({ page: filters.page + 1 })}
                            >
                                <Trans>Next</Trans>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdvancedSearch;