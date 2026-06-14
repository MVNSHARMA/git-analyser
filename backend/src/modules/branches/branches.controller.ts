import { Request, Response, NextFunction } from 'express';
import {
  getBranches,
  getBranchByName,
  compareBranches,
} from './branches.service';
import { AuthError, ValidationError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function listBranches(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;
    if (!repoId) {
      throw new ValidationError('repoId parameter is required');
    }

    const branches = await getBranches(repoId, userId);
    res.status(200).json(branches);
  } catch (err) {
    next(err);
  }
}

export async function getBranch(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId, branchName } = req.params;
    if (!repoId || !branchName) {
      throw new ValidationError('repoId and branchName parameters are required');
    }

    const branch = await getBranchByName(branchName, repoId, userId);
    res.status(200).json(branch);
  } catch (err) {
    next(err);
  }
}

export async function compareBranchesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;
    if (!repoId) {
      throw new ValidationError('repoId parameter is required');
    }

    const { base, head } = req.query;
    if (!base || !head) {
      throw new ValidationError('base and head query parameters are required for branch comparison');
    }

    const comparison = await compareBranches(
      repoId,
      userId,
      base as string,
      head as string
    );
    res.status(200).json(comparison);
  } catch (err) {
    next(err);
  }
}
