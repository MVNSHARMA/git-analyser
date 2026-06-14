import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { rateLimiter } from '../../middleware/rateLimiter';
import {
  listNotifications,
  markReadHandler,
  markAllReadHandler,
  getUnreadCountHandler,
} from './notifications.controller';

export const notificationsRouter = Router();

// Protect all notification routes
notificationsRouter.use(authenticate);
notificationsRouter.use(rateLimiter);

// Register routes (register unread-count and read-all before parameterized read to avoid parameter conflict)
notificationsRouter.get('/notifications/unread-count', getUnreadCountHandler);
notificationsRouter.get('/notifications', listNotifications);
notificationsRouter.patch('/notifications/read-all', markAllReadHandler);
notificationsRouter.patch('/notifications/:notificationId/read', markReadHandler);
