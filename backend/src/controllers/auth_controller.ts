import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth_service';
import { GoogleOAuthService } from '../services/google_oauth_service';
import { RegisterRequest, LoginRequest } from '../types/auth_types';
import { BadRequestException, UnauthorizedException } from '../exceptions/http_exception';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, displayName, timezone }: RegisterRequest = req.body;

      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      const result = await AuthService.register({
        email,
        password,
        displayName,
        timezone
      });

      // Set HTTP-only cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe }: LoginRequest = req.body;

      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      const result = await AuthService.login({ email, password, rememberMe });

      // Set HTTP-only cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      };

      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        await AuthService.logout(refreshToken);
      }

      // Clear cookies
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');

      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token required');
      }

      const result = await AuthService.refreshToken(refreshToken);

      // Set new cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
      };

      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: result.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Google OAuth endpoints
  static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { credential, clientId } = req.body;

      if (!credential) {
        throw new BadRequestException('Google credential is required');
      }

      const result = await GoogleOAuthService.authenticateWithIdToken(credential);

      // Set HTTP-only cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      res.json({
        success: true,
        message: 'Google login successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async googleAuthWithAccessToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        throw new BadRequestException('Google access token is required');
      }

      const result = await GoogleOAuthService.authenticateWithGoogle(accessToken);

      // Set HTTP-only cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('accessToken', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, cookieOptions);

      res.json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: result.user,
          accessToken: result.accessToken,
        }
      });
    } catch (error) {
      next(error);
    }
  }
}