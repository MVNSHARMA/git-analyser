import { query } from '../../config/db';
import { NotFoundError } from '../../errors';

export interface IndexingJob {
  id: string;
  repository_id: string;
  triggered_by: string | null;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed';
  stage: string | null;
  progress: number;
  commits_indexed: number;
  error_message: string | null;
  error_code: string | null;
  started_at: Date | null;
  completed_at: Date | null;
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

export async function getIndexingStatus(repoId: string, userId: string): Promise<IndexingJob | null> {
  await verifyRepoOwnership(repoId, userId);

  const res = await query<IndexingJob>(`
    SELECT * FROM indexing_jobs
    WHERE repository_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [repoId]);

  if (res.rows.length === 0) {
    return null;
  }
  return res.rows[0];
}

export async function getIndexingHistory(repoId: string, userId: string): Promise<IndexingJob[]> {
  await verifyRepoOwnership(repoId, userId);

  const res = await query<IndexingJob>(`
    SELECT * FROM indexing_jobs
    WHERE repository_id = $1
    ORDER BY created_at DESC
    LIMIT 10
  `, [repoId]);

  return res.rows;
}
