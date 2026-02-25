import { Request, Response } from 'express';
import { CommentService } from '../services/comment_service';
import { getIO } from '../services/socket_service';
import { MangaSourceType } from '@prisma/client';

export const createComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { mangaId, chapterId, content, parentId, sourceType } = req.body;
        const userId = req.user!.userId;

        const comment = await CommentService.createComment({
            userId,
            mangaId,
            chapterId: chapterId || null,
            sourceType: sourceType as MangaSourceType,
            content,
            parentId,
        });

        // Emit socket event
        const io = getIO();
        const roomName = chapterId ? `chapter:${chapterId}` : `manga:${mangaId}`;

        // Also emit to global "latest" room if we have one, or just general broadcast
        io.to(roomName).emit('new_comment', comment);

        // If it's a reply, maybe notify the parent comment owner (future implementation)

        res.status(201).json({ success: true, data: comment });
    } catch (error: any) {
        console.error('Create comment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { mangaId, chapterId } = req.params;
        const { cursor, sourceType } = req.query;

        const result = await CommentService.getComments({
            mangaId,
            chapterId: chapterId === 'series' ? undefined : chapterId,
            cursor: cursor as string,
            sourceType: sourceType as MangaSourceType,
        });

        res.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getReplies = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const replies = await CommentService.getReplies(commentId);
        res.json({ success: true, data: replies });
    } catch (error: any) {
        console.error('Get replies error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getLatestComments = async (req: Request, res: Response): Promise<void> => {
    try {
        const comments = await CommentService.getLatestComments();
        res.json({ success: true, data: comments });
    } catch (error: any) {
        console.error('Get latest comments error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user!.userId;

        const updatedComment = await CommentService.updateComment(userId, commentId, content);

        // Emit update event
        const io = getIO();
        const roomName = updatedComment.chapterId
            ? `chapter:${updatedComment.chapterId}`
            : `manga:${updatedComment.mangaId}`;
        io.to(roomName).emit('update_comment', updatedComment);

        res.json({ success: true, data: updatedComment });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { commentId } = req.params;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const deletedComment = await CommentService.deleteComment(userId, userRole, commentId);

        // Emit delete event
        const io = getIO();
        const roomName = deletedComment.chapterId
            ? `chapter:${deletedComment.chapterId}`
            : `manga:${deletedComment.mangaId}`;
        io.to(roomName).emit('delete_comment', { commentId });

        res.json({ success: true, message: 'Comment deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};
