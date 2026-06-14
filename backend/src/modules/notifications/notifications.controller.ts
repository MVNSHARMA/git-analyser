import { Request, Response, NextFunction } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './notifications.service';
import { AuthError, ValidationError } from '../../errors';

function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const unread = req.query.unread === 'true';

    const notifications = await getNotifications(userId, unread);
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
}

export async function markReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { notificationId } = req.params;
    if (!notificationId) {
      throw new ValidationError('notificationId parameter is required');
    }

    await markAsRead(notificationId, userId);
    res.status(200).json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllReadHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);

    await markAllAsRead(userId);
    res.status(200).json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);

    const count = await getUnreadCount(userId);
    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
}
