import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, X } from 'lucide-react';
import { searchService } from '@/services/search_service';
import type { Group } from '@/services/search_service';
import { cn } from '@/lib/utils';

const DEBOUNCE_DELAY = 250;

interface GroupSearchProps {
    selectedGroup: Group | null;
    onGroupChange: (group: Group | null) => void;
    className?: string;
    placeholder?: string;
}

export const GroupSearch: React.FC<GroupSearchProps> = ({
    selectedGroup,
    onGroupChange,
    className = '',
    placeholder = 'Search scanlation groups...',
}) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Debounced search
    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.trim().length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setIsLoading(true);
        try {
            const response = await searchService.searchGroups(searchQuery);
            if (response.success && response.data.data) {
                // Filter out already selected group
                setResults(response.data.data.filter(g => g.id !== selectedGroup?.id));
                setIsOpen(true);
            }
        } catch (error) {
            console.error('Group search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedGroup]);

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
        if (!isOpen || results.length === 0) return;

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
                    handleSelect(results[selectedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    }, [isOpen, results, selectedIndex]);

    // Handle group selection
    const handleSelect = useCallback((group: Group) => {
        onGroupChange(group);
        setQuery('');
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
    }, [onGroupChange]);

    // Handle group removal
    const handleRemove = useCallback(() => {
        onGroupChange(null);
        inputRef.current?.focus();
    }, [onGroupChange]);

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
        <div className={`space-y-2 ${className}`}>
            <label className="text-sm font-medium">Scanlation Group</label>

            {/* Selected Group */}
            {selectedGroup && (
                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {selectedGroup.attributes.name}
                        <button
                            onClick={handleRemove}
                            className="ml-1 hover:text-red-500"
                            aria-label="Remove group"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                </div>
            )}

            {/* Search Input */}
            {!selectedGroup && (
                <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => results.length > 0 && setIsOpen(true)}
                        placeholder={placeholder}
                        className="pl-9"
                    />
                    {isLoading && (
                        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                    )}

                    {/* Dropdown Results */}
                    {isOpen && results.length > 0 && (
                        <Card
                            ref={dropdownRef}
                            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto shadow-lg"
                            role="listbox"
                        >
                            <ul className="divide-y">
                                {results.map((group, index) => (
                                    <li key={group.id}>
                                        <button
                                            onClick={() => handleSelect(group)}
                                            className={cn(
                                                'flex w-full items-center gap-2 p-2 text-left transition-colors hover:bg-gray-50',
                                                index === selectedIndex && 'bg-gray-100'
                                            )}
                                            role="option"
                                            aria-selected={index === selectedIndex}
                                        >
                                            <Users className="h-4 w-4 text-gray-400" />
                                            <div className="min-w-0 flex-1">
                                                <span className="font-medium">{group.attributes.name}</span>
                                                {group.attributes.official && (
                                                    <Badge variant="outline" className="ml-2 text-xs">Official</Badge>
                                                )}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    {/* No Results */}
                    {isOpen && !isLoading && query.length >= 2 && results.length === 0 && (
                        <Card
                            ref={dropdownRef}
                            className="absolute left-0 right-0 top-full z-50 mt-1 p-3 text-center text-sm text-gray-500 shadow-lg"
                        >
                            No groups found
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
};

export default GroupSearch;