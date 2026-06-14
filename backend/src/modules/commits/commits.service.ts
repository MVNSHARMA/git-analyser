import { query } from '../../config/db';
import { NotFoundError } from '../../errors';

export interface CommitFilters {
  branch?: string;
  author?: string;
  search?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
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
  committed_at: string;
  additions: number | null;
  deletions: number | null;
  files_changed_count: number | null;
  diff_stored: boolean;
  vector_id: string | null;
  created_at: string;
}

export interface CommitDetail extends Omit<Commit, 'created_at'> {
  contributor_github_username: string | null;
  diffs: any[];
}

export interface ActivityByDay {
  date: string;
  commit_count: number;
  active_contributors: number;
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

export async function getCommits(
  repoId: string,
  userId: string,
  filters: CommitFilters
): Promise<{ commits: Commit[]; total: number }> {
  await verifyRepoOwnership(repoId, userId);

  const params: any[] = [repoId];
  let paramIndex = 2;

  let joins = '';
  let whereClauses = 'WHERE c.repository_id = $1';

  if (filters.branch) {
    joins += ' JOIN commit_branches cb ON cb.commit_id = c.id JOIN branches b ON b.id = cb.branch_id';
    whereClauses += ` AND b.name = $${paramIndex}`;
    params.push(filters.branch);
    paramIndex++;
  }

  if (filters.author) {
    whereClauses += ` AND (c.author_name ILIKE $${paramIndex} OR c.author_email ILIKE $${paramIndex})`;
    params.push(`%${filters.author}%`);
    paramIndex++;
  }

  if (filters.search) {
    whereClauses += ` AND to_tsvector('english', c.message) @@ plainto_tsquery($${paramIndex})`;
    params.push(filters.search);
    paramIndex++;
  }

  if (filters.from) {
    whereClauses += ` AND c.committed_at >= $${paramIndex}`;
    params.push(new Date(filters.from));
    paramIndex++;
  }

  if (filters.to) {
    whereClauses += ` AND c.committed_at <= $${paramIndex}`;
    params.push(new Date(filters.to));
    paramIndex++;
  }

  // Count query
  const countQuery = `
    SELECT COUNT(DISTINCT c.id) AS total
    FROM commits c
    ${joins}
    ${whereClauses}
  `;
  const countRes = await query<{ total: string }>(countQuery, params);
  const total = parseInt(countRes.rows[0]?.total || '0', 10);

  // Select query
  const limit = Math.min(Math.max(1, filters.limit), 100);
  const offset = Math.max(0, filters.offset);

  const selectQuery = `
    SELECT DISTINCT 
      c.id, 
      c.repository_id, 
      c.contributor_id, 
      c.sha, 
      c.short_sha AS "short_sha",
      c.message, 
      c.message_subject AS "message_subject", 
      c.author_name AS "author_name",
      c.author_email AS "author_email", 
      c.committed_at AS "committed_at",
      c.additions, 
      c.deletions, 
      c.files_changed_count AS "files_changed_count",
      c.diff_stored AS "diff_stored", 
      c.vector_id AS "vector_id", 
      c.created_at AS "created_at"
    FROM commits c
    ${joins}
    ${whereClauses}
    ORDER BY c.committed_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const selectParams = [...params, limit, offset];
  const selectRes = await query<any>(selectQuery, selectParams);

  const commits: Commit[] = selectRes.rows.map((row) => ({
    id: row.id,
    repository_id: row.repository_id,
    contributor_id: row.contributor_id,
    sha: row.sha,
    short_sha: row.short_sha,
    message: row.message,
    message_subject: row.message_subject,
    author_name: row.author_name,
    author_email: row.author_email,
    committed_at: row.committed_at.toISOString(),
    additions: row.additions,
    deletions: row.deletions,
    files_changed_count: row.files_changed_count,
    diff_stored: row.diff_stored,
    vector_id: row.vector_id,
    created_at: row.created_at.toISOString(),
  }));

  return { commits, total };
}

export async function getCommitBySha(
  sha: string,
  repoId: string,
  userId: string
): Promise<CommitDetail> {
  await verifyRepoOwnership(repoId, userId);

  const commitRes = await query<any>(`
    SELECT 
      c.id, 
      c.repository_id, 
      c.contributor_id, 
      c.sha, 
      c.short_sha,
      c.message, 
      c.message_subject, 
      c.author_name, 
      c.author_email, 
      c.committed_at,
      c.additions, 
      c.deletions, 
      c.files_changed_count,
      c.diff_stored, 
      c.vector_id,
      contr.github_username AS contributor_github_username
    FROM commits c
    LEFT JOIN contributors contr ON c.contributor_id = contr.id
    WHERE c.sha = $1 AND c.repository_id = $2
  `, [sha, repoId]);

  if (commitRes.rows.length === 0) {
    throw new NotFoundError('Commit not found');
  }

  const row = commitRes.rows[0];

  const diffsRes = await query<{ diff_json: any[] }>(`
    SELECT diff_json 
    FROM commit_diffs 
    WHERE commit_id = $1
  `, [row.id]);

  const diffs = diffsRes.rows[0]?.diff_json || [];

  return {
    id: row.id,
    repository_id: row.repository_id,
    contributor_id: row.contributor_id,
    sha: row.sha,
    short_sha: row.short_sha,
    message: row.message,
    message_subject: row.message_subject,
    author_name: row.author_name,
    author_email: row.author_email,
    committed_at: row.committed_at.toISOString(),
    additions: row.additions,
    deletions: row.deletions,
    files_changed_count: row.files_changed_count,
    diff_stored: row.diff_stored,
    vector_id: row.vector_id,
    contributor_github_username: row.contributor_github_username,
    diffs,
  };
}

export async function getRecentActivity(
  repoId: string,
  userId: string,
  days: number = 30
): Promise<ActivityByDay[]> {
  await verifyRepoOwnership(repoId, userId);

  const res = await query<any>(`
    SELECT 
      DATE(committed_at) AS date,
      COUNT(*) AS commit_count,
      COUNT(DISTINCT author_email) AS active_contributors
    FROM commits
    WHERE repository_id = $1 AND committed_at > NOW() - ($2 * INTERVAL '1 day')
    GROUP BY DATE(committed_at)
    ORDER BY date ASC
  `, [repoId, days]);

  return res.rows.map((row) => ({
    date: new Date(row.date).toISOString().split('T')[0],
    commit_count: parseInt(row.commit_count, 10),
    active_contributors: parseInt(row.active_contributors, 10),
  }));
}
