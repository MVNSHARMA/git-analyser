import { Request, Response, NextFunction } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  deleteAccount,
} from './users.service';
import { AuthError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const profile = await getUserProfile(userId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { displayName, avatarUrl } = req.body;

    const profile = await updateUserProfile(userId, { displayName, avatarUrl });
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    await deleteAccount(userId);
    res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
}
