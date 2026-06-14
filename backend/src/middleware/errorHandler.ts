import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors';

/**
 * Centralised error handler middleware.
 * Maps application errors to HTTP response codes and clean JSON payloads.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  // Check if it is a custom application error
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    if (err instanceof ValidationError) {
      details = err.details;
    }
  } else {
    // For non-AppError exceptions, log details for debug
    if (process.env.NODE_ENV !== 'test') {
      console.error('💥 Non-AppError caught:', err);
    }
  }

  // Log 500 errors
  if (statusCode === 500 && process.env.NODE_ENV !== 'test') {
    console.error('💥 Internal Server Error (500):', err);
  }

  const payload: any = {
    error: message,
    code,
  };

  if (details !== undefined) {
    payload.details = details;
  }

  // Include stack trace only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack || String(err);
  }

  res.status(statusCode).json(payload);
}
