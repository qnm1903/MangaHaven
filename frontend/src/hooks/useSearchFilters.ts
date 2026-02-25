import { useMemo, useCallback } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { TagState } from '@/services/search_service';

// Search filter state interface
export interface SearchFilters {
    query: string;
    includedTags: string[];
    excludedTags: string[];
    status: string[];
    contentRating: string[];
    publicationDemographic: string[];
    year: string;
    authors: string[];
    group: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    page: number;
}

// Default filter values
const DEFAULT_FILTERS: SearchFilters = {
    query: '',
    includedTags: [],
    excludedTags: [],
    status: [],
    contentRating: ['safe', 'suggestive', 'erotica'],
    publicationDemographic: [],
    year: '',
    authors: [],
    group: '',
    sortBy: 'relevance',
    sortOrder: 'desc',
    page: 1,
};

// Parse URL search params to filters
function parseSearchParams(params: Record<string, unknown>): SearchFilters {
    return {
        query: (params.q as string) || '',
        includedTags: parseArrayParam(params.includedTags),
        excludedTags: parseArrayParam(params.excludedTags),
        status: parseArrayParam(params.status),
        contentRating: parseArrayParam(params.contentRating) || DEFAULT_FILTERS.contentRating,
        publicationDemographic: parseArrayParam(params.demographic),
        year: (params.year as string) || '',
        authors: parseArrayParam(params.authors),
        group: (params.group as string) || '',
        sortBy: (params.sortBy as string) || 'relevance',
        sortOrder: (params.sortOrder as 'asc' | 'desc') || 'desc',
        page: parseInt(params.page as string) || 1,
    };
}

// Convert filters to URL search params
function filtersToSearchParams(filters: SearchFilters): Record<string, string | string[] | undefined> {
    const params: Record<string, string | string[] | undefined> = {};

    if (filters.query) params.q = filters.query;
    if (filters.includedTags.length) params.includedTags = filters.includedTags.join(',');
    if (filters.excludedTags.length) params.excludedTags = filters.excludedTags.join(',');
    if (filters.status.length) params.status = filters.status.join(',');
    if (filters.contentRating.length &&
        JSON.stringify(filters.contentRating) !== JSON.stringify(DEFAULT_FILTERS.contentRating)) {
        params.contentRating = filters.contentRating.join(',');
    }
    if (filters.publicationDemographic.length) params.demographic = filters.publicationDemographic.join(',');
    if (filters.year) params.year = filters.year;
    if (filters.authors.length) params.authors = filters.authors.join(',');
    if (filters.group) params.group = filters.group;
    if (filters.sortBy !== 'relevance') params.sortBy = filters.sortBy;
    if (filters.sortOrder !== 'desc') params.sortOrder = filters.sortOrder;
    if (filters.page > 1) params.page = filters.page.toString();

    return params;
}

// Helper to parse array param
function parseArrayParam(param: unknown): string[] {
    if (!param) return [];
    if (Array.isArray(param)) return param as string[];
    if (typeof param === 'string') return param.split(',').filter(Boolean);
    return [];
}

// Hook for managing search filters with URL sync
export function useSearchFilters() {
    const navigate = useNavigate();
    const searchParams = useSearch({ strict: false }) as Record<string, unknown>;

    // Parse filters from URL
    const filters = useMemo(
        () => parseSearchParams(searchParams),
        [searchParams]
    );

    // Tag Map for TagFilterGrid
    const tagMap = useMemo(() => {
        const map = new Map<string, TagState>();
        filters.includedTags.forEach(id => map.set(id, 'include'));
        filters.excludedTags.forEach(id => map.set(id, 'exclude'));
        return map;
    }, [filters.includedTags, filters.excludedTags]);

    // Update filters and sync to URL
    const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
        const newFilters = { ...filters, ...updates };
        // Reset page when filters change (except for page itself)
        if (!('page' in updates)) {
            newFilters.page = 1;
        }

        const newParams = filtersToSearchParams(newFilters);
        navigate({
            to: '/search' as string,
            search: newParams as Record<string, string>,
            replace: true,
        });
    }, [filters, navigate]);

    // Update tag map and sync to URL
    const updateTags = useCallback((tagMap: Map<string, TagState>) => {
        const includedTags: string[] = [];
        const excludedTags: string[] = [];

        tagMap.forEach((state, id) => {
            if (state === 'include') includedTags.push(id);
            if (state === 'exclude') excludedTags.push(id);
        });

        updateFilters({ includedTags, excludedTags });
    }, [updateFilters]);

    // Reset all filters
    const resetFilters = useCallback(() => {
        navigate({
            to: '/search' as string,
            search: {} as Record<string, string>,
            replace: true,
        });
    }, [navigate]);

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return (
            filters.query !== '' ||
            filters.includedTags.length > 0 ||
            filters.excludedTags.length > 0 ||
            filters.status.length > 0 ||
            filters.publicationDemographic.length > 0 ||
            filters.year !== '' ||
            filters.authors.length > 0 ||
            filters.group !== '' ||
            filters.sortBy !== 'relevance'
        );
    }, [filters]);

    return {
        filters,
        tagMap,
        updateFilters,
        updateTags,
        resetFilters,
        hasActiveFilters,
    };
}

export default useSearchFilters;