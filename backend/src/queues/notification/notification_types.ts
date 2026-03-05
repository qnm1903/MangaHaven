/**
 * Discriminated union for all notification job payloads.
 *
 * To add a new notification type:
 *  1. Add an entry to `NotificationJobMap`
 *  2. Add a producer helper in `notification.queue.ts`
 *  3. Add a handler case in `notification.worker.ts`
 */

export interface CommentReplyPayload {
    targetUserId: string;
    replyUserId: string;
    mangaId: string;
    commentId: string;
    parentCommentId: string; // The parent comment whose thread needs expanding
    chapterId?: string; // Present if the comment is on a chapter page
}

// ──────────────────────────────────────────────
// Phase 2 (stubs — not yet implemented)
// ──────────────────────────────────────────────

export interface NewChapterPayload {
    targetUserId: string;
    mangaId: string;
    mangaTitle: string;
    chapterId: string;
    chapterNumber?: string;
}

export interface GroupUploadPayload {
    targetUserId: string;
    groupId: string;
    groupName: string;
    mangaId: string;
    mangaTitle: string;
}

export interface FavoriteUpdatePayload {
    targetUserId: string;
    mangaId: string;
    mangaTitle: string;
    updateType: 'STATUS_CHANGE' | 'NEW_COVER' | 'DESCRIPTION_UPDATE';
    details?: string;
}

export interface SystemNotificationPayload {
    message: string;
    targetUserIds: string[] | 'all';
}

// Job name -> Payload mapping
export interface NotificationJobMap {
    'comment-reply': CommentReplyPayload;
    'new-chapter': NewChapterPayload;
    'group-upload': GroupUploadPayload;
    'favorite-update': FavoriteUpdatePayload;
    'system': SystemNotificationPayload;
    'check-new-chapters': Record<string, never>;
}

export type NotificationJobName = keyof NotificationJobMap;