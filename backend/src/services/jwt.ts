import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthError } from '../errors';

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
}

/**
 * Sign an access token using JWT_ACCESS_SECRET (expires in 15 minutes, algorithm HS256).
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required');
  }
  return jwt.sign(payload, secret, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

/**
 * Generate a random 64-byte hex string to serve as an opaque refresh token.
 */
export function signRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Verify a JWT access token and return the payload.
 * Throws AuthError('TOKEN_EXPIRED') or AuthError('TOKEN_INVALID') on failure.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET environment variable is required');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
    
    // Ensure all required fields exist
    if (!decoded.userId || !decoded.email || !decoded.role || !decoded.sessionId) {
      throw new AuthError('TOKEN_INVALID', 'Access token payload is incomplete');
    }
    
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sessionId,
    };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new AuthError('TOKEN_EXPIRED', 'Token expired');
    }
    throw new AuthError('TOKEN_INVALID', 'Token invalid');
  }
}
