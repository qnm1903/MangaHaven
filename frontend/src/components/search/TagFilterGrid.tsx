import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Check, X } from 'lucide-react';
import { searchService } from '@/services/search_service';
import type { TagFilter, TagState } from '@/services/search_service';
import { cn } from '@/lib/utils';

interface TagFilterGridProps {
    selectedTags: Map<string, TagState>;
    onTagsChange: (tags: Map<string, TagState>) => void;
    className?: string;
}

export const TagFilterGrid: React.FC<TagFilterGridProps> = ({
    selectedTags,
    onTagsChange,
    className = '',
}) => {
    const [tags, setTags] = useState<TagFilter[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const parentRef = useRef<HTMLDivElement>(null);

    // Load tags on mount
    useEffect(() => {
        const loadTags = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const fetchedTags = await searchService.getTags();
                setTags(fetchedTags);
            } catch (e) {
                setError('Failed to load tags');
                console.error('Failed to load tags:', e);
            } finally {
                setIsLoading(false);
            }
        };
        loadTags();
    }, []);

    // Filter tags by search query
    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return tags;
        const query = searchQuery.toLowerCase();
        return tags.filter(tag =>
            tag.name.toLowerCase().includes(query) ||
            tag.group.toLowerCase().includes(query)
        );
    }, [tags, searchQuery]);

    // Group tags by category
    const groupedTags = useMemo(() => {
        const groups: Record<string, TagFilter[]> = {};
        filteredTags.forEach(tag => {
            if (!groups[tag.group]) {
                groups[tag.group] = [];
            }
            groups[tag.group].push(tag);
        });
        return groups;
    }, [filteredTags]);

    // Flatten grouped tags for virtualization
    const flattenedItems = useMemo(() => {
        const items: Array<{ type: 'header' | 'tag'; data: string | TagFilter }> = [];
        Object.entries(groupedTags).sort((a, b) => a[0].localeCompare(b[0])).forEach(([group, groupTags]) => {
            items.push({ type: 'header', data: group });
            groupTags.forEach(tag => items.push({ type: 'tag', data: tag }));
        });
        return items;
    }, [groupedTags]);

    // Virtualizer
    const rowVirtualizer = useVirtualizer({
        count: flattenedItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => flattenedItems[index].type === 'header' ? 36 : 32,
        overscan: 10,
    });

    // Handle tag click - tri-state cycle
    const handleTagClick = useCallback((tagId: string) => {
        const currentState = selectedTags.get(tagId) || 'none';
        const nextState: TagState =
            currentState === 'none' ? 'include' :
                currentState === 'include' ? 'exclude' : 'none';

        const newTags = new Map(selectedTags);
        if (nextState === 'none') {
            newTags.delete(tagId);
        } else {
            newTags.set(tagId, nextState);
        }
        onTagsChange(newTags);
    }, [selectedTags, onTagsChange]);

    // Get tag state helper
    const getTagState = useCallback((tagId: string): TagState => {
        return selectedTags.get(tagId) || 'none';
    }, [selectedTags]);

    // Render tag badge with tri-state styling
    const renderTag = useCallback((tag: TagFilter) => {
        const state = getTagState(tag.id);

        return (
            <button
                key={tag.id}
                onClick={() => handleTagClick(tag.id)}
                className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all cursor-pointer',
                    'inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-all cursor-pointer',
                    state === 'none' && 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80 opacity-60 hover:opacity-100',
                    state === 'include' && 'bg-green-100 border-green-500 text-green-700',
                    state === 'exclude' && 'bg-red-100 border-red-500 text-red-700',
                )}
                title={`${tag.name} (${state === 'none' ? 'Click to include' : state === 'include' ? 'Click to exclude' : 'Click to clear'})`}
            >
                {state === 'include' && <Check className="h-3 w-3" />}
                {state === 'exclude' && <X className="h-3 w-3" />}
                {tag.name}
            </button>
        );
    }, [getTagState, handleTagClick]);

    // Summary of selected tags
    const selectedCount = useMemo(() => {
        const included = Array.from(selectedTags.values()).filter(s => s === 'include').length;
        const excluded = Array.from(selectedTags.values()).filter(s => s === 'exclude').length;
        return { included, excluded };
    }, [selectedTags]);

    if (error) {
        return (
            <div className={`p-4 text-center text-red-500 ${className}`}>
                {error}
                <button
                    onClick={() => window.location.reload()}
                    className="ml-2 underline"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Search and Summary */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Filter tags..."
                        className="pl-9"
                    />
                </div>
                {(selectedCount.included > 0 || selectedCount.excluded > 0) && (
                    <div className="flex items-center gap-2 text-sm">
                        {selectedCount.included > 0 && (
                            <Badge variant="default" className="bg-green-500">
                                +{selectedCount.included}
                            </Badge>
                        )}
                        {selectedCount.excluded > 0 && (
                            <Badge variant="default" className="bg-red-500">
                                -{selectedCount.excluded}
                            </Badge>
                        )}
                        <button
                            onClick={() => onTagsChange(new Map())}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* Virtualized Tag List */}
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-6 w-24" />
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-20" />
                        ))}
                    </div>
                    <Skeleton className="h-6 w-24" />
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-7 w-24" />
                        ))}
                    </div>
                </div>
            ) : (
                <div
                    ref={parentRef}
                    className="h-80 overflow-auto rounded-md border p-3"
                >
                    <div
                        style={{
                            height: `${rowVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative',
                        }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                            const item = flattenedItems[virtualItem.index];

                            if (item.type === 'header') {
                                return (
                                    <div
                                        key={virtualItem.key}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                        className="flex items-center"
                                    >
                                        <h4 className="text-sm font-semibold capitalize text-foreground">
                                            {item.data as string}
                                        </h4>
                                    </div>
                                );
                            }

                            const tag = item.data as TagFilter;
                            return (
                                <div
                                    key={virtualItem.key}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        height: `${virtualItem.size}px`,
                                        transform: `translateY(${virtualItem.start}px)`,
                                    }}
                                    className="flex items-center"
                                >
                                    {renderTag(tag)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Help text */}
            <p className="text-xs text-muted-foreground">
                Click once to <span className="text-green-600 font-medium">include</span>,
                click again to <span className="text-red-600 font-medium">exclude</span>,
                click third time to clear
            </p>
        </div>
    );
};

export default TagFilterGrid;