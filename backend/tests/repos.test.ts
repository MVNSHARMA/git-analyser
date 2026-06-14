import 'dotenv/config';

// Define required env vars for pinecone check
process.env.PINECONE_API_KEY = 'mock-key';
process.env.PINECONE_INDEX = 'mock-index';
process.env.ENCRYPTION_KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
process.env.VOYAGE_API_KEY = 'mock-key';

import request from 'supertest';
import http from 'http';
import WebSocket from 'ws';
import { createApp } from '../src/app';
import { query } from '../src/config/db';
import redisClient from '../src/config/redis';
import { signAccessToken } from '../src/services/jwt';
import { encryptAES } from '../src/services/crypto';
import { runPipeline } from '../src/jobs/pipeline-runner';
import { attachWebSocketServer } from '../src/websocket/ws-server';
import { publishEvent } from '../src/websocket/ws-events';

// Mock getPineconeIndex
jest.mock('../src/config/pinecone', () => {
  const mockNamespace = {
    upsert: jest.fn().mockResolvedValue({}),
    deleteAll: jest.fn().mockResolvedValue({}),
  };
  return {
    getPineconeIndex: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue(mockNamespace),
    }),
  };
});

// Mock Redis to isolate the test queue from any running local worker
jest.mock('../src/config/redis', () => {
  const actualRedis = jest.requireActual('../src/config/redis');
  return {
    __esModule: true,
    ...actualRedis,
    default: actualRedis.default,
    rpush: jest.fn().mockImplementation(async (key: string, value: string) => {
      const targetKey = key === 'index:queue' ? 'index:queue:test' : key;
      return actualRedis.rpush(targetKey, value);
    }),
    blpop: jest.fn().mockImplementation(async (key: string, timeoutSeconds: number) => {
      const targetKey = key === 'index:queue' ? 'index:queue:test' : key;
      return actualRedis.blpop(targetKey, timeoutSeconds);
    }),
  };
});

// Mock Voyage AI
jest.mock('voyageai', () => {
  const MockVoyageAIClient = jest.fn().mockImplementation(() => {
    return {
      embed: jest.fn().mockResolvedValue({
        embeddings: [new Array(1536).fill(0.1)],
        data: [{ embedding: new Array(1536).fill(0.1), index: 0 }],
      }),
    };
  });
  return {
    __esModule: true,
    VoyageAIClient: MockVoyageAIClient,
    default: MockVoyageAIClient,
  };
});

// Mock GitHub API client
jest.mock('../src/services/github-api', () => {
  return {
    GitHubApiClient: jest.fn().mockImplementation(() => {
      return {
        lastRateLimitRemaining: 1000,
        getRepo: jest.fn().mockResolvedValue({
          id: 999999,
          name: 'Hello-World',
          full_name: 'octocat/Hello-World',
          description: 'My first repo',
          private: false,
          default_branch: 'main',
          language: 'TypeScript',
          stargazers_count: 10,
        }),
        getBranches: jest.fn().mockResolvedValue([
          { name: 'main', commit: { sha: 'abcdef1234567890' }, protected: false }
        ]),
        getCommits: jest.fn().mockResolvedValue([
          {
            sha: 'abcdef1234567890',
            commit: {
              message: 'Initial commit',
              author: {
                name: 'The Octocat',
                email: 'octocat@github.com',
                date: '2026-06-08T00:00:00Z',
              },
            },
          },
        ]),
        getCommitDetail: jest.fn().mockResolvedValue({
          sha: 'abcdef1234567890',
          commit: { message: 'Initial commit' },
          stats: { additions: 10, deletions: 2 },
          files: [
            { filename: 'README.md', additions: 10, deletions: 2, patch: '@@ -0,0 +1,10 @@' }
          ],
        }),
        searchUserByEmail: jest.fn().mockResolvedValue({
          login: 'octocat',
          avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        }),
      };
    }),
  };
});

const app = createApp();

