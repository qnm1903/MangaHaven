import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import StatusCodes from '../constants/status_codes';

// Zod schemas for input validation
const searchUsersSchema = z.object({
  email: z.string().optional().default(''),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

const blockUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

const unblockUserSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Types for API responses
interface DashboardSummary {
  totals: {
    userCount: number;
    activeUserCount: number;
    inactiveUserCount: number;
    publishedMangaCount: number;
    blockedUserCount: number;
    adminCount: number;
    moderatorCount: number;
  };
  recentManga: Array<{
    id: string;
    title: string;
    status: string;
    views: number;
    rating: number | null;
    totalChapters: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
  }>;
}

export class AdminController {
  /**
   * Get dashboard summary with real database statistics
   */
  static async getDashboardSummary(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Run all count queries in parallel for performance
      const [
        userCount,
        activeUserCount,
        blockedUserCount,
        adminCount,
        moderatorCount,
        publishedMangaCount,
        recentManga,
        recentUsers,
      ] = await Promise.all([
        // Total users
        prisma.user.count(),
        // Active users
        prisma.user.count({ where: { isActive: true } }),
        // Blocked/inactive users
        prisma.user.count({ where: { isActive: false } }),
        // Admin count
        prisma.user.count({ where: { role: 'ADMIN' } }),
        // Moderator count
        prisma.user.count({ where: { role: 'MODERATOR' } }),
        // Published manga count
        prisma.submittedManga.count(),
        // Recent manga (last 5)
        prisma.submittedManga.findMany({
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            views: true,
            rating: true,
            totalChapters: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        // Recent users (last 10)
        prisma.user.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        }),
      ]);

      const summary: DashboardSummary = {
        totals: {
          userCount,
          activeUserCount,
          inactiveUserCount: blockedUserCount,
          publishedMangaCount,
          blockedUserCount,
          adminCount,
          moderatorCount,
        },
        recentManga,
        recentUsers,
      };

      res.status(StatusCodes.OK).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search users by email with pagination
   */
  static async searchUsersByEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate query parameters
      const validationResult = searchUsersSchema.safeParse(req.query);

      if (!validationResult.success) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid query parameters',
          errors: validationResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { email, page, limit } = validationResult.data;
      const offset = (page - 1) * limit;

      // Build where clause for email search
      const whereClause = email.trim()
        ? {
          email: {
            contains: email.trim(),
            mode: 'insensitive' as const,
          },
        }
        : {};

      // Run count and find in parallel
      const [total, users] = await Promise.all([
        prisma.user.count({ where: whereClause }),
        prisma.user.findMany({
          where: whereClause,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            isActive: true,
            timezone: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          query: email,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          results: users,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block a user (set isActive to false)
   */
  static async blockUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request body
      const validationResult = blockUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid request body',
          errors: validationResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { userId } = validationResult.data;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Prevent blocking admins
      if (user.role === 'ADMIN') {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: 'Cannot block admin users',
        });
        return;
      }

      // Check if already blocked
      if (!user.isActive) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'User is already blocked',
        });
        return;
      }

      // Block the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
        },
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `User ${updatedUser.email} has been blocked successfully`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblock a user (set isActive to true)
   */
  static async unblockUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Validate request body
      const validationResult = unblockUserSchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'Invalid request body',
          errors: validationResult.error.flatten().fieldErrors,
        });
        return;
      }

      const { userId } = validationResult.data;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, isActive: true },
      });

      if (!user) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Check if already active
      if (user.isActive) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: 'User is already active',
        });
        return;
      }

      // Unblock the user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: true },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
        },
      });

      res.status(StatusCodes.OK).json({
        success: true,
        message: `User ${updatedUser.email} has been unblocked successfully`,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}