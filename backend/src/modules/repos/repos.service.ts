import { query } from '../../config/db';
import { decryptAES } from '../../services/crypto';
import { GitHubApiClient } from '../../services/github-api';
import { rpush } from '../../config/redis';
import { getPineconeIndex } from '../../config/pinecone';
import { ValidationError, ConflictError, NotFoundError } from '../../errors';

export interface Repository {
  id: string;
  user_id: string;
  github_repo_id: number;
  owner: string;
  name: string;
  full_name: string;
  display_name: string | null;
  description: string | null;
  default_branch: string;
  is_private: boolean;
  language: string | null;
  stars_count: number;
  indexing_status: string;
  last_indexed_at: Date | null;
  total_commits_count: number | null;
  total_branches_count: number | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Parse a GitHub repository URL into owner and repository name.
 * Supports: https://github.com/owner/repo and https://github.com/owner/repo.git
 */
export function parseGithubUrl(url: string): { owner: string; repo: string } {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'github.com' && parsed.hostname !== 'www.github.com') {
      throw new Error();
    }
    
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length < 2) {
      throw new Error();
    }
    
    const owner = parts[0];
    let repo = parts[1];
    
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    
    return { owner, repo };
  } catch {
    throw new ValidationError('Invalid GitHub URL format. Use https://github.com/owner/repo');
  }
}

/**
 * Add a new repository to Git Analyser.
 * Verifies access via GitHub API, checks uniqueness, saves repo/job, and queues for indexing.
 */
export async function addRepository(userId: string, githubUrl: string, displayName?: string): Promise<Repository> {
  const { owner, repo } = parseGithubUrl(githubUrl);

  // 1. Get user GitHub access token
  const userResult = await query('SELECT github_access_token FROM users WHERE id = $1', [userId]);
  if (userResult.rows.length === 0) {
    throw new NotFoundError('User not found');
  }
  
  const rawToken = userResult.rows[0].github_access_token as string | null;
  const token = rawToken ? decryptAES(rawToken) : undefined;

  // 2. Verify repository exists and is accessible
  const client = new GitHubApiClient(token);
  const githubRepo = await client.getRepo(owner, repo);

  // 3. Check for unique repository active constraint
  const existingRepoResult = await query(`
    SELECT id FROM repositories 
    WHERE user_id = $1 AND github_repo_id = $2 AND deleted_at IS NULL
  `, [userId, githubRepo.id]);
  
  if (existingRepoResult.rows.length > 0) {
    throw new ConflictError('REPO_ALREADY_EXISTS');
  }

  // 4. Save repository metadata
  const insertRepoResult = await query<Repository>(`
    INSERT INTO repositories (
      user_id, github_repo_id, owner, name, full_name, display_name,
      description, default_branch, is_private, language, stars_count, indexing_status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
    RETURNING *
  `, [
    userId,
    githubRepo.id,
    owner,
    githubRepo.name,
    githubRepo.full_name,
    displayName || githubRepo.name,
    githubRepo.description,
    githubRepo.default_branch,
    githubRepo.private,
    githubRepo.language,
    githubRepo.stargazers_count,
  ]);

  const repository = insertRepoResult.rows[0];

  // 5. Create queued indexing job
  await query(`
    INSERT INTO indexing_jobs (repository_id, triggered_by, status, progress)
    VALUES ($1, $2, 'queued', 0)
  `, [repository.id, userId]);

  // 6. Push repository ID to Redis list 'index:queue'
  await rpush('index:queue', repository.id);

  return repository;
}

/**
 * Get all repositories for a user.
 */
export async function getUserRepositories(userId: string): Promise<Repository[]> {
  const result = await query<Repository>(`
    SELECT * FROM repositories 
    WHERE user_id = $1 AND deleted_at IS NULL 
    ORDER BY created_at DESC
  `, [userId]);
  return result.rows;
}

/**
 * Get repository details by ID and verify user ownership.
 */
export async function getRepositoryById(repoId: string, userId: string): Promise<Repository> {
  const result = await query<Repository>(`
    SELECT * FROM repositories 
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
  `, [repoId, userId]);

  if (result.rows.length === 0) {
    throw new NotFoundError('Repository not found');
  }
  return result.rows[0];
}

/**
 * Soft delete a repository and remove all vectors from Pinecone.
 */
export async function softDeleteRepository(repoId: string, userId: string): Promise<void> {
  // Verify ownership first
  await getRepositoryById(repoId, userId);

  // Soft delete from DB
  await query(`
    UPDATE repositories 
    SET deleted_at = NOW(), indexing_status = 'paused' 
    WHERE id = $1 AND user_id = $2
  `, [repoId, userId]);

  // Remove vectors in Pinecone asynchronously (non-blocking failure path)
  try {
    await getPineconeIndex().namespace(repoId).deleteAll();
  } catch (err) {
    console.error(`⚠️ Pinecone vectors cleanup failed for repository namespace ${repoId}:`, err);
  }
}

/**
 * Trigger re-indexing for a repository.
 */
export async function triggerReindex(repoId: string, userId: string): Promise<void> {
  // Verify ownership
  await getRepositoryById(repoId, userId);

  // Ensure no active jobs are already queued or running
  const activeJobResult = await query(`
    SELECT id FROM indexing_jobs 
    WHERE repository_id = $1 AND status IN ('queued', 'running')
  `, [repoId]);

  if (activeJobResult.rows.length > 0) {
    throw new ConflictError('REPO_INDEXING_IN_PROGRESS');
  }

  // Update repository status
  await query(`
    UPDATE repositories 
    SET indexing_status = 'pending', updated_at = NOW() 
    WHERE id = $1 AND user_id = $2
  `, [repoId, userId]);

  // Create new queued job
  await query(`
    INSERT INTO indexing_jobs (repository_id, triggered_by, status, progress)
    VALUES ($1, $2, 'queued', 0)
  `, [repoId, userId]);

  // Push to Redis indexing queue
  await rpush('index:queue', repoId);
}
