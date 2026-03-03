import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

// Check if Popover exists — if not we need to add it
// shadcn/ui popover uses @radix-ui/react-popover

export function NotificationBell() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    const {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchMore,
        markRead,
        markAllRead,
        deleteNoti,
    } = useNotifications();

    // Guest: show plain bell icon without dropdown
    if (!user) {
        return (
            <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-4 w-4" />
            </Button>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-4 w-4" />
                    {/* Red badge  */}
                    {unreadCount > 0 && (
                        <span className={cn(
                            'absolute flex items-center justify-center',
                            'min-w-[18px] h-[18px] px-1 -top-0.5 -right-0.5',
                            'bg-red-500 text-white text-[10px] font-bold rounded-full',
                            'animate-in fade-in zoom-in duration-200',
                        )}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="w-[380px] p-0"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <h3 className="font-semibold text-sm">Thông báo</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={markAllRead}
                        >
                            <CheckCheck className="h-3.5 w-3.5 mr-1" />
                            Đánh dấu tất cả đã đọc
                        </Button>
                    )}
                </div>

                <Separator />

                {/* Notification list */}
                <ScrollArea className="max-h-[400px]">
                    {loading && notifications.length === 0 ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Chưa có thông báo nào</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border">
                            {notifications.map((notification) => (
                                <div key={notification.id} className="group">
                                    <NotificationItem
                                        notification={notification}
                                        onRead={markRead}
                                        onDelete={deleteNoti}
                                        onClose={() => setOpen(false)}
                                    />
                                </div>
                            ))}

                            {/* Load more */}
                            {hasMore && (
                                <div className="flex justify-center py-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-muted-foreground"
                                        onClick={fetchMore}
                                    >
                                        Xem thêm
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}