import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Loader2, ChevronRight } from 'lucide-react';
import { searchService } from '@/services/search_service';
import { mangaDexUtils } from '@/utils/mangaDexUtils';

const PLACEHOLDER_COVER = '/image-placeholder-612x612.jpg';
const DEBOUNCE_DELAY = 300;

// Local Manga type for search results
interface SearchManga {
    id: string;
    type: 'manga';
    attributes: {
        title: Record<string, string>;
        status: string;
        year: number | null;
        tags: Array<{
            id: string;
            type: string;
            attributes: {
                name: Record<string, string>;
                group: string;
            };
        }>;
    };
    relationships: Array<{
        id: string;
        type: string;
        attributes?: Record<string, unknown>;
    }>;
}

interface SearchBarProps {
    className?: string;
    placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    className = '',
    placeholder = 'Search manga...',
}) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchManga[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await searchService.quickSearch(searchQuery);
            if (response.success && response.data.data) {
                setResults(response.data.data.slice(0, 5) as unknown as SearchManga[]);
                setIsOpen(true);
            }
        } catch (error) {
            console.error('Quick search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedIndex(-1);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            performSearch(value);
        }, DEBOUNCE_DELAY);
    }, [performSearch]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || results.length === 0) {
            if (e.key === 'Enter' && query.trim().length >= 2) {
                navigate({ to: '/search' as string, search: { q: query.trim() } as Record<string, string> });
                setIsOpen(false);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    navigate({ to: `/manga/${results[selectedIndex].id}` as string });
                    setIsOpen(false);
                    setQuery('');
                } else if (query.trim().length >= 2) {
                    navigate({ to: '/search' as string, search: { q: query.trim() } as Record<string, string> });
                    setIsOpen(false);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    }, [isOpen, results, selectedIndex, query, navigate]);

    // Handle result click
    const handleResultClick = useCallback((manga: SearchManga) => {
        navigate({ to: `/manga/${manga.id}` as string });
        setIsOpen(false);
        setQuery('');
    }, [navigate]);

    // Handle advanced search
    const handleAdvancedSearch = useCallback(() => {
        navigate({ to: '/search' as string, search: query.trim() ? { q: query.trim() } as Record<string, string> : {} as Record<string, string> });
        setIsOpen(false);
    }, [navigate, query]);

    // Handle clear
    const handleClear = useCallback(() => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        inputRef.current?.focus();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                !inputRef.current?.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    return (
        <div className={`relative ${className}`}>
            {/* Search Input */}
            <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder={placeholder}
                    className="pl-10 pr-20"
                    aria-label="Search manga"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                />

                {/* Loading / Clear */}
                <div className="absolute right-12 flex items-center">
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!isLoading && query && (
                        <button
                            onClick={handleClear}
                            className="p-1 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {/* Advanced Search Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAdvancedSearch}
                    className="absolute right-1"
                    aria-label="Advanced search"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Dropdown Results */}
            {isOpen && results.length > 0 && (
                <Card
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto shadow-lg"
                >
                    <div role="listbox" aria-label="Search results" className="divide-y">
                        {results.map((manga, index) => {
                            const title = mangaDexUtils.getTitle(manga.attributes.title);
                            const author = manga.relationships.find(r => r.type === 'author')?.attributes?.name as string || 'Unknown';
                            const coverUrl = mangaDexUtils.getCoverArt(manga as unknown as Parameters<typeof mangaDexUtils.getCoverArt>[0]) || PLACEHOLDER_COVER;
                            const isSelected = index === selectedIndex;

                            return (
                                <button
                                    key={manga.id}
                                    role="option"
                                    aria-selected={isSelected ? 'true' : 'false'}
                                    onClick={() => handleResultClick(manga)}
                                    className={`flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                                >
                                        {/* Cover Thumbnail */}
                                        <img
                                            src={coverUrl}
                                            alt=""
                                            className="h-14 w-10 rounded object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = PLACEHOLDER_COVER;
                                            }}
                                        />

                                        {/* Manga Info */}
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate font-medium">{title}</h4>
                                            <p className="truncate text-sm text-muted-foreground">by {author}</p>
                                            <div className="mt-1 flex gap-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {manga.attributes.status}
                                                </Badge>
                                                {manga.attributes.year && (
                                                    <Badge variant="outline" className="text-xs">
                                                        {manga.attributes.year}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* View All Results */}
                    <button
                        onClick={handleAdvancedSearch}
                        className="flex w-full items-center justify-center gap-2 border-t p-3 text-sm text-primary hover:bg-muted/50"
                    >
                        View all results <ChevronRight className="h-4 w-4" />
                    </button>
                </Card>
            )}

            {/* No Results */}
            {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
                <Card
                    ref={dropdownRef}
                    className="absolute left-0 right-0 top-full z-50 mt-1 p-4 text-center text-muted-foreground shadow-lg"
                >
                    No results found for "{query}"
                    <Button
                        variant="link"
                        className="block w-full mt-2"
                        onClick={handleAdvancedSearch}
                    >
                        Try advanced search
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default SearchBar;