import { Request, Response } from 'express';
import { MangaDexClient } from '../services/mangadex_client';
import StatusCodes from '../constants/status_codes';

const mangaDexClient = new MangaDexClient();

export const authorController = {
    // Get MangaDex author by ID
    async getAuthor(req: Request, res: Response) {
        try {
            const { authorId } = req.params;

            const data = await mangaDexClient.getAuthor(authorId);

            res.status(StatusCodes.OK).json({
                success: true,
                data,
            });
        } catch (error: any) {
            console.error('Get author error:', error);

            if (error.response?.status === 404) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Author not found on MangaDex',
                });
                return;
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get author from MangaDex',
                error: error.message,
            });
        }
    },

    // Get manga list by author
    async getAuthorManga(req: Request, res: Response) {
        try {
            const { authorId } = req.params;
            const { limit = 20, offset = 0 } = req.query;

            const data = await mangaDexClient.advancedSearchManga({
                authors: [authorId],
                limit: Math.min(Number(limit), 50),
                offset: Number(offset),
                includes: ['cover_art', 'author', 'artist'],
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data,
            });
        } catch (error: any) {
            console.error('Get author manga error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get manga by author',
                error: error.message,
            });
        }
    },
};

export default authorController;