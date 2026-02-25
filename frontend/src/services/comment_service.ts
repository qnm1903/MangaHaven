import api from '@/lib/axios';

export interface User {
    id: string;
    displayName: string | null;
    profilePicture: string | null;
    role: string;
}

export interface Comment {
    id: string;
    userId: string;
    mangaId: string;
    chapterId: string | null;
    content: string;
    parentId: string | null;
    createdAt: string;
    updatedAt: string;
    isEdited: boolean;
    user: User;
    _count?: {
        replies: number;
    };
    replies?: Comment[];
}

export interface CommentResponse {
    comments: Comment[];
    nextCursor?: string;
}

export const getComments = async (
    mangaId: string,
    chapterId?: string,
    cursor?: string
): Promise<CommentResponse> => {
    const params: Record<string, string | undefined> = { cursor };

    let url = `/api/v1/comments/${mangaId}`;
    if (chapterId) {
        url += `/chapter/${chapterId}`;
    }

    const response = await api.get(url, { params });
    return response.data.data;
};

export const createComment = async (data: {
    mangaId: string;
    chapterId?: string;
    content: string;
    parentId?: string;
    sourceType?: 'MANGADEX' | 'LOCAL';
}): Promise<Comment> => {
    const response = await api.post('/api/v1/comments', data);
    return response.data.data;
};

export const updateComment = async (commentId: string, content: string): Promise<Comment> => {
    const response = await api.put(`/api/v1/comments/${commentId}`, { content });
    return response.data.data;
};

export const deleteComment = async (commentId: string): Promise<void> => {
    await api.delete(`/api/v1/comments/${commentId}`);
};

export const getReplies = async (commentId: string): Promise<Comment[]> => {
    const response = await api.get(`/api/v1/comments/replies/${commentId}`);
    return response.data.data;
};

export const getLatestComments = async (): Promise<Comment[]> => {
    const response = await api.get('/api/v1/comments/latest');
    return response.data.data;
}