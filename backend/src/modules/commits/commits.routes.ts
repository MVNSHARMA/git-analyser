import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  listCommits,
  getCommit,
  getActivity,
} from './commits.controller';

export const commitsRouter = Router();

// Protect all commit routes
commitsRouter.use(authenticate);
commitsRouter.use(rateLimiter);

// Register routes (register activity before SHA param to avoid conflict)
commitsRouter.get('/repos/:repoId/commits/activity', getActivity);
commitsRouter.get('/repos/:repoId/commits', listCommits);
commitsRouter.get('/repos/:repoId/commits/:sha', getCommit);
