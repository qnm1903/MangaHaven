import { useNavigate } from '@tanstack/react-router';
import { MessageSquare, BookOpen, Users, Star, Info, Trash2 } from 'lucide-react';
import type { Notification } from '@/services/notification_service';
import { cn } from '@/lib/utils';

interface NotificationItemProps {
    notification: Notification;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

// Format relative time (e.g. "2 phút trước")
function timeAgo(dateStr: string): string {
    const now = Date.now();
    const date = new Date(dateStr).getTime();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

// Icon per notification type
function NotificationIcon({ type }: { type: Notification['type'] }) {
    const iconClass = 'h-4 w-4 shrink-0';
    switch (type) {
        case 'COMMENT_REPLY':
            return <MessageSquare className={cn(iconClass, 'text-blue-500')} />;
        case 'NEW_CHAPTER':
            return <BookOpen className={cn(iconClass, 'text-green-500')} />;
        case 'GROUP_UPLOAD':
            return <Users className={cn(iconClass, 'text-purple-500')} />;
        case 'FAVORITE_UPDATE':
            return <Star className={cn(iconClass, 'text-yellow-500')} />;
        case 'SYSTEM':
            return <Info className={cn(iconClass, 'text-gray-500')} />;
        default:
            return <Info className={cn(iconClass, 'text-gray-500')} />;
    }
}

export function NotificationItem({ notification, onRead, onDelete, onClose }: NotificationItemProps) {
    const navigate = useNavigate();

    const handleClick = () => {
        // Mark as read on click
        if (!notification.read) {
            onRead(notification.id);
        }

        // Navigate based on type
        const payload = notification.payload;
        if (!payload) {
            onClose();
            return;
        }

        switch (notification.type) {
            case 'COMMENT_REPLY': {
                const { mangaId, chapterId, commentId, parentCommentId } = payload;
                // Store target + parent in sessionStorage — CommentSection auto-expands thread & scrolls
                if (commentId) {
                    sessionStorage.setItem('scrollToComment', commentId);
                    if (parentCommentId) {
                        sessionStorage.setItem('expandParentComment', parentCommentId);
                    }
                }
                if (chapterId) {
                    navigate({ to: '/chapter/$chapterId', params: { chapterId } });
                } else if (mangaId) {
                    navigate({ to: '/manga/$mangaId', params: { mangaId } });
                }
                break;
            }
            case 'NEW_CHAPTER':
                if (payload.chapterId) {
                    navigate({ to: '/chapter/$chapterId', params: { chapterId: payload.chapterId } });
                }
                break;
            case 'GROUP_UPLOAD':
            case 'FAVORITE_UPDATE':
                if (payload.mangaId) {
                    navigate({ to: '/manga/$mangaId', params: { mangaId: payload.mangaId } });
                }
                break;
            case 'SYSTEM':
                break;
        }

        onClose();
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(notification.id);
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors',
                'hover:bg-accent/50',
                !notification.read && 'bg-accent/20',
            )}
        >
            {/* Unread dot */}
            <div className="flex items-center pt-1">
                <div
                    className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        !notification.read ? 'bg-blue-500' : 'bg-transparent',
                    )}
                />
            </div>

            {/* Icon */}
            <div className="pt-0.5">
                <NotificationIcon type={notification.type} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className={cn(
                    'text-sm leading-snug',
                    !notification.read ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}>
                    {notification.message}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    {timeAgo(notification.createdAt)}
                </p>
            </div>

            {/* Delete button */}
            <button
                onClick={handleDelete}
                className="shrink-0 p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                title="Xóa thông báo"
            >
                <Trash2 className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}