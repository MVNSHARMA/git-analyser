import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  registerWithEmail,
  verifyEmail,
  loginWithEmail,
  createSession,
  refreshSession,
  revokeSession,
  handleGithubOAuth,
  requestPasswordReset,
  resetPassword,
} from './auth.service';
import { get, set, del } from '../../config/redis';
import { AuthError } from '../../errors';

const COOKIE_NAME = 'refresh_token';

const cookieOptions = {
  httpOnly: true as const,
  secure: true,
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/',
};

const clearCookieOptions = {
  httpOnly: true as const,
  secure: true,
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'strict') as 'none' | 'strict',
  path: '/',
};

/**
 * Handle user registration.
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, displayName } = req.body;
    await registerWithEmail({ email, password, displayName });
    
    res.status(201).json({
      message: 'Check your email to verify your account',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle email verification.
 */
export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.query.token as string;
    if (!token) {
      throw new AuthError('TOKEN_INVALID', 'Verification token is required');
    }
    
    await verifyEmail(token);
    
    res.status(200).json({
      message: 'Email verified',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handle user login. Sets the HttpOnly refresh token cookie and returns the access token.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const { accessToken, refreshToken, user } = await loginWithEmail({ email, password });
    
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    res.status(200).json({
      accessToken,
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Redirects the user to GitHub OAuth login page.
 * Generates an OAuth state token, stores it in Redis for 5 minutes, and redirects.
 */
export async function githubLogin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const stateKey = `oauth:state:${state}`;
    
    // Store in Redis for 5 minutes
    await set(stateKey, '1', 300);
    
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      callbackUrl || ''
    )}&scope=user:email&state=${state}`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * Handle GitHub OAuth callback.
 * Verifies the state parameter, exchanges the code, upserts the user, sets the cookie, and redirects to front-end dashboard.
 */
export async function githubCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state } = req.query;
    
    if (!state || typeof state !== 'string') {
      throw new AuthError('STATE_INVALID', 'Invalid OAuth state');
    }
    
    // Verify state token exists in Redis
    const stateKey = `oauth:state:${state}`;
    const exists = await get(stateKey);
    
    if (!exists) {
      throw new AuthError('STATE_INVALID', 'Invalid or expired OAuth state');
    }
    
    // Clear state token from Redis
    await del(stateKey);

    if (!code || typeof code !== 'string') {
      throw new AuthError('TOKEN_INVALID', 'OAuth authorization code is required');
    }

    const { refreshToken } = await handleGithubOAuth(code);
    
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    res.redirect(`${appUrl}/dashboard`);
  } catch (err) {
    next(err);
  }
}

/**
 * Refresh user session using the HttpOnly refresh token cookie.
 * Rotates the refresh token and returns a new access token.
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const oldRefreshToken = req.cookies[COOKIE_NAME];
    if (!oldRefreshToken) {
      throw new AuthError('TOKEN_INVALID', 'No refresh token provided');
    }
    
    const { accessToken, refreshToken: newRefreshToken } = await refreshSession(oldRefreshToken);
    
    res.cookie(COOKIE_NAME, newRefreshToken, cookieOptions);
    res.status(200).json({
      accessToken,
    });
  } catch (err) {
    // Clear cookie if token is invalid to avoid infinite loops on client
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    next(err);
  }
}

/**
 * Log out a user by revoking the refresh token and clearing the cookie.
 */
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.cookies[COOKIE_NAME];
    if (refreshToken) {
      await revokeSession(refreshToken);
    }
    
    res.clearCookie(COOKIE_NAME, clearCookieOptions);
    
    res.status(200).json({
      message: 'Logged out',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Initiate password recovery process.
 * Always returns 200 to prevent user/email enumeration.
 */
export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    if (email) {
      await requestPasswordReset(email);
    }
    
    res.status(200).json({
      message: 'If the email exists, a password reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset user password with token and automatically logs them in (issues session).
 */
export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AuthError('TOKEN_INVALID', 'Token and new password are required');
    }
    
    const user = await resetPassword(token, newPassword);
    
    // Auto-login: Issue new session
    const { accessToken, refreshToken } = await createSession(user.id);
    
    res.cookie(COOKIE_NAME, refreshToken, cookieOptions);
    res.status(200).json({
      accessToken,
      user,
    });
  } catch (err) {
    next(err);
  }
}
