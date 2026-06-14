import { query } from '../../config/db';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

export async function runStage3(
  repoId: string,
  jobId: string,
  client: GitHubApiClient,
  owner: string,
  repo: string
): Promise<void> {
  const stage = 'commits';

  // 1. Fetch all branches of this repo from the DB
  const branchRes = await query('SELECT id, name FROM branches WHERE repository_id = $1', [repoId]);
  const branches = branchRes.rows as Array<{ id: string; name: string }>;

  if (branches.length === 0) {
    // No branches to index
    await query(`
      UPDATE indexing_jobs SET stage = $1, progress = 50 WHERE id = $2
    `, [stage, jobId]);
    await publishEvent(repoId, { type: 'progress', repoId, stage, progress: 50, commitsIndexed: 0 });
    return;
  }

  const uniqueShas = new Set<string>();

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      // Fetch commits for this branch from GitHub
      const commits = await client.getCommits(owner, repo, branch.name, page, 100);
      
      if (commits.length === 0) {
        hasMore = false;
        break;
      }

      for (const ghCommit of commits) {
        const sha = ghCommit.sha;
        const shortSha = sha.substring(0, 7);
        const message = ghCommit.commit.message;
        const messageSubject = message.split('\n')[0].substring(0, 500);
        const authorName = ghCommit.commit.author.name;
        const authorEmail = ghCommit.commit.author.email;
        const committedAt = new Date(ghCommit.commit.author.date);

        // Upsert commit and retrieve DB id
        const commitInsertResult = await query(`
          INSERT INTO commits (
            repository_id, sha, short_sha, message, message_subject, author_name, author_email, committed_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (repository_id, sha) 
          DO UPDATE SET message_subject = EXCLUDED.message_subject
          RETURNING id
        `, [repoId, sha, shortSha, message, messageSubject, authorName, authorEmail, committedAt]);

        const commitId = commitInsertResult.rows[0].id;
        uniqueShas.add(sha);

        // Link commit to this branch
        await query(`
          INSERT INTO commit_branches (commit_id, branch_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [commitId, branch.id]);
      }

      // If we got fewer than 100 commits, there are no more pages
      if (commits.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }

    // Calculate progress proportionally between 20% and 50%
    const currentProgress = Math.min(50, Math.round(20 + ((i + 1) / branches.length) * 30));

    // Update job status
    await query(`
      UPDATE indexing_jobs 
      SET stage = $1, progress = $2, commits_indexed = $3 
      WHERE id = $4
    `, [stage, currentProgress, uniqueShas.size, jobId]);

    // Send progress event
    await publishEvent(repoId, {
      type: 'progress',
      repoId,
      stage,
      progress: currentProgress,
      commitsIndexed: uniqueShas.size,
    });
  }
}
