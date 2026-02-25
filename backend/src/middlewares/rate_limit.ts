import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import type { Request, Response, NextFunction } from 'express';
import redisClient from '../db/redis_client';

/**
 * Tạo limiter với Redis store + fallback in-memory nếu Redis down
 */
function createLimiter(keyPrefix: string, points: number, duration: number) {
  const opts = { keyPrefix, points, duration };
  return new RateLimiterRedis({
    storeClient: redisClient.getClient(),
    // IFF Redis down -> fallback in-memory (không reject requests)
    insuranceLimiter: new RateLimiterMemory(opts),
    ...opts,
  });
}

/**
 * Tạo Express middleware từ một limiter
 * @param limiter   limiter đã tạo
 * @param keyFn     hàm lấy key (mặc định: IP)
 */
function makeMiddleware(
  limiter: RateLimiterRedis,
  keyFn?: (req: Request) => string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyFn ? keyFn(req) : (req.ip ?? 'unknown');
    try {
      await limiter.consume(key);
      next();
    } catch {
      res.status(429).json({
        success: false,
        message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
      });
    }
  };
}

// Limiters

/** Global: 300 req / 5 phút / IP */
export const globalLimiter = makeMiddleware(
  createLimiter('rl_global', 300, 300),
);

/** Login: 5 lần / phút / IP */
export const loginLimiter = makeMiddleware(
  createLimiter('rl_login', 5, 60),
);

/** Register: 3 lần / phút / IP */
export const registerLimiter = makeMiddleware(
  createLimiter('rl_register', 3, 60),
);

/** Refresh token: 20 lần / phút / IP */
export const refreshTokenLimiter = makeMiddleware(
  createLimiter('rl_refresh', 20, 60),
);

/** Google OAuth: 10 lần / phút / IP */
export const googleAuthLimiter = makeMiddleware(
  createLimiter('rl_google', 10, 60),
);

/** Tạo comment: 6 lần / phút — dùng userId nếu đã login, fallback IP */
export const createCommentLimiter = makeMiddleware(
  createLimiter('rl_comment_create', 6, 60),
  (req) => req.userId ?? req.ip ?? 'unknown',
);

/** Sửa/Xóa comment: 20 lần / phút / userId hoặc IP */
export const mutateCommentLimiter = makeMiddleware(
  createLimiter('rl_comment_mutate', 20, 60),
  (req) => req.userId ?? req.ip ?? 'unknown',
);

/** Quick search: 60 lần / phút / IP */
export const quickSearchLimiter = makeMiddleware(
  createLimiter('rl_search_quick', 60, 60),
);

/** Advanced search: 30 lần / phút / IP */
export const advancedSearchLimiter = makeMiddleware(
  createLimiter('rl_search_adv', 30, 60),
);

/** Author/group search: 60 lần / phút / IP */
export const autocompleteSearchLimiter = makeMiddleware(
  createLimiter('rl_search_auto', 60, 60),
);

/** Admin routes: 120 lần / 5 phút / userId */
export const adminLimiter = makeMiddleware(
  createLimiter('rl_admin', 120, 300),
  (req) => req.userId ?? req.ip ?? 'unknown',
);