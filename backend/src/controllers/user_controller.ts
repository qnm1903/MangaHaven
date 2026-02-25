import { Request, Response } from 'express';
import { UserService, UpdateProfileData, UpdatePasswordData } from '../services/user_service';
import StatusCodes from '../constants/status_codes';
import { upload } from '../services/upload_service';

export class UserController {
  /**
   * Get current user profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      // Use cached user profile from auth middleware if available
      let user = req.userProfile;

      // If not cached, fetch from database
      if (!user) {
        const fetchedUser = await UserService.getProfile(userId);
        if (!fetchedUser) {
          res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: 'User not found',
          });
          return;
        }
        user = fetchedUser;
      }

      // Add avatar URL to response
      const userWithAvatar = {
        ...user,
        avatarUrl: UserService.getAvatarUrl(user),
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: userWithAvatar,
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { displayName, email, timezone } = req.body as UpdateProfileData;

      // Validate input
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid email format',
        });
        return;
      }

      const updatedUser = await UserService.updateProfile(userId, {
        displayName,
        email,
        timezone,
      });

      const userWithAvatar = {
        ...updatedUser,
        avatarUrl: UserService.getAvatarUrl(updatedUser),
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Profile updated successfully',
        data: userWithAvatar,
      });
    } catch (error: any) {
      console.error('Update profile error:', error);

      if (error.message === 'Email already in use by another account') {
        res.status(StatusCodes.CONFLICT).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { currentPassword, newPassword } = req.body as UpdatePasswordData;

      // Validate input
      if (!currentPassword || !newPassword) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Current password and new password are required',
        });
        return;
      }

      if (newPassword.length < 6) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'New password must be at least 6 characters long',
        });
        return;
      }

      await UserService.updatePassword(userId, { currentPassword, newPassword });

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Password updated successfully',
      });
    } catch (error: any) {
      console.error('Update password error:', error);

      if (error.message === 'Current password is incorrect') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message === 'User not found or password not set') {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Cannot update password for this account',
        });
        return;
      }

      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to update password',
      });
    }
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      if (!req.file) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'No image file provided',
        });
        return;
      }

      const updatedUser = await UserService.updateAvatar(userId, req.file);

      const userWithAvatar = {
        ...updatedUser,
        avatarUrl: UserService.getAvatarUrl(updatedUser),
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: userWithAvatar,
      });
    } catch (error: any) {
      console.error('Upload avatar error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to upload avatar',
      });
    }
  }

  /**
   * Remove user avatar
   */
  static async removeAvatar(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const updatedUser = await UserService.removeAvatar(userId);

      const userWithAvatar = {
        ...updatedUser,
        avatarUrl: UserService.getAvatarUrl(updatedUser),
      };

      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Avatar removed successfully',
        data: userWithAvatar,
      });
    } catch (error: any) {
      console.error('Remove avatar error:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to remove avatar',
      });
    }
  }
}
