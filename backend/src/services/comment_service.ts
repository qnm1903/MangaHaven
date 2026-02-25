import { MangaSourceType } from '@prisma/client';
import prisma from '../db/prisma';

export class CommentService {
    static async createComment(data: {
        userId: string;
        mangaId: string;
        chapterId?: string;
        sourceType?: MangaSourceType;
        content: string;
        parentId?: string;
    }) {
        if (data.parentId) {
            const parent = await prisma.comment.findUnique({
                where: { id: data.parentId },
            });
            if (!parent) throw new Error('Parent comment not found');
        }

        return await prisma.comment.create({
            data: {
                userId: data.userId,
                mangaId: data.mangaId,
                chapterId: data.chapterId,
                sourceType: data.sourceType || MangaSourceType.MANGADEX,
                content: data.content,
                parentId: data.parentId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        profilePicture: true,
                        role: true,
                    },
                },
            },
        });
    }

    static async getComments(params: {
        mangaId: string;
        chapterId?: string;
        cursor?: string;
        limit?: number;
        sourceType?: MangaSourceType;
    }) {
        const limit = params.limit || 20;
        const where: any = {
            mangaId: params.mangaId,
            sourceType: params.sourceType || MangaSourceType.MANGADEX,
            parentId: null, // Only fetch top-level comments
        };

        if (params.chapterId) {
            where.chapterId = params.chapterId;
        } else {
            // If getting manga comments, include those with null chapterId (series comments)
            // OR should we include all comments?
            // Usually "Manga Comments" tab shows comments about the series.
            // "Chapter Comments" shows comments about the chapter.
            where.chapterId = null;
        }

        const comments = await prisma.comment.findMany({
            where,
            take: limit + 1, // Fetch one more to check for next page
            cursor: params.cursor ? { id: params.cursor } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePicture: true,
                        role: true,
                    },
                },
                _count: {
                    select: { replies: true },
                },
            },
        });

        let nextCursor: string | undefined = undefined;
        if (comments.length > limit) {
            const nextItem = comments.pop();
            nextCursor = nextItem?.id;
        }

        return {
            comments,
            nextCursor,
        };
    }

    static async getReplies(commentId: string, limit = 10) {
        return await prisma.comment.findMany({
            where: { parentId: commentId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePicture: true,
                        role: true,
                    },
                },
            },
        });
    }

    static async getLatestComments(limit = 10) {
        return await prisma.comment.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePicture: true,
                    }
                }
            }
        });
    }

    static async updateComment(userId: string, commentId: string, content: string) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) throw new Error('Comment not found');
        if (comment.userId !== userId) throw new Error('Unauthorized');

        return await prisma.comment.update({
            where: { id: commentId },
            data: {
                content,
                isEdited: true,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePicture: true,
                        role: true,
                    },
                },
            },
        });
    }

    static async deleteComment(userId: string, userRole: string, commentId: string) {
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
        });

        if (!comment) throw new Error('Comment not found');

        const isOwner = comment.userId === userId;
        const isAdmin = ['ADMIN', 'MODERATOR'].includes(userRole);

        if (!isOwner && !isAdmin) {
            throw new Error('Unauthorized');
        }

        return await prisma.comment.delete({
            where: { id: commentId },
        });
    }
}