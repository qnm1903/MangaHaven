import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    ExternalLink,
    Heart,
    Globe,
    Users,
    Upload,
    MessageSquare,
    User,
    CheckCircle2,
} from 'lucide-react';
import { useToast } from '@/hooks/use_toast';
import { Separator } from '@/components/ui/separator';
import { MangaCard } from '@/components/manga-card';

type GroupSource = 'local' | 'mangadex';

interface GroupDetailProps {
    source: GroupSource;
}

// MangaDex group response type
interface MangaDexGroupData {
    data: {
        id: string;
        type: string;
        attributes: {
            name: string;
            altNames?: Array<{ [key: string]: string }>;
            website?: string | null;
            ircServer?: string | null;
            ircChannel?: string | null;
            discord?: string | null;
            contactEmail?: string | null;
            description?: string | null;
            twitter?: string | null;
            mangaUpdates?: string | null;
            focusedLanguages?: string[];
            locked?: boolean;
            official?: boolean;
            inactive?: boolean;
            publishDelay?: string | null;
            createdAt: string;
            updatedAt: string;
            version: number;
        };
        relationships: Array<{
            id: string;
            type: string;
            attributes?: {
                username?: string;
                roles?: string[];
            };
        }>;
    };
}

// Local group response type
interface LocalGroupData {
    id: string;
    name: string;
    description?: string;
    logoPublicId?: string;
    logoUrl?: string;
    website?: string;
    discord?: string;
    focusedLanguages: string[];
    mangadexGroupId?: string;
    createdBy: {
        id: string;
        displayName?: string;
        avatarPublicId?: string;
    };
    members: Array<{
        id: string;
        role: string;
        user: {
            id: string;
            displayName?: string;
            avatarPublicId?: string;
        };
    }>;
    _count: {
        submittedManga: number;
    };
    source: 'local';
}

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/v1`;

const fetchLocalGroup = async (groupId: string): Promise<LocalGroupData> => {
    const response = await fetch(`${API_BASE}/groups/local/${groupId}`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch local group');
    const json = await response.json();
    return json.data;
};

const fetchMangaDexGroup = async (groupId: string): Promise<MangaDexGroupData> => {
    const response = await fetch(`${API_BASE}/groups/mangadex/${groupId}`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch MangaDex group');
    const json = await response.json();
    return json.data;
};

interface MangaDexMangaItem {
    id: string;
    type: string;
    attributes: {
        title: Record<string, string>;
        altTitles?: Array<Record<string, string>>;
        description?: Record<string, string>;
        status: string;
        year?: number | null;
        contentRating?: string;
        tags?: Array<{
            id: string;
            type: 'tag';
            attributes: {
                name: Record<string, string>;
                description: Record<string, string>;
                group: string;
                version: number;
            };
        }>;
    };
    relationships: Array<{
        id: string;
        type: string;
        attributes?: {
            fileName?: string;
            name?: string;
        };
    }>;
}

interface MangaDexMangaListData {
    data: MangaDexMangaItem[];
    total: number;
}

const fetchMangaDexGroupManga = async (groupId: string): Promise<MangaDexMangaListData> => {
    const response = await fetch(`${API_BASE}/groups/mangadex/${groupId}/manga`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch group manga');
    const json = await response.json();
    return json.data;
};

// Language flag mapping
const languageFlags: Record<string, string> = {
    en: '🇬🇧',
    vi: '🇻🇳',
    ja: '🇯🇵',
    ko: '🇰🇷',
    zh: '🇨🇳',
    'zh-hk': '🇭🇰',
    es: '🇪🇸',
    'es-la': '🇲🇽',
    fr: '🇫🇷',
    de: '🇩🇪',
    pt: '🇵🇹',
    'pt-br': '🇧🇷',
    ru: '🇷🇺',
    it: '🇮🇹',
    pl: '🇵🇱',
    th: '🇹🇭',
    id: '🇮🇩',
    ar: '🇸🇦',
    tr: '🇹🇷',
};

const GroupDetail: React.FC<GroupDetailProps> = ({ source }) => {
    const { groupId } = useParams({ strict: false }) as { groupId: string };
    const { toast } = useToast();
    const navigate = useNavigate();

    const {
        data: localGroup,
        isLoading: isLocalLoading,
        error: localError,
    } = useQuery({
        queryKey: ['group', 'local', groupId],
        queryFn: () => fetchLocalGroup(groupId),
        enabled: source === 'local',
    });

    const {
        data: mangadexGroup,
        isLoading: isMangadexLoading,
        error: mangadexError,
    } = useQuery({
        queryKey: ['group', 'mangadex', groupId],
        queryFn: () => fetchMangaDexGroup(groupId),
        enabled: source === 'mangadex',
    });

    const {
        data: groupManga,
        isLoading: isMangaLoading,
    } = useQuery({
        queryKey: ['group', 'mangadex', groupId, 'manga'],
        queryFn: () => fetchMangaDexGroupManga(groupId),
        enabled: source === 'mangadex' && !!mangadexGroup,
    });

    const isLoading = source === 'local' ? isLocalLoading : isMangadexLoading;
    const error = source === 'local' ? localError : mangadexError;

    const handleFollow = () => {
        toast({
            title: 'Coming soon',
            description: 'Follow feature will be available soon!',
        });
    };

    const handleGoBack = () => {
        history.back();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="relative h-64 bg-gradient-to-b from-primary/20 to-background">
                    <Skeleton className="absolute bottom-0 left-8 h-32 w-32 translate-y-1/2 rounded-xl" />
                </div>
                <div className="container mx-auto px-4 pt-20">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-6 w-48 mb-8" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-destructive mb-4"><Trans>Unable to load data.</Trans></p>
                        <Button onClick={handleGoBack}><Trans>Back</Trans></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Render local group
    if (source === 'local' && localGroup) {
        return (
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <div className="relative h-64 bg-gradient-to-b from-primary/30 via-primary/10 to-background">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 left-4 z-10"
                        onClick={handleGoBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    {/* Group Avatar */}
                    <div className="absolute bottom-0 left-8 translate-y-1/2">
                        <div className="h-32 w-32 rounded-xl bg-muted border-4 border-background flex items-center justify-center overflow-hidden">
                            {localGroup.logoUrl ? (
                                <img
                                    src={localGroup.logoUrl}
                                    alt={localGroup.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Users className="h-12 w-12 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 pt-20 pb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">{localGroup.name}</h1>
                                <Badge variant="secondary"><Trans>Local</Trans></Badge>
                            </div>
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Upload className="h-4 w-4" />
                                    {localGroup._count.submittedManga} <Trans>uploads</Trans>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {localGroup.members.length} <Trans>members</Trans>
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleFollow}>
                                <Heart className="h-4 w-4 mr-2" />
                                <Trans>Follow</Trans>
                            </Button>
                        </div>
                    </div>

                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle><Trans>Group Information</Trans></CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Leader */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Group Leader</Trans></h3>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{localGroup.createdBy.displayName || 'Unknown'}</span>
                                </div>
                            </div>

                            {/* Languages */}
                            {localGroup.focusedLanguages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                        <Trans>Focused Languages</Trans>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {localGroup.focusedLanguages.map((lang) => (
                                            <Badge key={lang} variant="outline">
                                                {languageFlags[lang] || '🌐'} {lang.toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {localGroup.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Description</Trans></h3>
                                    <p className="text-sm">{localGroup.description}</p>
                                </div>
                            )}

                            {/* Where To Find */}
                            {(localGroup.website || localGroup.discord) && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Where To Find</Trans></h3>
                                        <div className="flex flex-wrap gap-2">
                                            {localGroup.website && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={localGroup.website} target="_blank" rel="noopener noreferrer">
                                                        <Globe className="h-4 w-4 mr-2" />
                                                        <Trans>Website</Trans>
                                                    </a>
                                                </Button>
                                            )}
                                            {localGroup.discord && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={localGroup.discord} target="_blank" rel="noopener noreferrer">
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        Discord
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Render MangaDex group
    if (source === 'mangadex' && mangadexGroup) {
        const attrs = mangadexGroup.data.attributes;
        const leader = mangadexGroup.data.relationships.find((r) => r.type === 'leader');
        const members = mangadexGroup.data.relationships.filter((r) => r.type === 'member');

        return (
            <div className="min-h-screen bg-background">
                {/* Hero Section */}
                <div className="relative h-64 bg-gradient-to-b from-orange-500/30 via-orange-500/10 to-background">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 left-4 z-10"
                        onClick={handleGoBack}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    {/* Group Avatar Placeholder */}
                    <div className="absolute bottom-0 left-8 translate-y-1/2">
                        <div className="h-32 w-32 rounded-xl bg-muted border-4 border-background flex items-center justify-center">
                            <Users className="h-12 w-12 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 pt-20 pb-8">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{attrs.name}</h1>
                            <div className="flex items-center gap-4 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {members.length + 1} <Trans>members</Trans>
                                </span>
                                {attrs.official && (
                                    <Badge variant="outline" className="border-primary text-primary">
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                        <Trans>Official</Trans>
                                    </Badge>
                                )}
                                {attrs.inactive && <Badge variant="destructive"><Trans>Inactive</Trans></Badge>}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleFollow}>
                                <Heart className="h-4 w-4 mr-2" />
                                <Trans>Follow</Trans>
                            </Button>
                            <Button variant="outline" asChild>
                                <a
                                    href={`https://mangadex.org/group/${mangadexGroup.data.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    <Trans>View on</Trans> MangaDex
                                </a>
                            </Button>
                        </div>
                    </div>

                    {/* Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle><Trans>Information</Trans></CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Leader */}
                            {leader && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Group Leader</Trans></h3>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span>{leader.attributes?.username || leader.id}</span>
                                    </div>
                                </div>
                            )}

                            {/* Languages */}
                            {attrs.focusedLanguages && attrs.focusedLanguages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2">
                                        <Trans>Focused Languages</Trans>
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {attrs.focusedLanguages.map((lang) => (
                                            <Badge key={lang} variant="outline">
                                                {languageFlags[lang] || '🌐'} {lang.toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {attrs.description && (
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Description</Trans></h3>
                                    <p className="text-sm whitespace-pre-wrap">{attrs.description}</p>
                                </div>
                            )}

                            {/* Group ID */}
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Group ID</Trans></h3>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {mangadexGroup.data.id}
                                </code>
                            </div>

                            {/* Where To Find */}
                            {(attrs.website || attrs.discord || attrs.twitter || attrs.mangaUpdates || attrs.ircServer) && (
                                <>
                                    <Separator />
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground mb-2"><Trans>Where To Find</Trans></h3>
                                        <div className="flex flex-wrap gap-2">
                                            {attrs.website && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={attrs.website} target="_blank" rel="noopener noreferrer">
                                                        <Globe className="h-4 w-4 mr-2" />
                                                        <Trans>Website</Trans>
                                                    </a>
                                                </Button>
                                            )}
                                            {attrs.discord && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`https://discord.gg/${attrs.discord}`} target="_blank" rel="noopener noreferrer">
                                                        <MessageSquare className="h-4 w-4 mr-2" />
                                                        Discord
                                                    </a>
                                                </Button>
                                            )}
                                            {attrs.twitter && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`https://twitter.com/${attrs.twitter}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Twitter
                                                    </a>
                                                </Button>
                                            )}
                                            {attrs.mangaUpdates && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`https://www.mangaupdates.com/groups.html?id=${attrs.mangaUpdates}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        MangaUpdates
                                                    </a>
                                                </Button>
                                            )}
                                            {attrs.ircServer && (
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`irc://${attrs.ircServer}${attrs.ircChannel ? `/${attrs.ircChannel}` : ''}`} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        IRC{attrs.ircChannel ? ` #${attrs.ircChannel}` : ''}
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Manga List */}
                    {(isMangaLoading || (groupManga && groupManga.data && groupManga.data.length > 0)) && (
                        <div>
                            <h2 className="text-2xl font-bold mb-4">
                                <Trans>Manga</Trans>
                                {groupManga && (
                                    <span className="text-base font-normal text-muted-foreground ml-2">
                                        ({groupManga.total ?? groupManga.data.length})
                                    </span>
                                )}
                            </h2>
                            {isMangaLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {[...Array(10)].map((_, i) => (
                                        <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {groupManga!.data.map((manga) => (
                                        <MangaCard
                                            key={manga.id}
                                            manga={{
                                                id: manga.id,
                                                type: 'manga',
                                                attributes: {
                                                    title: manga.attributes.title,
                                                    altTitles: manga.attributes.altTitles || [],
                                                    description: manga.attributes.description || {},
                                                    status: (manga.attributes.status || 'ongoing') as 'ongoing' | 'completed' | 'hiatus' | 'cancelled',
                                                    year: manga.attributes.year ?? null,
                                                    contentRating: (manga.attributes.contentRating || 'safe') as 'safe' | 'suggestive' | 'erotica' | 'pornographic',
                                                    tags: (manga.attributes.tags || []) as Array<{
                                                        id: string;
                                                        type: 'tag';
                                                        attributes: {
                                                            name: Record<string, string>;
                                                            description: Record<string, string>;
                                                            group: string;
                                                            version: number;
                                                        };
                                                    }>,
                                                    originalLanguage: 'ja',
                                                    lastVolume: null,
                                                    lastChapter: null,
                                                    publicationDemographic: null,
                                                    isLocked: false,
                                                    links: {},
                                                    state: 'published',
                                                    chapterNumbersResetOnNewVolume: false,
                                                    createdAt: '',
                                                    updatedAt: '',
                                                    version: 1,
                                                },
                                                relationships: manga.relationships,
                                            }}
                                            onClick={() => navigate({ to: '/manga/$mangaId', params: { mangaId: manga.id } })}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};

export default GroupDetail;
