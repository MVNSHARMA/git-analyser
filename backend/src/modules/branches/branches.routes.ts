import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  listBranches,
  getBranch,
  compareBranchesHandler,
} from './branches.controller';

export const branchesRouter = Router();

// Protect all branch routes
branchesRouter.use(authenticate);
branchesRouter.use(rateLimiter);

// Register routes (compare must be defined before parameterized route to avoid parameter conflict)
branchesRouter.get('/repos/:repoId/branches/compare', compareBranchesHandler);
branchesRouter.get('/repos/:repoId/branches', listBranches);
branchesRouter.get('/repos/:repoId/branches/:branchName', getBranch);
