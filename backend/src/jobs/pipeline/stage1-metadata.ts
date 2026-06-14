import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

export async function runStage1(
  repoId: string,
  jobId: string,
  client: GitHubApiClient,
  owner: string,
  repo: string
): Promise<void> {
  const stage = 'metadata';
  const progress = 10;

  // 1. Fetch metadata from GitHub
  const githubRepo = await client.getRepo(owner, repo);

  // 2. Update repository in database
  await query(`
    UPDATE repositories 
    SET description = $1, language = $2, stars_count = $3, default_branch = $4, is_private = $5, updated_at = NOW()
    WHERE id = $6
  `, [
    githubRepo.description,
    githubRepo.language,
    githubRepo.stargazers_count,
    githubRepo.default_branch,
    githubRepo.private,
    repoId,
  ]);

  // 3. Update indexing job in database
  await query(`
    UPDATE indexing_jobs 
    SET stage = $1, progress = $2 
    WHERE id = $3
  `, [stage, progress, jobId]);

  // 4. Publish websocket progress event
  await publishEvent(repoId, {
    type: 'progress',
    repoId,
    stage,
    progress,
    commitsIndexed: 0,
  });
}
