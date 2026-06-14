import { query } from '../../config/db';
import { NotFoundError } from '../../errors';

export interface Contributor {
  id: string;
  repository_id: string;
  primary_email: string;
  display_name: string;
  github_username: string | null;
  avatar_url: string | null;
  total_commits: number;
  total_insertions: number;
  total_deletions: number;
  first_commit_at: Date | null;
  last_commit_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface ContributorStats {
  id: string;
  display_name: string;
  github_username: string | null;
  avatar_url: string | null;
  total_commits: number;
  total_insertions: number;
  total_deletions: number;
  first_commit_at: Date | null;
  last_commit_at: Date | null;
  commits_last_7_days: number;
  commits_last_30_days: number;
}

export interface Commit {
  id: string;
  repository_id: string;
  contributor_id: string | null;
  sha: string;
  short_sha: string;
  message: string;
  message_subject: string;
  author_name: string;
  author_email: string | null;
  committed_at: Date;
  additions: number | null;
  deletions: number | null;
  files_changed_count: number | null;
  diff_stored: boolean;
  vector_id: string | null;
  created_at: Date;
}

export async function verifyRepoOwnership(repoId: string, userId: string): Promise<void> {
  const res = await query(`
    SELECT id FROM repositories
    WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
  `, [repoId, userId]);
  if (res.rows.length === 0) {
    throw new NotFoundError('Repository not found');
  }
}

export async function getContributors(repoId: string, userId: string): Promise<Contributor[]> {
  await verifyRepoOwnership(repoId, userId);
  const res = await query<Contributor>(`
    SELECT * FROM contributors
    WHERE repository_id = $1
    ORDER BY total_commits DESC
  `, [repoId]);
  return res.rows;
}

export async function getContributorById(
  contributorId: string,
  repoId: string,
  userId: string
): Promise<Contributor> {
  await verifyRepoOwnership(repoId, userId);
  const res = await query<Contributor>(`
    SELECT * FROM contributors
    WHERE id = $1 AND repository_id = $2
  `, [contributorId, repoId]);
  
  if (res.rows.length === 0) {
    throw new NotFoundError('Contributor not found');
  }
  return res.rows[0];
}

export async function getContributorCommits(
  contributorId: string,
  repoId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Commit[]> {
  await verifyRepoOwnership(repoId, userId);
  
  // Cap the limit to a maximum of 100
  const parsedLimit = Math.min(Math.max(1, limit), 100);
  const parsedOffset = Math.max(0, offset);

  const res = await query<Commit>(`
    SELECT * FROM commits
    WHERE contributor_id = $1 AND repository_id = $2
    ORDER BY committed_at DESC
    LIMIT $3 OFFSET $4
  `, [contributorId, repoId, parsedLimit, parsedOffset]);
  return res.rows;
}

export async function getContributorStats(repoId: string, userId: string): Promise<ContributorStats[]> {
  await verifyRepoOwnership(repoId, userId);
  const res = await query<any>(`
    SELECT 
      c.id, 
      c.display_name, 
      c.github_username, 
      c.avatar_url,
      c.total_commits, 
      c.total_insertions, 
      c.total_deletions,
      c.first_commit_at, 
      c.last_commit_at,
      COUNT(cm.id) FILTER (WHERE cm.committed_at > NOW() - INTERVAL '7 days') AS commits_last_7_days,
      COUNT(cm.id) FILTER (WHERE cm.committed_at > NOW() - INTERVAL '30 days') AS commits_last_30_days
    FROM contributors c
    LEFT JOIN commits cm ON cm.contributor_id = c.id
    WHERE c.repository_id = $1
    GROUP BY c.id
    ORDER BY c.total_commits DESC
  `, [repoId]);

  return res.rows.map((row) => ({
    id: row.id,
    display_name: row.display_name,
    github_username: row.github_username,
    avatar_url: row.avatar_url,
    total_commits: Number(row.total_commits),
    total_insertions: Number(row.total_insertions),
    total_deletions: Number(row.total_deletions),
    first_commit_at: row.first_commit_at,
    last_commit_at: row.last_commit_at,
    commits_last_7_days: Number(row.commits_last_7_days),
    commits_last_30_days: Number(row.commits_last_30_days),
  }));
}
