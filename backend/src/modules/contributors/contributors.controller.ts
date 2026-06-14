import { Request, Response, NextFunction } from 'express';
import {
  getContributors,
  getContributorById,
  getContributorCommits,
  getContributorStats,
} from './contributors.service';
import { AuthError, ValidationError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function listContributors(
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

    const list = await getContributors(repoId, userId);
    res.status(200).json(list);
  } catch (err) {
    next(err);
  }
}

export async function getContributor(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId, contributorId } = req.params;
    if (!repoId || !contributorId) {
      throw new ValidationError('repoId and contributorId parameters are required');
    }

    const contributor = await getContributorById(contributorId, repoId, userId);
    res.status(200).json(contributor);
  } catch (err) {
    next(err);
  }
}

export async function getContributorCommitsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId, contributorId } = req.params;
    if (!repoId || !contributorId) {
      throw new ValidationError('repoId and contributorId parameters are required');
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(limit) || isNaN(offset)) {
      throw new ValidationError('limit and offset query parameters must be valid integers');
    }

    const commits = await getContributorCommits(contributorId, repoId, userId, limit, offset);
    res.status(200).json(commits);
  } catch (err) {
    next(err);
  }
}

export async function getContributorStatsHandler(
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

    const stats = await getContributorStats(repoId, userId);
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}
