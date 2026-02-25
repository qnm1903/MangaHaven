import { z } from 'zod';
import api from '@/lib/axios';
import { AxiosError } from 'axios';

// Zod Schemas

// User profile schema
const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().optional(),
  role: z.string(),
  avatarUrl: z.string(),
  emailVerified: z.boolean(),
  timezone: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Update profile input schema
const UpdateProfileDataSchema = z.object({
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').optional(),
  email: z.string().email('Email không hợp lệ').optional(),
  timezone: z.string().optional(),
});

// Update password input schema
const UpdatePasswordDataSchema = z.object({
  currentPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

// API response wrapper
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string().optional(),
    data: dataSchema,
  });

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UpdateProfileData = z.infer<typeof UpdateProfileDataSchema>;
export type UpdatePasswordData = z.infer<typeof UpdatePasswordDataSchema>;

// ============================================================================
// Helpers
// ============================================================================

type ApiErrorResponse = {
  success: boolean;
  message: string;
};

function handleAxiosError(error: unknown): string {
  if (error instanceof Error) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response) {
      return axiosError.response.data?.message || axiosError.message;
    } else if (axiosError.request) {
      return 'Network error - please check your connection';
    } else {
      return axiosError.message;
    }
  }
  return 'An unexpected error occurred';
}

function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[UserService] Validation error:', result.error.flatten());
    throw new Error('Invalid response data from server');
  }
  return result.data;
}

// ============================================================================
// User Service
// ============================================================================

export const userService = {
  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    try {
      const response = await api.get('/api/v1/user/profile');
      const validated = parseResponse(
        ApiResponseSchema(UserProfileSchema),
        response.data
      );
      return validated.data;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid profile data from server');
      }
      throw new Error(handleAxiosError(error));
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    // Validate input
    const validatedInput = UpdateProfileDataSchema.parse(data);

    try {
      const response = await api.put('/api/v1/user/profile', validatedInput);
      const validated = parseResponse(
        ApiResponseSchema(UserProfileSchema),
        response.data
      );
      return validated.data;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid input');
      }
      throw new Error(handleAxiosError(error));
    }
  },

  /**
   * Update user password
   */
  async updatePassword(data: UpdatePasswordData): Promise<void> {
    // Validate input
    const validatedInput = UpdatePasswordDataSchema.parse(data);

    try {
      await api.put('/api/v1/user/password', validatedInput);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid password data');
      }
      throw new Error(handleAxiosError(error));
    }
  },

  /**
   * Upload avatar image
   */
  async uploadAvatar(file: File): Promise<UserProfile> {
    // Validate file
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.size > maxSize) {
      throw new Error('File quá lớn. Tối đa 5MB.');
    }
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Định dạng file không được hỗ trợ. Chỉ chấp nhận JPEG, PNG, WebP, GIF.');
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await api.post('/api/v1/user/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const validated = parseResponse(
        ApiResponseSchema(UserProfileSchema),
        response.data
      );
      return validated.data;
    } catch (error: unknown) {
      throw new Error(handleAxiosError(error));
    }
  },

  /**
   * Remove avatar
   */
  async removeAvatar(): Promise<UserProfile> {
    try {
      const response = await api.delete('/api/v1/user/avatar');
      const validated = parseResponse(
        ApiResponseSchema(UserProfileSchema),
        response.data
      );
      return validated.data;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid response from server');
      }
      throw new Error(handleAxiosError(error));
    }
  },
};

// ============================================================================
// Export Schemas
// ============================================================================

export const schemas = {
  UserProfile: UserProfileSchema,
  UpdateProfileData: UpdateProfileDataSchema,
  UpdatePasswordData: UpdatePasswordDataSchema,
};