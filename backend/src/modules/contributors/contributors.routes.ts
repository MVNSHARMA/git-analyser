import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  listContributors,
  getContributor,
  getContributorCommitsHandler,
  getContributorStatsHandler,
} from './contributors.controller';

export const contributorsRouter = Router();

// Apply auth and rate limiting to all contributor endpoints
contributorsRouter.use(authenticate);
contributorsRouter.use(rateLimiter);

// Register routes (register stats before parameterized ID to avoid parameter matching issues)
contributorsRouter.get('/repos/:repoId/contributors/stats', getContributorStatsHandler);
contributorsRouter.get('/repos/:repoId/contributors', listContributors);
contributorsRouter.get('/repos/:repoId/contributors/:contributorId', getContributor);
contributorsRouter.get('/repos/:repoId/contributors/:contributorId/commits', getContributorCommitsHandler);
