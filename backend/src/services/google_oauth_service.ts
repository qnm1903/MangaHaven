import { OAuth2Client } from 'google-auth-library';
import prisma from '../db/prisma';
import { JWTUtils } from '../utils/jwt';
import { ValidationUtils } from '../utils/validation';
import { AuthResponse } from '../types/auth_types';
import {
  BadRequestException,
  UnauthorizedException
} from '../exceptions/http_exception';

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  email_verified: boolean;
}

export class GoogleOAuthService {
  private static getClient() {
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  static async verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    try {
      const client = this.getClient();
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return {
        sub: payload.sub,
        email: payload.email || '',
        name: payload.name,
        given_name: payload.given_name,
        family_name: payload.family_name,
        picture: payload.picture,
        email_verified: payload.email_verified || false,
      };
    } catch (error) {
      console.error('Google token verification error:', error);
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  static async authenticateWithGoogle(accessToken: string): Promise<AuthResponse> {
    try {
      console.log('Authenticating with Google access token:', accessToken.substring(0, 20) + '...');

      // Get user info from Google API using access token in Authorization header
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Google API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google API error:', response.status, errorText);
        throw new UnauthorizedException(`Invalid Google access token: ${response.status} ${errorText}`);
      }

      const googleUser = await response.json();

      if (!googleUser.email) {
        throw new BadRequestException('Email not provided by Google');
      }

      if (!ValidationUtils.validateEmail(googleUser.email)) {
        throw new BadRequestException('Invalid email format from Google');
      }

      console.log('Processing Google OAuth for email:', googleUser.email);

      // Check if user exists by email (same email = same user)
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          displayName: true,
          role: true,
          avatarPublicId: true,
          profilePicture: true,
          emailVerified: true,
          isActive: true,
          timezone: true,
          lastLoginAt: true,
          googleId: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        // Create new user for new email
        console.log('Creating new user for email:', googleUser.email);
        user = await prisma.user.create({
          data: {
            email: googleUser.email.toLowerCase(),
            displayName: googleUser.name || googleUser.given_name || 'Google User',
            profilePicture: googleUser.picture,
            emailVerified: googleUser.verified_email || true,
            isActive: true,
            role: 'USER',
            timezone: 'UTC',
            // No password hash for Google users
            passwordHash: null,
            googleId: googleUser.id || googleUser.sub,
          },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            displayName: true,
            role: true,
            avatarPublicId: true,
            profilePicture: true,
            emailVerified: true,
            isActive: true,
            timezone: true,
            lastLoginAt: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
          }
        });

        // Create OAuth provider record for new user
        await prisma.oAuthProvider.create({
          data: {
            provider: 'google',
            providerId: googleUser.id || googleUser.sub,
            userId: user.id,
          }
        });

        console.log('New user created with ID:', user.id);
      } else {
        // User exists - login to existing account
        console.log('Logging in existing user with ID:', user.id);

        // Update user info and last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            // Update Google ID if not set
            ...((!user.googleId && googleUser.sub) && { googleId: googleUser.sub }),
            // Update profile picture from Google only if user has NOT uploaded a custom avatar
            ...(!user.avatarPublicId && googleUser.picture && googleUser.picture !== user.profilePicture && {
              profilePicture: googleUser.picture
            }),
            // Update display name if not set or if Google provides a different one
            ...((googleUser.name && (!user.displayName || user.displayName === 'Google User')) && {
              displayName: googleUser.name
            })
          },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            displayName: true,
            role: true,
            avatarPublicId: true,
            profilePicture: true,
            emailVerified: true,
            isActive: true,
            timezone: true,
            lastLoginAt: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
          }
        });

        // Ensure OAuth provider record exists for existing user
        const existingProvider = await prisma.oAuthProvider.findFirst({
          where: {
            userId: user.id,
            provider: 'google'
          }
        });

        if (!existingProvider && googleUser.sub) {
          await prisma.oAuthProvider.create({
            data: {
              provider: 'google',
              providerId: googleUser.sub,
              userId: user.id,
            }
          });
        }
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const jwtAccessToken = JWTUtils.generateAccessToken(tokenPayload);
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
          profilePicture: user.profilePicture,
          avatarPublicId: user.avatarPublicId,
        },
        accessToken: jwtAccessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Google authentication error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      throw new UnauthorizedException('Google authentication failed');
    }
  }

  static async authenticateWithIdToken(idToken: string): Promise<AuthResponse> {
    try {
      const googleUser = await this.verifyGoogleToken(idToken);

      if (!googleUser.email_verified) {
        throw new BadRequestException('Google email not verified');
      }

      console.log('Processing Google ID token OAuth for email:', googleUser.email);

      // Check if user exists by email (same email = same user)
      let user = await prisma.user.findUnique({
        where: { email: googleUser.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          displayName: true,
          role: true,
          avatarPublicId: true,
          profilePicture: true,
          emailVerified: true,
          isActive: true,
          timezone: true,
          lastLoginAt: true,
          googleId: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        // Create new user for new email
        console.log('Creating new user for email:', googleUser.email);
        user = await prisma.user.create({
          data: {
            email: googleUser.email.toLowerCase(),
            displayName: googleUser.name || googleUser.given_name || 'Google User',
            profilePicture: googleUser.picture,
            emailVerified: googleUser.email_verified,
            isActive: true,
            role: 'USER',
            timezone: 'UTC',
            // No password hash for Google users
            passwordHash: null,
            googleId: googleUser.sub,
          },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            displayName: true,
            role: true,
            avatarPublicId: true,
            profilePicture: true,
            emailVerified: true,
            isActive: true,
            timezone: true,
            lastLoginAt: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
          }
        });

        // Create OAuth provider record for new user
        await prisma.oAuthProvider.create({
          data: {
            provider: 'google',
            providerId: googleUser.sub,
            userId: user.id,
          }
        });

        console.log('New user created with ID:', user.id);
      } else {
        // User exists - login to existing account
        console.log('Logging in existing user with ID:', user.id);

        // Update user info and last login
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            // Update Google ID if not set
            ...((!user.googleId && googleUser.sub) && { googleId: googleUser.sub }),
            // Update profile picture from Google only if user has NOT uploaded a custom avatar
            ...(!user.avatarPublicId && googleUser.picture && googleUser.picture !== user.profilePicture && {
              profilePicture: googleUser.picture
            }),
            // Update display name if not set or if Google provides a different one
            ...((googleUser.name && (!user.displayName || user.displayName === 'Google User')) && {
              displayName: googleUser.name
            })
          },
          select: {
            id: true,
            email: true,
            passwordHash: true,
            displayName: true,
            role: true,
            avatarPublicId: true,
            profilePicture: true,
            emailVerified: true,
            isActive: true,
            timezone: true,
            lastLoginAt: true,
            googleId: true,
            createdAt: true,
            updatedAt: true,
          }
        });

        // Ensure OAuth provider record exists for existing user
        const existingProvider = await prisma.oAuthProvider.findFirst({
          where: {
            userId: user.id,
            provider: 'google'
          }
        });

        if (!existingProvider) {
          await prisma.oAuthProvider.create({
            data: {
              provider: 'google',
              providerId: googleUser.sub,
              userId: user.id,
            }
          });
        }
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Account is deactivated');
      }

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
          profilePicture: user.profilePicture,
          avatarPublicId: user.avatarPublicId,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Google ID token authentication error:', error);
      throw new UnauthorizedException('Google authentication failed');
    }
  }
}
