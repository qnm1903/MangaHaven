import { prisma } from '../db/prisma';
import { PasswordUtils } from '../utils/password';
import { User } from '@prisma/client';
import { UploadService } from './upload_service';

export interface UpdateProfileData {
  displayName?: string;
  email?: string;
  timezone?: string;
}

export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class UserService {
  /**
   * Get user profile by ID
   */
  static async getProfile(userId: string): Promise<Partial<User> | null> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    return await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarPublicId: true,
        profilePicture: true,
        emailVerified: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update user profile
   */
  static async updateProfile(userId: string, data: UpdateProfileData): Promise<User> {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new Error('Email already in use by another account');
      }
    }

    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        // If email is changed, mark as unverified
        ...(data.email && { emailVerified: false }),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarPublicId: true,
        profilePicture: true,
        emailVerified: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as User;
  }

  /**
   * Update user password
   */
  static async updatePassword(userId: string, data: UpdatePasswordData): Promise<void> {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new Error('User not found or password not set');
    }

    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await PasswordUtils.hashPassword(data.newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  /**
   * Update user avatar
   */
  static async updateAvatar(userId: string, file: Express.Multer.File): Promise<User> {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    // Get current user to check for existing avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarPublicId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Delete old avatar if exists
    if (user.avatarPublicId) {
      await UploadService.deleteAvatar(user.avatarPublicId);
    }

    // Upload new avatar
    const uploadResult = await UploadService.uploadAvatar(file, userId);

    // Update user with new avatar info
    return await prisma.user.update({
      where: { id: userId },
      data: {
        avatarPublicId: uploadResult.public_id,
        profilePicture: uploadResult.secure_url,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarPublicId: true,
        profilePicture: true,
        emailVerified: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as User;
  }

  /**
   * Remove user avatar
   */
  static async removeAvatar(userId: string): Promise<User> {
    // Validate inputs
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid user ID');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        avatarPublicId: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Delete avatar from Cloudinary if exists
    if (user.avatarPublicId) {
      await UploadService.deleteAvatar(user.avatarPublicId);
    }

    // Remove avatar from database
    return await prisma.user.update({
      where: { id: userId },
      data: {
        avatarPublicId: null,
        profilePicture: null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        avatarPublicId: true,
        profilePicture: true,
        emailVerified: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as User;
  }

  /**
   * Get user avatar URL
   */
  static getAvatarUrl(user: Partial<User>): string {
    if (user.avatarPublicId && user.profilePicture) {
      // Use profilePicture (secure_url from Cloudinary) directly — it contains the asset version
      // number (e.g. v1771950053) which busts browser/CDN cache on every upload.
      // UploadService.getAvatarUrl() omits the version, causing stale cached images to persist
      // after delete + re-upload to the same public_id.
      return user.profilePicture;
    } else if (user.profilePicture) {
      // Google OAuth profile picture or other external URL
      return user.profilePicture;
    } else {
      return '/default-avatar.svg';
    }
  }
}
