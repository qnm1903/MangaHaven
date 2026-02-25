import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { AuthService } from '../services/auth_service';

/**
 * Core authentication middleware factory
 * @param isOptional If true, will not return 401 even if authentication fails
 */
const createAuthMiddleware = (isOptional: boolean) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      let token = req.cookies?.accessToken;

      if (!token) {
        token = JWTUtils.getTokenFromHeader(req.headers.authorization);
      }

      if (!token) {
        if (isOptional) return next();
        res.status(401).json({
          success: false,
          message: 'Access token required',
          redirectTo: '/login'
        });
        return;
      }

      // Verify token
      const payload = JWTUtils.verifyAccessToken(token);

      // Verify user still exists and is active
      const user = await AuthService.getUserById(payload.userId);
      if (!user || !user.isActive) {
        if (isOptional) return next();
        res.status(401).json({
          success: false,
          message: 'User not found or inactive',
          redirectTo: '/login'
        });
        return;
      }

      // Attach user info to request
      req.user = payload;
      req.userId = payload.userId;
      req.userProfile = user; // Cache full user profile để tránh duplicate queries

      next();
    } catch (error) {
      if (isOptional) return next();
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        redirectTo: '/login'
      });
    }
  };
};

export const authenticateToken = createAuthMiddleware(false);
export const optionalAuth = createAuthMiddleware(true);


export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
      redirectTo: '/login'
    });
    return;
  }
  next();
};

export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        redirectTo: '/login'
      });
      return;
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};