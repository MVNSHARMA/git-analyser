import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  getProfile,
  updateProfile,
  deleteAccountHandler,
} from './users.controller';

export const usersRouter = Router();

// Protect all user profile routes
usersRouter.use(authenticate);
usersRouter.use(rateLimiter);

// Register routes
usersRouter.get('/users/me', getProfile);
usersRouter.patch('/users/me', updateProfile);
usersRouter.delete('/users/me', deleteAccountHandler);
