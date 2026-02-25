import { User } from '@prisma/client';
import prisma from '../db/prisma';
import { PasswordUtils } from '../utils/password';
import { JWTUtils } from '../utils/jwt';
import { ValidationUtils } from '../utils/validation';
import {
  BadRequestException,
  UnauthorizedException,
  ConflictException
} from '../exceptions/http_exception';
import { RegisterRequest, LoginRequest, AuthResponse } from '../types/auth_types';

export class AuthService {
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password, displayName, timezone = 'UTC' } = data;

    // Validate input
    if (!ValidationUtils.validateEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    const passwordValidation = ValidationUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(`Invalid password: ${passwordValidation.errors.join(', ')}`);
    }

    if (timezone && !ValidationUtils.validateTimezone(timezone)) {
      throw new BadRequestException('Invalid timezone');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordUtils.hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        displayName: displayName ? ValidationUtils.sanitizeInput(displayName) : null,
        timezone,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        timezone: true,
      }
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JWTUtils.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtils.generateRefreshToken(tokenPayload);

    // Store refresh token
    const expirationTime = JWTUtils.getExpirationTime(refreshToken);
    if (expirationTime) {
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(expirationTime * 1000),
        }
      });
    }

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  static async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password, rememberMe = false } = data;

    if (!ValidationUtils.validateEmail(email)) {
      throw new BadRequestException('Invalid email format');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await PasswordUtils.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JWTUtils.generateAccessToken(tokenPayload);
    const refreshToken = JWTUtils.generateRefreshToken(tokenPayload);

    // Store refresh token
    const expirationTime = JWTUtils.getExpirationTime(refreshToken);
    if (expirationTime) {
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(expirationTime * 1000),
        }
      });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        timezone: user.timezone,
      },
      accessToken,
      refreshToken,
    };
  }

  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken }
    });
  }

  static async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = JWTUtils.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired or not found');
    }

    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };

    const newAccessToken = JWTUtils.generateAccessToken(tokenPayload);
    const newRefreshToken = JWTUtils.generateRefreshToken(tokenPayload);

    const expirationTime = JWTUtils.getExpirationTime(newRefreshToken);

    // Use delete + create instead of update to avoid P2025 race condition
    // when concurrent requests try to rotate the same token
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: payload.userId,
          expiresAt: new Date(expirationTime! * 1000),
        }
      });
    } catch (error) {
      console.error('Token rotation failed:', error);
      throw new UnauthorizedException('Token rotation failed, please login again');
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async getUserById(userId: string) {
    // Validate input
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        emailVerified: true,
        timezone: true,
        avatarPublicId: true,
        profilePicture: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }
}