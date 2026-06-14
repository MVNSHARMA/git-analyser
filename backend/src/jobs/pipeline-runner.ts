import { query } from '../config/db';
import { decryptAES } from '../services/crypto';
import { GitHubApiClient } from '../services/github-api';
import { set } from '../config/redis';
import { publishEvent } from '../websocket/ws-events';
import { RateLimitError } from '../errors';

import { runStage1 } from './pipeline/stage1-metadata';
import { runStage2 } from './pipeline/stage2-branches';
import { runStage3 } from './pipeline/stage3-commits';
import { runStage4 } from './pipeline/stage4-diffs';
import { runStage5 } from './pipeline/stage5-contributors';
import { runStage6 } from './pipeline/stage6-embeddings';
import { runStage7 } from './pipeline/stage7-seal';

/**
 * Execute the 7-stage indexing pipeline for a repository.
 */
export async function runPipeline(repoId: string, jobId: string): Promise<void> {
  console.log(`🚀 Starting indexing pipeline for repo ${repoId} (job: ${jobId})`);

  // 1. Fetch repository and owner credentials
  const repoResult = await query(`
    SELECT r.owner, r.name, u.github_access_token 
    FROM repositories r 
    JOIN users u ON r.user_id = u.id 
    WHERE r.id = $1 AND r.deleted_at IS NULL
  `, [repoId]);

  if (repoResult.rows.length === 0) {
    console.warn(`⚠️ Pipeline cancelled: Repository ${repoId} not found or deleted`);
    return;
  }

  const { owner, name, github_access_token } = repoResult.rows[0] as {
    owner: string;
    name: string;
    github_access_token: string | null;
  };

  // Decrypt user GitHub access token
  const token = github_access_token ? decryptAES(github_access_token) : undefined;
  const client = new GitHubApiClient(token);

  // 2. Set statuses to running
  await query(`
    UPDATE indexing_jobs 
    SET status = 'running', started_at = NOW() 
    WHERE id = $1
  `, [jobId]);

  await query(`
    UPDATE repositories 
    SET indexing_status = 'indexing', updated_at = NOW() 
    WHERE id = $1
  `, [repoId]);

  // 3. Sequentially run all stages
  let currentStageName = 'metadata';
  try {
    currentStageName = 'metadata';
    await runStage1(repoId, jobId, client, owner, name);

    currentStageName = 'branches';
    await runStage2(repoId, jobId, client, owner, name);

    currentStageName = 'commits';
    await runStage3(repoId, jobId, client, owner, name);

    currentStageName = 'diffs';
    await runStage4(repoId, jobId, client, owner, name);

    currentStageName = 'contributors';
    await runStage5(repoId, jobId, client, owner, name);

    currentStageName = 'embeddings';
    await runStage6(repoId, jobId, client, owner, name);

    currentStageName = 'seal';
    await runStage7(repoId, jobId, client, owner, name);

    console.log(`🎉 Repository ${repoId} indexed successfully`);
  } catch (err: any) {
    const isRateLimit = err instanceof RateLimitError || err.name === 'RateLimitError' || err.statusCode === 429;
    
    if (isRateLimit) {
      console.warn(`⚠️ Rate limit hit at stage [${currentStageName}] for repo ${repoId}. Pausing job.`);

      // Update DB to show job is paused
      await query(`
        UPDATE indexing_jobs 
        SET status = 'paused', stage = $1 
        WHERE id = $2
      `, [currentStageName, jobId]);

      await query(`
        UPDATE repositories 
        SET indexing_status = 'paused', updated_at = NOW() 
        WHERE id = $1
      `, [repoId]);

      // Cache paused job ID in Redis to retry in 1 hour
      await set(`retry:${repoId}`, jobId, 3600);

      // Broadcast rate limit warning over Websockets
      await publishEvent(repoId, {
        type: 'error',
        repoId,
        errorCode: 'RATE_LIMIT_REACHED',
        message: err.message || 'GitHub API rate limit hit. Indexing job paused.',
      });
    } else {
      console.error(`❌ Indexing failed at stage [${currentStageName}] for repo ${repoId}:`, err);
      
      const errorCode = err.code || 'PIPELINE_ERROR';
      const errorMessage = err.message || 'An unexpected pipeline error occurred';

      // Update DB to show job failed
      await query(`
        UPDATE indexing_jobs 
        SET status = 'failed', stage = $1, error_code = $2, error_message = $3, completed_at = NOW() 
        WHERE id = $4
      `, [currentStageName, errorCode, errorMessage, jobId]);

      await query(`
        UPDATE repositories 
        SET indexing_status = 'error', updated_at = NOW() 
        WHERE id = $1
      `, [repoId]);

      // Broadcast error over Websockets
      await publishEvent(repoId, {
        type: 'error',
        repoId,
        errorCode,
        message: errorMessage,
      });
    }
  }
}
