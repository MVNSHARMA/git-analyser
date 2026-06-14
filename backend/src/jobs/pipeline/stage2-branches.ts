import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

export async function runStage2(
  repoId: string,
  jobId: string,
  client: GitHubApiClient,
  owner: string,
  repo: string
): Promise<void> {
  const stage = 'branches';
  const progress = 20;

  // 1. Fetch default branch from repository record
  const repoRes = await query('SELECT default_branch FROM repositories WHERE id = $1', [repoId]);
  if (repoRes.rows.length === 0) {
    throw new Error('Repository not found in database');
  }
  const defaultBranchName = repoRes.rows[0].default_branch as string;

  // 2. Fetch branches list from GitHub
  const githubBranches = await client.getBranches(owner, repo);

  // 3. Upsert branches into database
  for (const branch of githubBranches) {
    const isDefault = branch.name === defaultBranchName;
    await query(`
      INSERT INTO branches (repository_id, name, head_sha, is_default, is_protected)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (repository_id, name) 
      DO UPDATE SET head_sha = EXCLUDED.head_sha, 
                    is_protected = EXCLUDED.is_protected, 
                    is_default = EXCLUDED.is_default, 
                    updated_at = NOW()
    `, [repoId, branch.name, branch.commit.sha, isDefault, branch.protected]);
  }

  // 4. Update indexing job status
  await query(`
    UPDATE indexing_jobs 
    SET stage = $1, progress = $2 
    WHERE id = $3
  `, [stage, progress, jobId]);

  // 5. Publish websocket progress event
  await publishEvent(repoId, {
    type: 'progress',
    repoId,
    stage,
    progress,
    commitsIndexed: 0,
  });
}