describe('Git Analyser Repository Module & Pipeline Integration Tests', () => {
  let userId: string;
  let accessToken: string;
  let testRepoId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    
    // Clear data
    await query('DELETE FROM users WHERE email = $1', ['repo_owner@test.com']);
    await redisClient.flushall();

    // Create a test user with a mocked encrypted GitHub token
    const encryptedToken = encryptAES('ghp_mocktoken123456789');
    const userInsert = await query<{ id: string }>(`
      INSERT INTO users (email, password_hash, display_name, email_verified, github_access_token, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['repo_owner@test.com', 'dummy_hash', 'Repo Owner', true, encryptedToken, 'user']);
    userId = userInsert.rows[0].id;

    // Sign a real jwt access token
    accessToken = signAccessToken({ userId, email: 'repo_owner@test.com', role: 'user', sessionId: 'dummy_session' });
  });

  afterAll(async () => {
    // Clean up
    await query('DELETE FROM users WHERE id = $1', [userId]);
    await redisClient.flushall();

    // Close DB pool connections
    const { pool } = require('../src/config/db');
    await pool.end();
    await redisClient.quit();
  });

  test('1. POST /api/v1/repos -> 201 Created and pushes job to redis queue', async () => {
    const res = await request(app)
      .post('/api/v1/repos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        githubUrl: 'https://github.com/octocat/Hello-World',
        displayName: 'My Mocked Hello World',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.github_repo_id).toBe('999999');
    expect(res.body.owner).toBe('octocat');
    expect(res.body.name).toBe('Hello-World');
    expect(res.body.indexing_status).toBe('pending');

    testRepoId = res.body.id;

    // Verify repository exists in DB
    const dbRepo = await query('SELECT * FROM repositories WHERE id = $1', [testRepoId]);
    expect(dbRepo.rows.length).toBe(1);

    // Verify indexing job exists in DB
    const dbJob = await query('SELECT * FROM indexing_jobs WHERE repository_id = $1 AND status = $2', [testRepoId, 'queued']);
    expect(dbJob.rows.length).toBe(1);

    // Verify job pushed to Redis queue
    const redisQueueLength = await redisClient.llen('index:queue:test');
    expect(redisQueueLength).toBe(1);

    const poppedRepoId = await redisClient.lindex('index:queue:test', 0);
    expect(poppedRepoId).toBe(testRepoId);
  });

  test('2. POST /api/v1/repos with same URL -> 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/repos')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        githubUrl: 'https://github.com/octocat/Hello-World',
        displayName: 'My Mocked Hello World Duplicate',
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
    expect(res.body.error).toBe('REPO_ALREADY_EXISTS');
  });

  test('3. GET /api/v1/repos -> 200 list repositories', async () => {
    const res = await request(app)
      .get('/api/v1/repos')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(testRepoId);
  });

  test('4. GET /api/v1/repos/:id -> 200 repository details', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${testRepoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(testRepoId);
    expect(res.body.github_repo_id).toBe('999999');
  });

  test('5. Process queue job & execute runPipeline stages 1-7 and verify database entries', async () => {
    // Simulated Queue Worker behavior: pop from queue, verify job, run pipeline
    const popped = await redisClient.blpop('index:queue:test', 1);
    expect(popped).not.toBeNull();
    const repoId = popped![1];
    expect(repoId).toBe(testRepoId);

    const jobResult = await query('SELECT id FROM indexing_jobs WHERE repository_id = $1 AND status = $2', [repoId, 'queued']);
    expect(jobResult.rows.length).toBe(1);
    const jobId = jobResult.rows[0].id as string;

    // Run the pipeline runner (this will execute stages 1 to 7 using our Jest mocks)
    await runPipeline(repoId, jobId);

    // verify stage completion states in DB
    const dbRepo = await query('SELECT * FROM repositories WHERE id = $1', [repoId]);
    expect(dbRepo.rows[0].indexing_status).toBe('ready');
    expect(dbRepo.rows[0].description).toBe('My first repo');
    expect(dbRepo.rows[0].language).toBe('TypeScript');
    expect(dbRepo.rows[0].total_commits_count).toBe(1);
    expect(dbRepo.rows[0].total_branches_count).toBe(1);

    const dbJob = await query('SELECT * FROM indexing_jobs WHERE id = $1', [jobId]);
    expect(dbJob.rows[0].status).toBe('completed');
    expect(dbJob.rows[0].progress).toBe(100);
    expect(dbJob.rows[0].stage).toBe('complete');

    // check branches table
    const dbBranches = await query('SELECT * FROM branches WHERE repository_id = $1', [repoId]);
    expect(dbBranches.rows.length).toBe(1);
    expect(dbBranches.rows[0].name).toBe('main');
    expect(dbBranches.rows[0].head_sha).toBe('abcdef1234567890');

    // check commits table
    const dbCommits = await query('SELECT * FROM commits WHERE repository_id = $1', [repoId]);
    expect(dbCommits.rows.length).toBe(1);
    expect(dbCommits.rows[0].sha).toBe('abcdef1234567890');
    expect(dbCommits.rows[0].author_name).toBe('The Octocat');
    expect(dbCommits.rows[0].vector_id).toBe('abcdef1234567890'); // confirming vector generation marks it as embedded
    expect(dbCommits.rows[0].diff_stored).toBe(true);

    // check commit_diffs table
    const dbDiffs = await query('SELECT * FROM commit_diffs WHERE commit_id = $1', [dbCommits.rows[0].id]);
    expect(dbDiffs.rows.length).toBe(1);
    expect(dbDiffs.rows[0].diff_json).toBeDefined();

    // check contributors table
    const dbContributors = await query('SELECT * FROM contributors WHERE repository_id = $1', [repoId]);
    expect(dbContributors.rows.length).toBe(1);
    expect(dbContributors.rows[0].github_username).toBe('octocat');
    expect(dbContributors.rows[0].avatar_url).toBe('https://github.com/images/error/octocat_happy.gif');

    // check notifications table
    const dbNotifications = await query('SELECT * FROM notifications WHERE repo_id = $1', [repoId]);
    expect(dbNotifications.rows.length).toBe(1);
    expect(dbNotifications.rows[0].type).toBe('indexing_complete');

    // Pinecone mock upsert check
    const { getPineconeIndex } = require('../src/config/pinecone');
    const mockNamespace = getPineconeIndex().namespace(repoId);
    expect(mockNamespace.upsert).toHaveBeenCalled();
  });

  test('6. WebSocket authentication and events forwarding', (done) => {
    // Create an HTTP server and mount the WebSocket listener to it
    const server = http.createServer(app);
    attachWebSocketServer(server);

    server.listen(0, async () => {
      const address = server.address() as any;
      const port = address.port;

      // Connect ws client
      const wsClient = new WebSocket(`ws://localhost:${port}?token=${accessToken}`);

      wsClient.on('open', () => {
        setTimeout(async () => {
          try {
            // Send a custom test/progress event over Redis pub/sub
            await publishEvent(testRepoId, {
              type: 'progress',
              repoId: testRepoId,
              stage: 'test-ws-stage',
              progress: 55,
              commitsIndexed: 10,
            });
          } catch (err) {
            done(err);
          }
        }, 200);
      });

      wsClient.on('message', (data) => {
        const payload = JSON.parse(data.toString());
        expect(payload.type).toBe('progress');
        expect(payload.repoId).toBe(testRepoId);
        expect(payload.stage).toBe('test-ws-stage');
        expect(payload.progress).toBe(55);
        expect(payload.commitsIndexed).toBe(10);

        wsClient.close();
      });

      wsClient.on('close', () => {
        server.close(done);
      });
    });
  });

  test('7. DELETE /api/v1/repos/:id -> 200 soft deletes repository and purges Pinecone namespace', async () => {
    const res = await request(app)
      .delete(`/api/v1/repos/${testRepoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Repository removed');

    // Check DB: repository still exists but has deleted_at set and status paused
    const dbRepo = await query('SELECT * FROM repositories WHERE id = $1', [testRepoId]);
    expect(dbRepo.rows[0].deleted_at).not.toBeNull();

    // Check getRepositoryById throws NotFoundError
    const getRes = await request(app)
      .get(`/api/v1/repos/${testRepoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(getRes.status).toBe(404);

    // Verify Pinecone deleteAll was called for this repoId namespace
    const { getPineconeIndex } = require('../src/config/pinecone');
    const mockNamespace = getPineconeIndex().namespace(testRepoId);
    expect(mockNamespace.deleteAll).toHaveBeenCalled();
  });
});
