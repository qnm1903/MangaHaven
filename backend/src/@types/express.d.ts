import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        googleId?: string;
      };
      userId?: string;
      userProfile?: Partial<User>; // Cache full user profile
    }
  }
}

export {};
