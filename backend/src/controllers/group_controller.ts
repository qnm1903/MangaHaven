import { Request, Response } from 'express';
import { MangaDexClient } from '../services/mangadex_client';
import { GroupService } from '../services/group_service';
import { UploadService } from '../services/upload_service';
import StatusCodes from '../constants/status_codes';

const mangaDexClient = new MangaDexClient();

export const groupController = {
    // Get local group by ID (from database)
    async getLocalGroup(req: Request, res: Response) {
        try {
            const { groupId } = req.params;

            const group = await GroupService.getGroupById(groupId);

            if (!group) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Group not found',
                });
                return;
            }

            const logoUrl = GroupService.getLogoUrl(group);

            res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    ...group,
                    logoUrl,
                    source: 'local',
                },
            });
        } catch (error: any) {
            console.error('Get local group error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get group',
                error: error.message,
            });
        }
    },

    // Get MangaDex group by ID
    async getMangaDexGroup(req: Request, res: Response) {
        try {
            const { groupId } = req.params;

            const data = await mangaDexClient.getGroup(groupId);

            res.status(StatusCodes.OK).json({
                success: true,
                data: {
                    ...data,
                    source: 'mangadex',
                },
            });
        } catch (error: any) {
            console.error('Get MangaDex group error:', error);

            if (error.response?.status === 404) {
                res.status(StatusCodes.NOT_FOUND).json({
                    success: false,
                    message: 'Group not found on MangaDex',
                });
                return;
            }

            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get group from MangaDex',
                error: error.message,
            });
        }
    },

    // Get manga worked on by a MangaDex group
    async getMangaDexGroupManga(req: Request, res: Response) {
        try {
            const { groupId } = req.params;
            const limit = parseInt((req.query.limit as string) || '20', 10);
            const offset = parseInt((req.query.offset as string) || '0', 10);

            const data = await mangaDexClient.getMangaByGroup(groupId, limit, offset);

            res.status(StatusCodes.OK).json({
                success: true,
                data,
            });
        } catch (error: any) {
            console.error('Get MangaDex group manga error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to get group manga from MangaDex',
                error: error.message,
            });
        }
    },

    // Upload group logo
    async uploadLogo(req: Request, res: Response) {
        try {
            const { groupId } = req.params;
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            // Check permission
            const isAdmin = await GroupService.isGroupAdmin(groupId, userId);
            if (!isAdmin) {
                res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: 'You do not have permission to update this group',
                });
                return;
            }

            if (!req.file) {
                res.status(StatusCodes.BAD_REQUEST).json({
                    success: false,
                    message: 'No file uploaded',
                });
                return;
            }

            const group = await GroupService.updateLogo(groupId, req.file);
            const logoUrl = GroupService.getLogoUrl(group);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Logo updated successfully',
                data: {
                    logoPublicId: group.logoPublicId,
                    logoUrl,
                },
            });
        } catch (error: any) {
            console.error('Upload logo error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to upload logo',
                error: error.message,
            });
        }
    },

    // Remove group logo
    async removeLogo(req: Request, res: Response) {
        try {
            const { groupId } = req.params;
            const userId = (req as any).user?.id;

            if (!userId) {
                res.status(StatusCodes.UNAUTHORIZED).json({
                    success: false,
                    message: 'Authentication required',
                });
                return;
            }

            // Check permission
            const isAdmin = await GroupService.isGroupAdmin(groupId, userId);
            if (!isAdmin) {
                res.status(StatusCodes.FORBIDDEN).json({
                    success: false,
                    message: 'You do not have permission to update this group',
                });
                return;
            }

            await GroupService.removeLogo(groupId);

            res.status(StatusCodes.OK).json({
                success: true,
                message: 'Logo removed successfully',
            });
        } catch (error: any) {
            console.error('Remove logo error:', error);
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: 'Failed to remove logo',
                error: error.message,
            });
        }
    },
};

export default groupController;