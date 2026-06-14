import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import {
  register,
  verifyEmailHandler,
  login,
  githubLogin,
  githubCallback,
  refresh,
  logout,
  forgotPassword,
  resetPasswordHandler,
} from './auth.controller';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiterAuth } from '../../middleware/rateLimiter';
import { ValidationError } from '../../errors';

export const authRouter = Router();

function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed', err.errors));
      } else {
        next(err);
      }
    }
  };
}

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  displayName: z.string().min(1, 'Display name is required'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

// Routes
authRouter.post('/register', rateLimiterAuth, validateBody(registerSchema), register);
authRouter.get('/verify-email', verifyEmailHandler);
authRouter.post('/login', rateLimiterAuth, validateBody(loginSchema), login);
authRouter.get('/github', githubLogin);
authRouter.get('/github/callback', githubCallback);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/forgot-password', rateLimiterAuth, validateBody(forgotPasswordSchema), forgotPassword);
authRouter.post('/reset-password', validateBody(resetPasswordSchema), resetPasswordHandler);
