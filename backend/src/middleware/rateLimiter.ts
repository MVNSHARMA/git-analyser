import { Request, Response, NextFunction } from 'express';
import { incr, expire } from '../config/redis';
import { RateLimitError } from '../errors';

/**
 * General API Rate Limiter: max 120 requests per minute per logged-in user.
 * Key format: ratelimit:api:{userId}
 */
export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      // If the route is accessed anonymously, we can fall back to IP or bypass.
      // Since this is for general API access (typically authenticated), we require user context.
      return next();
    }

    const key = `ratelimit:api:${userId}`;
    const count = await incr(key);
    
    if (count === 1) {
      await expire(key, 60);
    }

    if (count > 120) {
      res.setHeader('Retry-After', '60');
      return next(new RateLimitError('Too many requests. Please try again in 1 minute.'));
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Strict Auth Rate Limiter: max 10 requests per minute per IP.
 * Used for login, registration, and password recovery.
 * Key format: ratelimit:auth:{ip}
 */
export async function rateLimiterAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    
    // Normalise IP (could be string or string[])
    const normalisedIp = Array.isArray(ip) ? ip[0] : ip;
    const key = `ratelimit:auth:${normalisedIp}`;
    
    const count = await incr(key);
    
    if (count === 1) {
      await expire(key, 60);
    }

    if (count > 10) {
      res.setHeader('Retry-After', '60');
      return next(new RateLimitError('Too many login or registration attempts. Please try again in 1 minute.'));
    }

    next();
  } catch (err) {
    next(err);
  }
}
