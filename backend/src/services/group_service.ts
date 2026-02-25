import { prisma } from '../db/prisma';
import { TranslationGroup } from '@prisma/client';
import { UploadService } from './upload_service';

export interface CreateGroupData {
    name: string;
    description?: string;
    website?: string;
    discord?: string;
    focusedLanguages?: string[];
}

export interface UpdateGroupData {
    name?: string;
    description?: string;
    website?: string;
    discord?: string;
    focusedLanguages?: string[];
}

export class GroupService {
    /**
     * Get group by ID with members
     */
    static async getGroupById(groupId: string) {
        return await prisma.translationGroup.findUnique({
            where: { id: groupId },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePicture: true,
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                displayName: true,
                                profilePicture: true,
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        submittedManga: true,
                    }
                }
            }
        });
    }

    /**
     * Create new group
     */
    static async createGroup(userId: string, data: CreateGroupData): Promise<TranslationGroup> {
        return await prisma.translationGroup.create({
            data: {
                name: data.name,
                description: data.description,
                website: data.website,
                discord: data.discord,
                focusedLanguages: data.focusedLanguages || [],
                createdById: userId,
            },
        });
    }

    /**
     * Update group
     */
    static async updateGroup(groupId: string, data: UpdateGroupData): Promise<TranslationGroup> {
        return await prisma.translationGroup.update({
            where: { id: groupId },
            data,
        });
    }

    /**
     * Update group logo
     */
    static async updateLogo(groupId: string, file: Express.Multer.File): Promise<TranslationGroup> {
        const group = await prisma.translationGroup.findUnique({
            where: { id: groupId },
            select: { id: true, logoPublicId: true },
        });

        if (!group) {
            throw new Error('Group not found');
        }

        // Delete old logo if exists
        if (group.logoPublicId) {
            await UploadService.deleteGroupLogo(group.logoPublicId);
        }

        // Upload new logo
        const uploadResult = await UploadService.uploadGroupLogo(file, groupId);

        // Update group with new logo info
        return await prisma.translationGroup.update({
            where: { id: groupId },
            data: {
                logoPublicId: uploadResult.public_id,
            },
        });
    }

    /**
     * Remove group logo
     */
    static async removeLogo(groupId: string): Promise<TranslationGroup> {
        const group = await prisma.translationGroup.findUnique({
            where: { id: groupId },
            select: { id: true, logoPublicId: true },
        });

        if (!group) {
            throw new Error('Group not found');
        }

        // Delete logo from Cloudinary if exists
        if (group.logoPublicId) {
            await UploadService.deleteGroupLogo(group.logoPublicId);
        }

        // Remove logo from database
        return await prisma.translationGroup.update({
            where: { id: groupId },
            data: { logoPublicId: null },
        });
    }

    /**
     * Delete group (with logo cleanup)
     */
    static async deleteGroup(groupId: string): Promise<void> {
        const group = await prisma.translationGroup.findUnique({
            where: { id: groupId },
            select: { id: true, logoPublicId: true },
        });

        if (!group) {
            throw new Error('Group not found');
        }

        // Delete logo from Cloudinary if exists
        if (group.logoPublicId) {
            await UploadService.deleteGroupLogo(group.logoPublicId);
        }

        // Delete group members first
        await prisma.groupMember.deleteMany({
            where: { groupId },
        });

        // Delete group
        await prisma.translationGroup.delete({
            where: { id: groupId },
        });
    }

    /**
     * Get logo URL for a group
     */
    static getLogoUrl(group: { logoPublicId?: string | null }, width = 200, height = 200): string | null {
        if (group.logoPublicId) {
            return UploadService.getGroupLogoUrl(group.logoPublicId, width, height);
        }
        return null;
    }

    /**
     * Check if user is group owner or admin
     */
    static async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
        const group = await prisma.translationGroup.findUnique({
            where: { id: groupId },
            select: { createdById: true },
        });

        if (!group) return false;

        // Owner is always admin
        if (group.createdById === userId) return true;

        // Check if member has admin role
        const member = await prisma.groupMember.findUnique({
            where: {
                userId_groupId: { userId, groupId }
            },
            select: { role: true },
        });

        return member?.role === 'admin';
    }
}