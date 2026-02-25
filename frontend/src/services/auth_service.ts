import { z } from 'zod';
import api from '@/lib/axios';
import { AxiosError } from 'axios';

// User schema
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.string(),
  timezone: z.string(),
  profilePicture: z.string().nullable().optional(),
  avatarPublicId: z.string().nullable().optional(),
  emailVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Login input schema
const LoginDataSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  rememberMe: z.boolean().optional(),
});

// Register input schema
const RegisterDataSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').optional(),
  timezone: z.string().optional(),
});

// Google login input schema
const GoogleLoginDataSchema = z.object({
  credential: z.string().min(1, 'Credential is required'),
  clientId: z.string().min(1, 'Client ID is required'),
});

// Auth response schema
const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    user: UserSchema,
    accessToken: z.string(),
  }),
});

// Token refresh response schema
const TokenRefreshResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    accessToken: z.string(),
  }),
});

// Profile response schema
const ProfileResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: UserSchema,
});

export type User = z.infer<typeof UserSchema>;
export type LoginData = z.infer<typeof LoginDataSchema>;
export type RegisterData = z.infer<typeof RegisterDataSchema>;
export type GoogleLoginData = z.infer<typeof GoogleLoginDataSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type TokenRefreshResponse = z.infer<typeof TokenRefreshResponseSchema>;
export type ProfileResponse = z.infer<typeof ProfileResponseSchema>;
export type ApiErrorResponse = {
  success: boolean;
  message: string;
  error?: string;
  details?: unknown;
};

// ============================================================================
// Error Handler
// ============================================================================

function handleAxiosError(error: unknown): string {
  if (error instanceof Error) {
    // Check if it's an Axios error
    const axiosError = error as AxiosError<ApiErrorResponse>;
    if (axiosError.response) {
      // Server responded with error status
      return axiosError.response.data?.message || axiosError.message;
    } else if (axiosError.request) {
      // Request was made but no response received
      return 'Network error - please check your connection';
    } else {
      // Error in request setup
      return axiosError.message;
    }
  }
  return 'An unexpected error occurred';
}

/**
 * Parse and validate API response data with Zod schema
 */
function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('[AuthService] Validation error:', result.error.flatten());
    throw new Error('Invalid response data from server');
  }
  return result.data;
}

// ============================================================================
// Auth Service
// ============================================================================

export class AuthService {
  /**
   * Login with email and password
   * Validates input and response
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    // Validate input
    const validatedData = LoginDataSchema.parse(data);

    try {
      const response = await api.post('/api/v1/auth/login', validatedData);
      return parseResponse(AuthResponseSchema, response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid input');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Register new account
   * Validates input and response
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    // Validate input
    const validatedData = RegisterDataSchema.parse(data);

    try {
      const response = await api.post('/api/v1/auth/register', validatedData);
      return parseResponse(AuthResponseSchema, response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid input');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Google auth with ID token credential
   */
  static async googleAuth(credential: string): Promise<AuthResponse> {
    const credentialSchema = z.string().min(1, 'Credential is required');
    const validatedCredential = credentialSchema.parse(credential);

    try {
      const response = await api.post('/api/v1/auth/google-login', {
        credential: validatedCredential,
      });
      return parseResponse(AuthResponseSchema, response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid credential');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Google auth with access token
   */
  static async googleAuthWithAccessToken(accessToken: string): Promise<AuthResponse> {
    const tokenSchema = z.string().min(1, 'Access token is required');
    const validatedToken = tokenSchema.parse(accessToken);

    try {
      const response = await api.post('/api/v1/auth/google-access-token', {
        accessToken: validatedToken,
      });
      return parseResponse(AuthResponseSchema, response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid access token');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Google login with credential and client ID
   */
  static async googleLogin(data: GoogleLoginData): Promise<AuthResponse> {
    const validatedData = GoogleLoginDataSchema.parse(data);

    try {
      const response = await api.post('/api/v1/auth/google-login', {
        credential: validatedData.credential,
        clientId: validatedData.clientId,
      });
      return parseResponse(AuthResponseSchema, response.data);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(error.errors[0]?.message || 'Invalid input');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Logout and clear local storage
   */
  static async logout(): Promise<void> {
    try {
      await api.post('/api/v1/auth/logout');
    } catch (error: unknown) {
      console.error('Logout error:', handleAxiosError(error));
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      localStorage.removeItem('manga-history');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<{ accessToken: string }> {
    try {
      const response = await api.post('/api/v1/auth/refresh-token');
      const validated = parseResponse(TokenRefreshResponseSchema, response.data);
      return validated.data;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid token response from server');
      }
      throw new Error(handleAxiosError(error));
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    try {
      const response = await api.get('/api/v1/user/profile');
      const validated = parseResponse(ProfileResponseSchema, response.data);
      return validated.data;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error('Invalid profile data from server');
      }
      throw new Error(handleAxiosError(error));
    }
  }
}

// ============================================================================
// Export Schemas
// ============================================================================

export const schemas = {
  User: UserSchema,
  LoginData: LoginDataSchema,
  RegisterData: RegisterDataSchema,
  GoogleLoginData: GoogleLoginDataSchema,
  AuthResponse: AuthResponseSchema,
};