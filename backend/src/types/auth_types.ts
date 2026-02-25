export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
  timezone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: string;
    timezone: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  googleId?: string;
  iat?: number;
  exp?: number;
}

// User creation types
export interface UserInsert {
  email: string;
  password?: string | null;
  username?: string;
  googleId?: string;
}

// User with profile (for responses)
export interface UserWithProfile {
  id: string;
  email: string;
  username?: string | null;
  displayName?: string | null;
  role: string;
  timezone: string;
  googleId?: string | null;
  profile?: {
    id: string;
    firstName?: string | null;
    first_name?: string | null;
    lastName?: string | null;
    last_name?: string | null;
    fullName?: string | null;
    full_name?: string | null;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
    }
  }
}