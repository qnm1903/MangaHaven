import { Settings2, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';
import { Trans } from '@lingui/react/macro';
import mangaDexLogo from '../../assets/manga-dex.svg';

export const MaintenancePage = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-muted/30 p-8 rounded-full mb-8">
                <Settings2 className="w-16 h-16 text-primary animate-[spin_4s_linear_infinite]" />
            </div>

            <h1 className="text-3xl font-bold mb-4 tracking-tight">
                <Trans>Down for Maintenance</Trans>
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
                <Trans>Mangadex service is temporarily down for maintenance. Please try again later.</Trans>
            </p>

            <Button onClick={() => window.open('https://status.mangadex.org/', '_blank')} size="lg" className="gap-2 focus-visible:ring-offset-2">
                <img src={mangaDexLogo} alt="MangaDex" className="w-5 h-5 dark:invert" />
                <Trans>Check Mangadex Status Page</Trans>
                <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
            </Button>
        </div>
    );
};