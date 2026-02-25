import React from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trans } from '@lingui/react/macro';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ArrowLeft,
    ExternalLink,
    BookOpen,
    User,
    Globe,
    Twitter,
} from 'lucide-react';
import { MangaCard } from '@/components/manga-card';

// MangaDex author response type
interface MangaDexAuthorData {
    data: {
        id: string;
        type: string;
        attributes: {
            name: string;
            imageUrl?: string | null;
            biography?: { [key: string]: string };
            twitter?: string | null;
            pixiv?: string | null;
            melonBook?: string | null;
            fanBox?: string | null;
            booth?: string | null;
            nicoVideo?: string | null;
            skeb?: string | null;
            fantia?: string | null;
            tumblr?: string | null;
            youtube?: string | null;
            weibo?: string | null;
            naver?: string | null;
            website?: string | null;
            createdAt: string;
            updatedAt: string;
            version: number;
        };
        relationships: Array<{
            id: string;
            type: string;
            attributes?: {
                title?: { [key: string]: string };
            };
        }>;
    };
}

interface MangaItem {
    id: string;
    type: string;
    attributes: {
        title: { [key: string]: string };
        altTitles?: Array<{ [key: string]: string }>;
        description?: { [key: string]: string };
        status?: string;
        year?: number;
        contentRating?: string;
        tags?: Array<{
            id: string;
            type: string;
            attributes: {
                name: { [key: string]: string };
                group: string;
            };
        }>;
    };
    relationships: Array<{
        id: string;
        type: string;
        attributes?: {
            fileName?: string;
        };
    }>;
}

interface MangaListResponse {
    data: {
        data: MangaItem[];
        total: number;
    };
}

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/v1`;

const fetchAuthor = async (authorId: string): Promise<MangaDexAuthorData> => {
    const response = await fetch(`${API_BASE}/authors/${authorId}`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch author');
    const json = await response.json();
    return json.data;
};

const fetchAuthorManga = async (authorId: string): Promise<MangaListResponse> => {
    const response = await fetch(`${API_BASE}/authors/${authorId}/manga?limit=20`, {
        credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch author manga');
    const json = await response.json();
    return json;
};

const AuthorDetail: React.FC = () => {
    const { authorId } = useParams({ strict: false }) as { authorId: string };
    const navigate = useNavigate();

    const {
        data: author,
        isLoading: isAuthorLoading,
        error: authorError,
    } = useQuery({
        queryKey: ['author', authorId],
        queryFn: () => fetchAuthor(authorId),
    });

    const {
        data: mangaResponse,
        isLoading: isMangaLoading,
    } = useQuery({
        queryKey: ['author', authorId, 'manga'],
        queryFn: () => fetchAuthorManga(authorId),
        enabled: !!author,
    });

    const handleGoBack = () => {
        history.back();
    };

    const handleMangaClick = (mangaId: string) => {
        navigate({ to: '/manga/$mangaId', params: { mangaId } });
    };

    if (isAuthorLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="relative h-48 bg-gradient-to-b from-blue-500/20 to-background">
                    <Skeleton className="absolute bottom-0 left-8 h-24 w-24 translate-y-1/2 rounded-full" />
                </div>
                <div className="container mx-auto px-4 pt-16">
                    <Skeleton className="h-8 w-48 mb-4" />
                    <Skeleton className="h-20 w-full mb-8" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (authorError || !author) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <p className="text-destructive mb-4"><Trans>Unable to load this manga</Trans></p>
                        <Button onClick={handleGoBack}><Trans>Back</Trans></Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const attrs = author.data.attributes;
    const biography = attrs.biography?.en || attrs.biography?.['ja-ro'] || Object.values(attrs.biography || {})[0];
    const mangaList = mangaResponse?.data?.data || [];

    return (
        <div className="min-h-screen bg-background">
            {/* Hero Section */}
            <div className="relative h-48 bg-gradient-to-b from-blue-500/30 via-blue-500/10 to-background">
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 z-10"
                    onClick={handleGoBack}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>

                {/* Author Avatar */}
                <div className="absolute bottom-0 left-8 translate-y-1/2">
                    <div className="h-24 w-24 rounded-full bg-muted border-4 border-background flex items-center justify-center overflow-hidden">
                        {attrs.imageUrl ? (
                            <img
                                src={attrs.imageUrl}
                                alt={attrs.name}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User className="h-10 w-10 text-muted-foreground" />
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 pt-16 pb-8">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">{attrs.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <BookOpen className="h-4 w-4" />
                            <span>{mangaList.length} <Trans>works</Trans></span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <a
                                href={`https://mangadex.org/author/${author.data.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                <Trans>View on</Trans> MangaDex
                            </a>
                        </Button>
                    </div>
                </div>

                {/* Bio & Links */}
                {(biography || attrs.twitter || attrs.website || attrs.pixiv) && (
                    <Card className="mb-8">
                        <CardHeader>
                            <CardTitle><Trans>Information</Trans></CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {biography && (
                                <p className="text-sm whitespace-pre-wrap">{biography}</p>
                            )}

                            <div className="flex flex-wrap gap-2">
                                {attrs.website && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a href={attrs.website} target="_blank" rel="noopener noreferrer">
                                            <Globe className="h-4 w-4 mr-2" />
                                            <Trans>Website</Trans>
                                        </a>
                                    </Button>
                                )}
                                {attrs.twitter && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={`https://twitter.com/${attrs.twitter}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Twitter className="h-4 w-4 mr-2" />
                                            Twitter
                                        </a>
                                    </Button>
                                )}
                                {attrs.pixiv && (
                                    <Button variant="outline" size="sm" asChild>
                                        <a
                                            href={`https://www.pixiv.net/users/${attrs.pixiv}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            <Trans>Pixiv</Trans>
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Manga List */}
                <div>
                    <h2 className="text-2xl font-bold mb-4"><Trans>Works</Trans></h2>
                    {isMangaLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                                <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                            ))}
                        </div>
                    ) : mangaList.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {mangaList.map((manga) => {
                                return (
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
                                                year: manga.attributes.year || null,
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
                                        onClick={() => handleMangaClick(manga.id)}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-muted-foreground"><Trans>No manga followed yet</Trans></p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthorDetail;
