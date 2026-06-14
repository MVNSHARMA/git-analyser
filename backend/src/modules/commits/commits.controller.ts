import { Request, Response, NextFunction } from 'express';
import {
  getCommits,
  getCommitBySha,
  getRecentActivity,
} from './commits.service';
import { AuthError, ValidationError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function listCommits(
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

    const branch = req.query.branch ? (req.query.branch as string) : undefined;
    const author = req.query.author ? (req.query.author as string) : undefined;
    const search = req.query.search ? (req.query.search as string) : undefined;
    const from = req.query.from ? (req.query.from as string) : undefined;
    const to = req.query.to ? (req.query.to as string) : undefined;

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(limit) || isNaN(offset)) {
      throw new ValidationError('limit and offset query parameters must be valid integers');
    }

    const result = await getCommits(repoId, userId, {
      branch,
      author,
      search,
      from,
      to,
      limit,
      offset,
    });

    res.status(200).json({
      commits: result.commits,
      total: result.total,
      limit: Math.min(Math.max(1, limit), 100),
      offset: Math.max(0, offset),
    });
  } catch (err) {
    next(err);
  }
}

export async function getCommit(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId, sha } = req.params;
    if (!repoId || !sha) {
      throw new ValidationError('repoId and sha parameters are required');
    }

    const commitDetail = await getCommitBySha(sha, repoId, userId);
    res.status(200).json(commitDetail);
  } catch (err) {
    next(err);
  }
}

export async function getActivity(
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

    const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
    if (isNaN(days)) {
      throw new ValidationError('days query parameter must be a valid integer');
    }

    const activity = await getRecentActivity(repoId, userId, days);
    res.status(200).json(activity);
  } catch (err) {
    next(err);
  }
}
