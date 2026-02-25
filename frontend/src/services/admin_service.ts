import { z } from 'zod';
import api from '../lib/axios';
import { AxiosError } from 'axios';

// Zod Schemas

// User role enum
const UserRoleSchema = z.enum(['USER', 'ADMIN', 'MODERATOR']);

// Manga status enum
const MangaStatusSchema = z.enum(['ONGOING', 'COMPLETED', 'HIATUS', 'CANCELLED']);

// Admin User schema
const AdminUserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    role: UserRoleSchema,
    isActive: z.boolean(),
    timezone: z.string().optional(),
    lastLoginAt: z.string().nullable().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional(),
});

// Admin Manga schema
const AdminMangaSchema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: MangaStatusSchema,
    views: z.number().int().nonnegative(),
    rating: z.number().nullable(),
    totalChapters: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

// Dashboard totals schema
const DashboardTotalsSchema = z.object({
    userCount: z.number().int().nonnegative(),
    activeUserCount: z.number().int().nonnegative(),
    inactiveUserCount: z.number().int().nonnegative(),
    publishedMangaCount: z.number().int().nonnegative(),
    blockedUserCount: z.number().int().nonnegative(),
    adminCount: z.number().int().nonnegative(),
    moderatorCount: z.number().int().nonnegative(),
});

// Dashboard summary schema
const DashboardSummarySchema = z.object({
    totals: DashboardTotalsSchema,
    recentManga: z.array(AdminMangaSchema),
    recentUsers: z.array(AdminUserSchema),
});

// Pagination schema
const PaginationSchema = z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
});

// Search users response schema
const SearchUsersResponseSchema = z.object({
    query: z.string(),
    pagination: PaginationSchema,
    results: z.array(AdminUserSchema),
});

// Block/Unblock user response schema
const BlockUserResponseSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    displayName: z.string().nullable(),
    role: z.string(),
    isActive: z.boolean(),
});

// API response wrapper schema
const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
    z.object({
        success: z.boolean(),
        message: z.string().optional(),
        data: dataSchema,
        errors: z.record(z.array(z.string())).optional(),
    });


export type AdminUser = z.infer<typeof AdminUserSchema>;
export type AdminManga = z.infer<typeof AdminMangaSchema>;
export type DashboardTotals = z.infer<typeof DashboardTotalsSchema>;
export type DashboardSummary = z.infer<typeof DashboardSummarySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type SearchUsersResponse = z.infer<typeof SearchUsersResponseSchema>;
export type BlockUserResponse = z.infer<typeof BlockUserResponseSchema>;

interface ApiErrorResponse {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
}

// ============================================================================
// Error Handler
// ============================================================================

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

/**
 * Parse and validate API response data with Zod schema
 * Throws ZodError if validation fails
 */
function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        console.error('[AdminService] Validation error:', result.error.flatten());
        throw new Error('Invalid response data from server');
    }
    return result.data;
}

// ============================================================================
// Admin Service
// ============================================================================

export class AdminService {
    /**
     * Fetch dashboard summary statistics
     * Validates response against DashboardSummarySchema
     */
    static async getDashboardSummary(): Promise<DashboardSummary> {
        try {
            const response = await api.get('/api/v1/admin/dashboard/summary');
            const apiResponse = parseResponse(
                createApiResponseSchema(DashboardSummarySchema),
                response.data
            );
            return apiResponse.data;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                console.error('[AdminService] Schema validation failed:', error.flatten());
                throw new Error('Received invalid data from server');
            }
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Search users by email with pagination
     * Validates response against SearchUsersResponseSchema
     */
    static async searchUsers(
        email: string = '',
        page: number = 1,
        limit: number = 10
    ): Promise<SearchUsersResponse> {
        // Input validation
        const inputSchema = z.object({
            email: z.string(),
            page: z.number().int().positive(),
            limit: z.number().int().min(1).max(100),
        });

        const validatedInput = inputSchema.parse({ email, page, limit });

        try {
            const params = new URLSearchParams({
                email: validatedInput.email,
                page: String(validatedInput.page),
                limit: String(validatedInput.limit),
            });

            const response = await api.get(`/api/v1/admin/users/search?${params.toString()}`);
            const apiResponse = parseResponse(
                createApiResponseSchema(SearchUsersResponseSchema),
                response.data
            );
            return apiResponse.data;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                console.error('[AdminService] Schema validation failed:', error.flatten());
                throw new Error('Received invalid data from server');
            }
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Block a user by ID
     * Validates userId as UUID and response against BlockUserResponseSchema
     */
    static async blockUser(userId: string): Promise<BlockUserResponse> {
        // Input validation
        const userIdSchema = z.string().uuid('Invalid user ID format');
        const validatedUserId = userIdSchema.parse(userId);

        try {
            const response = await api.post('/api/v1/admin/users/block', {
                userId: validatedUserId,
            });
            const apiResponse = parseResponse(
                createApiResponseSchema(BlockUserResponseSchema),
                response.data
            );
            return apiResponse.data;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                console.error('[AdminService] Validation failed:', error.flatten());
                throw new Error('Invalid input or response data');
            }
            throw new Error(handleAxiosError(error));
        }
    }

    /**
     * Unblock a user by ID
     * Validates userId as UUID and response against BlockUserResponseSchema
     */
    static async unblockUser(userId: string): Promise<BlockUserResponse> {
        // Input validation
        const userIdSchema = z.string().uuid('Invalid user ID format');
        const validatedUserId = userIdSchema.parse(userId);

        try {
            const response = await api.post('/api/v1/admin/users/unblock', {
                userId: validatedUserId,
            });
            const apiResponse = parseResponse(
                createApiResponseSchema(BlockUserResponseSchema),
                response.data
            );
            return apiResponse.data;
        } catch (error: unknown) {
            if (error instanceof z.ZodError) {
                console.error('[AdminService] Validation failed:', error.flatten());
                throw new Error('Invalid input or response data');
            }
            throw new Error(handleAxiosError(error));
        }
    }
}

// ============================================================================
// Export Schemas (for external use if needed)
// ============================================================================

export const schemas = {
    AdminUser: AdminUserSchema,
    AdminManga: AdminMangaSchema,
    DashboardTotals: DashboardTotalsSchema,
    DashboardSummary: DashboardSummarySchema,
    Pagination: PaginationSchema,
    SearchUsersResponse: SearchUsersResponseSchema,
    BlockUserResponse: BlockUserResponseSchema,
};