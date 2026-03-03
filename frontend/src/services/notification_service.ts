import api from '@/lib/axios';

export interface Notification {
    id: string;
    type: 'COMMENT_REPLY' | 'NEW_CHAPTER' | 'GROUP_UPLOAD' | 'FAVORITE_UPDATE' | 'SYSTEM';
    title: string;
    message: string;
    payload: Record<string, any> | null;
    read: boolean;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    nextCursor?: string;
}

export const getNotifications = async (cursor?: string, limit?: number): Promise<NotificationListResponse> => {
    const params: Record<string, string | number | undefined> = { cursor, limit };
    const response = await api.get('/api/v1/notifications', { params });
    return response.data.data;
};

export const getUnreadCount = async (): Promise<number> => {
    const response = await api.get('/api/v1/notifications/unread-count');
    return response.data.data.count;
};

export const markAsRead = async (id: string): Promise<Notification> => {
    const response = await api.patch(`/api/v1/notifications/${id}/read`);
    return response.data.data;
};

export const markAllAsRead = async (): Promise<{ updated: number }> => {
    const response = await api.patch('/api/v1/notifications/read-all');
    return response.data.data;
};

export const deleteNotification = async (id: string): Promise<void> => {
    await api.delete(`/api/v1/notifications/${id}`);
};