export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string = 'Unauthorised') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', code: string = 'CONFLICT') {
    super(message, 409, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation Error', public details?: unknown, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too Many Requests', code: string = 'TOO_MANY_REQUESTS') {
    super(message, 429, code);
  }
}
