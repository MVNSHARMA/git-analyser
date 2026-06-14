import { Request, Response, NextFunction } from 'express';
import {
  getIndexingStatus,
  getIndexingHistory,
} from './indexing.service';
import { AuthError, ValidationError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function getStatus(
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

    const status = await getIndexingStatus(repoId, userId);
    if (!status) {
      res.status(200).json({ status: 'never_indexed' });
      return;
    }

    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(
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

    const history = await getIndexingHistory(repoId, userId);
    res.status(200).json(history);
  } catch (err) {
    next(err);
  }
}
