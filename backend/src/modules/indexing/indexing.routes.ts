import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  getStatus,
  getHistory,
} from './indexing.controller';

export const indexingRouter = Router();

// Protect all indexing routes
indexingRouter.use(authenticate);
indexingRouter.use(rateLimiter);

// Register routes
indexingRouter.get('/repos/:repoId/indexing/status', getStatus);
indexingRouter.get('/repos/:repoId/indexing/history', getHistory);
