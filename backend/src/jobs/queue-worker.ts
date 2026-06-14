import 'dotenv/config';
import { blpop } from '../config/redis';
import { query } from '../config/db';
import { runPipeline } from './pipeline-runner';

let isShuttingDown = false;
let isJobRunning = false;

/**
 * Worker process running an infinite loop to consume jobs from the Redis queue.
 */
async function startWorker(): Promise<void> {
  console.log('🔧 Queue worker started — listening on index:queue');

  while (!isShuttingDown) {
    try {
      // Blocking pop from queue (5-second timeout)
      const result = await blpop('index:queue', 5);
      if (!result) {
        continue;
      }

      // result is [listKey, value]
      const repoId = result[1];

      // Fetch the latest queued indexing job for this repository
      const jobResult = await query(`
        SELECT id FROM indexing_jobs 
        WHERE repository_id = $1 AND status = 'queued' 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [repoId]);

      if (jobResult.rows.length === 0) {
        console.log(`⚠️ No queued indexing job found for repository ${repoId}, skipping.`);
        continue;
      }

      const jobId = jobResult.rows[0].id as string;

      isJobRunning = true;
      try {
        await runPipeline(repoId, jobId);
      } catch (pipelineErr) {
        console.error(`💥 Pipeline execution crashed for repository ${repoId}:`, pipelineErr);
      } finally {
        isJobRunning = false;
      }

      // Gracefully exit if SIGTERM was received during job execution
      if (isShuttingDown) {
        console.log('Clean worker exit: finished current job. Goodbye.');
        process.exit(0);
      }
    } catch (err) {
      isJobRunning = false;
      console.error('💥 Queue worker encountered an error:', err);
    }
  }

  console.log('Clean worker exit. Goodbye.');
  process.exit(0);
}

// Graceful shutdown handlers
function handleShutdown(signal: string) {
  console.log(`\n${signal} received — preparing shutdown…`);
  isShuttingDown = true;
  
  if (!isJobRunning) {
    console.log('Clean worker exit: no active jobs running. Goodbye.');
    process.exit(0);
  } else {
    console.log('Active job is running. Shutting down after current job finishes.');
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startWorker().catch((err) => {
  console.error('💥 Fatal queue worker error:', err);
  process.exit(1);
});
