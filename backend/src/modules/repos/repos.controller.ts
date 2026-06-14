import { Request, Response, NextFunction } from 'express';
import {
  addRepository,
  getUserRepositories,
  getRepositoryById,
  softDeleteRepository,
  triggerReindex,
} from './repos.service';
import { AuthError } from '../../errors';

/**
 * Helper to retrieve authenticated user's ID.
 */
function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AuthError('AUTH_TOKEN_INVALID', 'Unauthorised user context');
  }
  return userId;
}

/**
 * POST /api/v1/repos
 * Register a new repository.
 */
export async function addRepo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { githubUrl, displayName } = req.body;
    
    const repo = await addRepository(userId, githubUrl, displayName);
    
    res.status(201).json(repo);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/repos
 * Retrieve all registered repositories for the authenticated user.
 */
export async function listRepos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const repos = await getUserRepositories(userId);
    
    res.status(200).json(repos);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/repos/:repoId
 * Fetch repository details.
 */
export async function getRepo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;
    
    const repo = await getRepositoryById(repoId, userId);
    
    res.status(200).json(repo);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/repos/:repoId
 * Soft delete repository and purge vector database namespace.
 */
export async function deleteRepo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;
    
    await softDeleteRepository(repoId, userId);
    
    res.status(200).json({
      message: 'Repository removed',
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/repos/:repoId/reindex
 * Queue repository for reindexing.
 */
export async function reindexRepo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const { repoId } = req.params;
    
    await triggerReindex(repoId, userId);
    
    res.status(202).json({
      message: 'Reindex started',
    });
  } catch (err) {
    next(err);
  }
}
