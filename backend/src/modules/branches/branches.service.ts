import { query } from '../../config/db';
import { NotFoundError } from '../../errors';

export interface Branch {
  id: string;
  repository_id: string;
  name: string;
  head_sha: string;
  is_default: boolean;
  is_protected: boolean;
  last_commit_at: Date | null;
  created_at: Date;
  updated_at: Date;
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

export interface BranchComparison {
  base: string;
  head: string;
  commitsAhead: number;
  commitsBehind: number;
  potentialConflictFiles: string[];
  conflictRisk: 'low' | 'medium' | 'high';
  baseCommits: Commit[];
  headCommits: Commit[];
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

export async function getBranches(repoId: string, userId: string): Promise<Branch[]> {
  await verifyRepoOwnership(repoId, userId);

  const res = await query<Branch>(`
    SELECT * FROM branches
    WHERE repository_id = $1
    ORDER BY is_default DESC, name ASC
  `, [repoId]);

  return res.rows;
}

export async function getBranchByName(
  name: string,
  repoId: string,
  userId: string
): Promise<Branch> {
  await verifyRepoOwnership(repoId, userId);

  const res = await query<Branch>(`
    SELECT * FROM branches
    WHERE name = $1 AND repository_id = $2
  `, [name, repoId]);

  if (res.rows.length === 0) {
    throw new NotFoundError('Branch not found');
  }

  return res.rows[0];
}

export async function compareBranches(
  repoId: string,
  userId: string,
  baseBranch: string,
  headBranch: string
): Promise<BranchComparison> {
  await verifyRepoOwnership(repoId, userId);

  // 1. Get base commits unique to base branch
  const baseCommitsRes = await query<any>(`
    SELECT DISTINCT c.* FROM commits c
    JOIN commit_branches cb ON cb.commit_id = c.id
    JOIN branches b ON b.id = cb.branch_id
    WHERE b.name = $1 AND c.repository_id = $2
    AND c.id NOT IN (
      SELECT c2.id FROM commits c2
      JOIN commit_branches cb2 ON cb2.commit_id = c2.id
      JOIN branches b2 ON b2.id = cb2.branch_id
      WHERE b2.name = $3 AND c2.repository_id = $2
    )
    ORDER BY c.committed_at DESC
  `, [baseBranch, repoId, headBranch]);

  // 2. Get head commits unique to head branch
  const headCommitsRes = await query<any>(`
    SELECT DISTINCT c.* FROM commits c
    JOIN commit_branches cb ON cb.commit_id = c.id
    JOIN branches b ON b.id = cb.branch_id
    WHERE b.name = $1 AND c.repository_id = $2
    AND c.id NOT IN (
      SELECT c2.id FROM commits c2
      JOIN commit_branches cb2 ON cb2.commit_id = c2.id
      JOIN branches b2 ON b2.id = cb2.branch_id
      WHERE b2.name = $3 AND c2.repository_id = $2
    )
    ORDER BY c.committed_at DESC
  `, [headBranch, repoId, baseBranch]);

  const baseCommits: Commit[] = baseCommitsRes.rows.map((row) => ({
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

  const headCommits: Commit[] = headCommitsRes.rows.map((row) => ({
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

  // 3. Extract modified file names for intersection to find potential conflicts
  const baseCommitIds = baseCommits.map((c) => c.id);
  const headCommitIds = headCommits.map((c) => c.id);

  const baseFiles = new Set<string>();
  const headFiles = new Set<string>();

  if (baseCommitIds.length > 0) {
    const baseDiffs = await query<{ diff_json: any }>(`
      SELECT diff_json FROM commit_diffs
      WHERE commit_id = ANY($1)
    `, [baseCommitIds]);
    for (const row of baseDiffs.rows) {
      const files = Array.isArray(row.diff_json) ? row.diff_json : [];
      for (const file of files) {
        if (file && typeof file.filename === 'string') {
          baseFiles.add(file.filename);
        }
      }
    }
  }

  if (headCommitIds.length > 0) {
    const headDiffs = await query<{ diff_json: any }>(`
      SELECT diff_json FROM commit_diffs
      WHERE commit_id = ANY($1)
    `, [headCommitIds]);
    for (const row of headDiffs.rows) {
      const files = Array.isArray(row.diff_json) ? row.diff_json : [];
      for (const file of files) {
        if (file && typeof file.filename === 'string') {
          headFiles.add(file.filename);
        }
      }
    }
  }

  const potentialConflictFiles = Array.from(baseFiles).filter((f) => headFiles.has(f));

  // Risk logic
  let conflictRisk: 'low' | 'medium' | 'high' = 'low';
  if (potentialConflictFiles.length >= 4) {
    conflictRisk = 'high';
  } else if (potentialConflictFiles.length >= 1) {
    conflictRisk = 'medium';
  }

  return {
    base: baseBranch,
    head: headBranch,
    commitsAhead: headCommits.length,
    commitsBehind: baseCommits.length,
    potentialConflictFiles,
    conflictRisk,
    baseCommits,
    headCommits,
  };
}
