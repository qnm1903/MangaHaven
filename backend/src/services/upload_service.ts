import { cloudinary } from '../config/cloudinary';
import { UploadApiResponse } from 'cloudinary';
import multer from 'multer';

// Multer configuration for memory storage
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  },
});

export class UploadService {
  /**
   * Upload avatar to Cloudinary
   */
  static async uploadAvatar(file: Express.Multer.File, userId: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `avatars/${userId}`,
          folder: 'manga-app/avatars',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        }
      ).end(file.buffer);
    });
  }

  /**
   * Delete avatar from Cloudinary
   */
  static async deleteAvatar(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Dont throw error, just log it
    }
  }

  /**
   * Generate optimized avatar URL
   */
  static getAvatarUrl(publicId: string, width = 200, height = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }

  /**
   * Upload group logo to Cloudinary
   */
  static async uploadGroupLogo(file: Express.Multer.File, groupId: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `group-logos/${groupId}`,
          folder: 'manga-app/group-logos',
          transformation: [
            { width: 400, height: 400, crop: 'fill' },
            { quality: 'auto', fetch_format: 'auto' }
          ],
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        }
      ).end(file.buffer);
    });
  }

  /**
   * Delete group logo from Cloudinary
   */
  static async deleteGroupLogo(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting group logo from Cloudinary:', error);
    }
  }

  /**
   * Generate optimized group logo URL
   */
  static getGroupLogoUrl(publicId: string, width = 200, height = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }
}