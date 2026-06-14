import { VoyageAIClient as VoyageAI } from 'voyageai';
import { getPineconeIndex } from '../config/pinecone';
import { query } from '../config/db';

export interface SimilarCommit {
  sha: string;
  shortSha: string;
  message: string;
  messageSubject: string;
  authorName: string;
  authorEmail: string;
  committedAt: string;
  additions: number | null;
  deletions: number | null;
  filesChangedCount: number | null;
  score: number;
  contributorGithubUsername: string | null;
}

export async function searchSimilarCommits(
  repoId: string,
  queryText: string,
  topK: number = 15
): Promise<SimilarCommit[]> {
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY environment variable is required');
  }
  const voyageClient = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY });

  // 1. Generate embedding for queryText using model 'voyage-code-2'
  const response = await voyageClient.embed({
    input: [queryText],
    model: 'voyage-code-2',
  });

  const embeddings = (response as any).embeddings || response.data?.map((item: any) => item.embedding) || [];
  if (embeddings.length === 0) {
    return [];
  }
  const queryVector = embeddings[0];

  // 2. Query Pinecone index namespace=repoId
  const pineconeIndex = getPineconeIndex();
  const queryResponse = await pineconeIndex.namespace(repoId).query({
    vector: queryVector,
    topK,
    includeMetadata: true,
  });

  const matches = queryResponse.matches || [];
  const validMatches = matches.filter((m) => (m.score ?? 0) > 0.3);
  if (validMatches.length === 0) {
    return [];
  }

  const shas = validMatches.map((m) => m.id);

  // 3. Retrieve detailed commit records from the DB
  const dbRes = await query<{
    sha: string;
    shortSha: string;
    message: string;
    messageSubject: string;
    authorName: string;
    authorEmail: string;
    committedAt: Date;
    additions: number | null;
    deletions: number | null;
    filesChangedCount: number | null;
    contributorGithubUsername: string | null;
  }>(`
    SELECT 
      c.sha, 
      c.short_sha AS "shortSha", 
      c.message, 
      c.message_subject AS "messageSubject", 
      c.author_name AS "authorName", 
      c.author_email AS "authorEmail", 
      c.committed_at AS "committedAt", 
      c.additions, 
      c.deletions, 
      c.files_changed_count AS "filesChangedCount", 
      contr.github_username AS "contributorGithubUsername"
    FROM commits c
    LEFT JOIN contributors contr ON c.contributor_id = contr.id
    WHERE c.sha = ANY($1) AND c.repository_id = $2
  `, [shas, repoId]);

  // Map DB records by SHA
  const commitMap = new Map<string, typeof dbRes.rows[0]>();
  for (const row of dbRes.rows) {
    commitMap.set(row.sha, row);
  }

  // 4. Build sorted SimilarCommit array based on Pinecone score order
  const results: SimilarCommit[] = [];
  for (const match of validMatches) {
    const sha = match.id;
    const dbCommit = commitMap.get(sha);
    if (dbCommit) {
      results.push({
        sha: dbCommit.sha,
        shortSha: dbCommit.shortSha,
        message: dbCommit.message,
        messageSubject: dbCommit.messageSubject,
        authorName: dbCommit.authorName,
        authorEmail: dbCommit.authorEmail,
        committedAt: dbCommit.committedAt.toISOString(),
        additions: dbCommit.additions,
        deletions: dbCommit.deletions,
        filesChangedCount: dbCommit.filesChangedCount,
        score: match.score ?? 0,
        contributorGithubUsername: dbCommit.contributorGithubUsername,
      });
    }
  }

  return results;
}
