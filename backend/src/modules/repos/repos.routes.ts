import { Router, Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { addRepo, listRepos, getRepo, deleteRepo, reindexRepo } from './repos.controller';
import { authenticate } from '../../middleware/authenticate';
import { ValidationError } from '../../errors';

export const reposRouter = Router();

/**
 * Express middleware to validate request body using Zod.
 */
function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Validation failed', err.errors));
      } else {
        next(err);
      }
    }
  };
}

// Zod schema for adding a repository
const addRepoSchema = z.object({
  githubUrl: z
    .string()
    .url('Invalid URL format')
    .refine((val) => val.includes('github.com'), {
      message: "GitHub URL must contain 'github.com'",
    }),
  displayName: z.string().optional(),
});

// Protect all repository endpoints
reposRouter.use(authenticate);

// Mapped endpoints
reposRouter.post('/', validateBody(addRepoSchema), addRepo);
reposRouter.get('/', listRepos);
reposRouter.get('/:repoId', getRepo);
reposRouter.delete('/:repoId', deleteRepo);
reposRouter.post('/:repoId/reindex', reindexRepo);
