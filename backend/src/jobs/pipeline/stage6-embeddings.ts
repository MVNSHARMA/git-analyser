import { query } from '../../config/db';
import { getPineconeIndex } from '../../config/pinecone';
import { VoyageAIClient as VoyageAI } from 'voyageai';
import { GitHubApiClient } from '../../services/github-api';
import { publishEvent } from '../../websocket/ws-events';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runStage6(
  repoId: string,
  jobId: string,
  _client: GitHubApiClient,
  _owner: string,
  _repo: string
): Promise<void> {
  const stage = 'embeddings';
  const progress = 95;

  // 1. Fetch commits of this repository that do not have vectors generated yet
  const commitRes = await query(`
    SELECT id, sha, author_name, committed_at, message_subject 
    FROM commits 
    WHERE repository_id = $1 AND vector_id IS NULL
  `, [repoId]);
  
  const commits = commitRes.rows as Array<{
    id: string;
    sha: string;
    author_name: string;
    committed_at: Date;
    message_subject: string;
  }>;

  if (commits.length > 0) {
    if (!process.env.VOYAGE_API_KEY) {
      throw new Error('VOYAGE_API_KEY environment variable is required');
    }

    const voyageClient = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });
    const pineconeIndex = getPineconeIndex();

    // Process in groups of 50
    for (let i = 0; i < commits.length; i += 50) {
      const batch = commits.slice(i, i + 50);
      
      // Build text payload for embeddings calculation
      const texts = batch.map((c) => {
        const dateStr = new Date(c.committed_at).toISOString();
        return `${c.sha} ${c.author_name} ${dateStr} ${c.message_subject}`;
      });

      // Fetch embeddings from Voyage AI
      const response = await voyageClient.embed({
        input: texts,
        model: 'voyage-code-2',
      });

      const embeddings = (response as any).embeddings || response.data?.map((item: any) => item.embedding) || [];

      // Map to Pinecone vectors format
      const vectors = batch.map((c, index) => ({
        id: c.sha,
        values: embeddings[index],
        metadata: {
          repoId,
          sha: c.sha,
          author: c.author_name,
          date: new Date(c.committed_at).toISOString(),
          subject: c.message_subject,
        },
      }));

      // Upsert to Pinecone index namespace (scoped strictly to repoId)
      await pineconeIndex.namespace(repoId).upsert(vectors);

      // Mark database records as embedded by setting vector_id = sha
      const batchIds = batch.map((c) => c.id);
      await query(`
        UPDATE commits 
        SET vector_id = sha 
        WHERE id = ANY($1)
      `, [batchIds]);

      await sleep(100);
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

  // 4. Publish websocket progress event
  await publishEvent(repoId, {
    type: 'progress',
    repoId,
    stage,
    progress,
    commitsIndexed,
  });
}
