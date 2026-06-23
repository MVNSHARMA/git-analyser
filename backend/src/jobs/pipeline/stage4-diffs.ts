import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateJobProgress(jobId: string, stage: string, percent: number): Promise<void> {
  await query('UPDATE indexing_jobs SET stage=$1, progress=$2 WHERE id=$3', [stage, percent, jobId]);
}

export async function runStage4(
  repoId: string,
  jobId: string,
  client: GitHubApiClient,
  owner: string,
  repo: string
): Promise<void> {
  const stage = 'diffs';
  const progress = 65;

  // 1. Fetch top 100 commits by committed_at DESC that do not have diffs stored yet
  const commitRes = await query(`
    SELECT id, sha FROM commits 
    WHERE repository_id = $1 AND diff_stored = false 
    ORDER BY committed_at DESC 
    LIMIT 100
  `, [repoId]);
  
  const commits = commitRes.rows as Array<{ id: string; sha: string }>;
  const totalCommits = commits.length;
  let processedCount = 0;

  for (const commit of commits) {
    // Fetch detailed view (stats + files list) from GitHub
    const detail = await client.getCommitDetail(owner, repo, commit.sha);

    const additions = detail.stats?.additions || 0;
    const deletions = detail.stats?.deletions || 0;
    const filesCount = detail.files?.length || 0;
    const filesJson = JSON.stringify(detail.files || []);

    // Perform database writes
    await query(`
      INSERT INTO commit_diffs (commit_id, diff_json)
      VALUES ($1, $2)
      ON CONFLICT (commit_id) DO UPDATE SET diff_json = EXCLUDED.diff_json
    `, [commit.id, filesJson]);

    await query(`
      UPDATE commits
      SET additions = $1, deletions = $2, files_changed_count = $3, diff_stored = true
      WHERE id = $4
    `, [additions, deletions, filesCount, commit.id]);

    processedCount++;
    if (processedCount % 10 === 0 && totalCommits > 0) {
      const progressPercent = 50 + Math.floor((processedCount / totalCommits) * 15);
      await updateJobProgress(jobId, 'diffs', progressPercent);
    }

    // Throttle if we are close to hitting the GitHub rate limit threshold
    if (client.lastRateLimitRemaining !== undefined && client.lastRateLimitRemaining < 200) {
      await sleep(150);
    }
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

  // 4. Publish progress event
  await publishEvent(repoId, {
    type: 'progress',
    repoId,
    stage,
    progress,
    commitsIndexed,
  });
}
