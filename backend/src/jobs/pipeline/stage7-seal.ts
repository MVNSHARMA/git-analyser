import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

export async function runStage7(
  repoId: string,
  jobId: string,
  _client: GitHubApiClient,
  _owner: string,
  _repo: string
): Promise<void> {
  const stage = 'complete';
  const progress = 100;

  // 1. Fetch total commit and branch counts, and the owner user ID
  const statsRes = await query<{ total_commits: string; total_branches: string; user_id: string }>(`
    SELECT 
      (SELECT COUNT(*) FROM commits WHERE repository_id = $1) AS total_commits,
      (SELECT COUNT(*) FROM branches WHERE repository_id = $1) AS total_branches,
      user_id
    FROM repositories
    WHERE id = $1
  `, [repoId]);

  if (statsRes.rows.length === 0) {
    throw new Error('Repository not found in database');
  }

  const { total_commits, total_branches, user_id: userId } = statsRes.rows[0];
  const commitsCount = parseInt(total_commits, 10);
  const branchesCount = parseInt(total_branches, 10);

  // 2. Update repository status
  await query(`
    UPDATE repositories
    SET indexing_status = 'ready', 
        last_indexed_at = NOW(), 
        total_commits_count = $1, 
        total_branches_count = $2, 
        updated_at = NOW()
    WHERE id = $3
  `, [commitsCount, branchesCount, repoId]);

  // 3. Update indexing job status
  await query(`
    UPDATE indexing_jobs
    SET status = 'completed', 
        stage = $1, 
        progress = $2, 
        completed_at = NOW() 
    WHERE id = $3
  `, [stage, progress, jobId]);

  // 4. Create user notification
  await query(`
    INSERT INTO notifications (user_id, type, title, body, repo_id)
    VALUES ($1, 'indexing_complete', 'Repository indexed', 'Your repository is ready to chat', $2)
  `, [userId, repoId]);

  // 5. Publish websocket completion event
  await publishEvent(repoId, {
    type: 'complete',
    repoId,
  });
}
