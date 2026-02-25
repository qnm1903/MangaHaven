import { Request, Response } from 'express';
import { MangaDexClient } from '../services/mangadex_client';
import StatusCodes from '../constants/status_codes';

const mangaDexClient = new MangaDexClient();

export const searchController = {
    // Advanced manga search with all filters
    async advancedSearch(req: Request, res: Response) {
        try {
            const {
                title,
                limit = 20,
                offset = 0,
                includedTags,
                excludedTags,
                includedTagsMode,
                excludedTagsMode,
                status,
                publicationDemographic,
                contentRating,
                year,
                authors,
                group,
                order,
            } = req.query;

            const params = {
                title: title as string,
                limit: Math.min(Number(limit), 50),
                offset: Number(offset),
                includedTags: parseArrayParam(includedTags),
                excludedTags: parseArrayParam(excludedTags),
                includedTagsMode: includedTagsMode as 'AND' | 'OR' | undefined,
                excludedTagsMode: excludedTagsMode as 'AND' | 'OR' | undefined,
                status: parseArrayParam(status),
                publicationDemographic: parseArrayParam(publicationDemographic),
                contentRating: parseArrayParam(contentRating) || ['safe', 'suggestive', 'erotica'],
                year: year ? (isNaN(Number(year)) ? year as string : Number(year)) : undefined,
                authors: parseArrayParam(authors),
                group: group as string,
                order: order ? JSON.parse(order as string) : { relevance: 'desc' },
            };

            const data = await mangaDexClient.advancedSearchManga(params);

            res.status(StatusCodes.OK).json({
                success: true,
                data,
                cached: true,
            });
        } catch (error: any) {
            console.error('Advanced search error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to perform advanced search',
                error: error.message,
            });
        }
    },

    // Quick search for search bar dropdown (top 5 results)
    async quickSearch(req: Request, res: Response) {
        try {
            const { q } = req.query;

            if (!q || typeof q !== 'string' || q.trim().length < 2) {
                res.status(StatusCodes.OK).json({
                    success: true,
                    data: { data: [] },
                });
                return;
            }

            const params = {
                title: q.trim(),
                limit: 5,
                offset: 0,
                contentRating: ['safe', 'suggestive', 'erotica'],
                order: { relevance: 'desc' },
                includes: ['cover_art', 'author'],
            };

            const data = await mangaDexClient.advancedSearchManga(params);

            res.status(StatusCodes.OK).json({
                success: true,
                data,
                cached: true,
            });
        } catch (error: any) {
            console.error('Quick search error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to perform quick search',
                error: error.message,
            });
        }
    },

    // Search authors for autocomplete
    async searchAuthors(req: Request, res: Response) {
        try {
            const { name, limit = 10 } = req.query;

            if (!name || typeof name !== 'string' || name.trim().length < 2) {
                res.status(StatusCodes.OK).json({
                    success: true,
                    data: { data: [] },
                });
                return;
            }

            const data = await mangaDexClient.searchAuthors({
                name: name.trim(),
                limit: Math.min(Number(limit), 20),
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data,
                cached: true,
            });
        } catch (error: any) {
            console.error('Search authors error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to search authors',
                error: error.message,
            });
        }
    },

    // Search scanlation groups for autocomplete
    async searchGroups(req: Request, res: Response) {
        try {
            const { name, limit = 10 } = req.query;

            if (!name || typeof name !== 'string' || name.trim().length < 2) {
                res.status(StatusCodes.OK).json({
                    success: true,
                    data: { data: [] },
                });
                return;
            }

            const data = await mangaDexClient.searchGroups({
                name: name.trim(),
                limit: Math.min(Number(limit), 20),
            });

            res.status(StatusCodes.OK).json({
                success: true,
                data,
                cached: true,
            });
        } catch (error: any) {
            console.error('Search groups error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to search groups',
                error: error.message,
            });
        }
    },
};

// Helper to parse array query params
function parseArrayParam(param: unknown): string[] | undefined {
    if (!param) return undefined;
    if (Array.isArray(param)) return param as string[];
    if (typeof param === 'string') return [param];
    return undefined;
}

export default searchController;