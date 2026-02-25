import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWTPayload } from '../types/auth_types';

// Helper function to get required environment variables
const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }
  return value;
};

// Lazy getters for secrets - only access when needed
const getJWTSecret = () => getRequiredEnvVar('JWT_SECRET');
const getJWTRefreshSecret = () => getRequiredEnvVar('JWT_REFRESH_SECRET');
const getJWTExpiresIn = () => process.env.JWT_EXPIRES_IN || '15m';
const getJWTRefreshExpiresIn = () => process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export class JWTUtils {
  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, getJWTSecret(), {
      expiresIn: getJWTExpiresIn(),
    } as jwt.SignOptions);
  }

  static generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    // Include jti (JWT ID) to ensure uniqueness even when generated at the same second
    return jwt.sign({ ...payload, jti: crypto.randomUUID() }, getJWTRefreshSecret(), {
      expiresIn: getJWTRefreshExpiresIn(),
    } as jwt.SignOptions);
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, getJWTSecret()) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, getJWTRefreshSecret()) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  static getTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static getExpirationTime(token: string): number | null {
    try {
      const decoded = jwt.decode(token) as any;
      return decoded?.exp || null;
    } catch {
      return null;
    }
  }
}