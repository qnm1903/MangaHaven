import React, { useState, useCallback } from 'react';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { followService, type MangaSource } from '@/services/follow_service';

import { useToast } from '@/hooks/use_toast';

interface FollowButtonProps {
    mangaId: string;
    source?: MangaSource;
    initialIsFollowing?: boolean;
    variant?: 'default' | 'outline' | 'ghost';
    className?: string;
    size?: 'default' | 'sm' | 'lg' | 'icon';
    onFollowChange?: (isFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
    mangaId,
    source = 'MANGADEX',
    initialIsFollowing = false,
    variant = 'default',
    className = '',
    size = 'default',
    onFollowChange,
}) => {
    const { toast } = useToast();
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggleFollow = useCallback(async () => {
        setIsLoading(true);
        try {
            if (isFollowing) {
                await followService.unfollowManga(mangaId, source);
                setIsFollowing(false);
                onFollowChange?.(false);
                toast({ title: t`Unfollowed`, description: t`Removed from your library.` });
            } else {
                await followService.followManga(mangaId, source);
                setIsFollowing(true);
                onFollowChange?.(true);
                toast({ title: t`Following!`, description: t`Added to your library. You'll see updates in your feed.` });
            }
        } catch (err: any) {
            const message = err?.response?.data?.message ?? err?.message ?? t`Something went wrong.`;
            toast({ title: t`Error`, description: message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [isFollowing, mangaId, source, onFollowChange, toast]);

    if (isLoading) {
        return (
            <Button variant={variant} size={size} disabled className={className}>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isFollowing ? <Trans>Unfollowing...</Trans> : <Trans>Following...</Trans>}
            </Button>
        );
    }

    if (isFollowing) {
        return (
            <Button
                variant="secondary"
                size={size}
                className={`bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-rose-300 border-rose-500/30 ${className}`}
                onClick={handleToggleFollow}
            >
                <Heart className="mr-2 h-4 w-4 fill-current" />
                <Trans>Following</Trans>
            </Button>
        );
    }

    return (
        <Button variant={variant} size={size} className={className} onClick={handleToggleFollow}>
            <Heart className="mr-2 h-4 w-4" />
            <Trans>Follow</Trans>
        </Button>
    );
};

export default FollowButton;