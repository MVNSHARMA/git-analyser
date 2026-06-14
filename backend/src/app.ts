import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { authRouter } from './modules/auth/auth.routes';
import { reposRouter } from './modules/repos/repos.routes';
import { chatRouter } from './modules/chat/chat.routes';
import { contributorsRouter } from './modules/contributors/contributors.routes';
import { commitsRouter } from './modules/commits/commits.routes';
import { branchesRouter } from './modules/branches/branches.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { usersRouter } from './modules/users/users.routes';
import { indexingRouter } from './modules/indexing/indexing.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  // ─── Security & transport middleware ────────────────────────────────────────
  app.use(helmet());

  app.use(
    cors({
      origin: process.env.APP_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Request logging ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // ─── Health check (no auth required) ─────────────────────────────────────────
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── API routes ───────────────────────────────────────────────────────────────
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/repos', reposRouter);
  app.use('/api/v1', chatRouter);
  app.use('/api/v1', contributorsRouter);
  app.use('/api/v1', commitsRouter);
  app.use('/api/v1', branchesRouter);
  app.use('/api/v1', notificationsRouter);
  app.use('/api/v1', usersRouter);
  app.use('/api/v1', indexingRouter);

  // 404 catch-all
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });

  // Centralised error handler
  app.use(errorHandler);

  return app;
}
