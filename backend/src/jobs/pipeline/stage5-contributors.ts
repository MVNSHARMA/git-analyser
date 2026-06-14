import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

export async function runStage5(
  repoId: string,
  jobId: string,
  client: GitHubApiClient,
  _owner: string,
  _repo: string
): Promise<void> {
  const stage = 'contributors';
  const progress = 80;

  // 1. Fetch distinct author emails and names from commits
  const uniqueAuthorsRes = await query(`
    SELECT DISTINCT author_email, author_name 
    FROM commits 
    WHERE repository_id = $1 AND author_email IS NOT NULL
  `, [repoId]);
  
  const authors = uniqueAuthorsRes.rows as Array<{ author_email: string; author_name: string }>;

  for (const author of authors) {
    const email = author.author_email;
    const name = author.author_name;

    // Best-effort lookup GitHub profile info by email
    const gitUser = await client.searchUserByEmail(email);
    const githubUsername = gitUser ? gitUser.login : null;
    const avatarUrl = gitUser ? gitUser.avatar_url : null;

    // Upsert contributor row
    const contribResult = await query(`
      INSERT INTO contributors (repository_id, primary_email, display_name, github_username, avatar_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (repository_id, primary_email)
      DO UPDATE SET 
        github_username = COALESCE(EXCLUDED.github_username, contributors.github_username),
        avatar_url = COALESCE(EXCLUDED.avatar_url, contributors.avatar_url),
        updated_at = NOW()
      RETURNING id
    `, [repoId, email, name, githubUsername, avatarUrl]);
    
    const contributorId = contribResult.rows[0].id;

    // Link commits to this contributor
    await query(`
      UPDATE commits
      SET contributor_id = $1
      WHERE author_email = $2 AND repository_id = $3
    `, [contributorId, email, repoId]);

    // Calculate aggregated commit/diff stats for this contributor
    const statsResult = await query(`
      SELECT 
        COUNT(id) AS total_commits,
        COALESCE(SUM(additions), 0) AS total_insertions,
        COALESCE(SUM(deletions), 0) AS total_deletions,
        MIN(committed_at) AS first_commit_at,
        MAX(committed_at) AS last_commit_at
      FROM commits
      WHERE contributor_id = $1 AND repository_id = $2
    `, [contributorId, repoId]);

    const stats = statsResult.rows[0] as {
      total_commits: string;
      total_insertions: string;
      total_deletions: string;
      first_commit_at: Date | null;
      last_commit_at: Date | null;
    };

    // Update contributor with calculated statistics
    await query(`
      UPDATE contributors
      SET 
        total_commits = $1,
        total_insertions = $2,
        total_deletions = $3,
        first_commit_at = $4,
        last_commit_at = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [
      parseInt(stats.total_commits, 10),
      parseInt(stats.total_insertions, 10),
      parseInt(stats.total_deletions, 10),
      stats.first_commit_at,
      stats.last_commit_at,
      contributorId,
    ]);
  }

  // 2. Fetch total commits indexed count for progress event payload
  const countRes = await query<{ count: string }>('SELECT COUNT(*) FROM commits WHERE repository_id = $1', [repoId]);
  const commitsIndexed = parseInt(countRes.rows[0].count, 10);

  // 3. Update indexing job status
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
    commitsIndexed,
  });
}
