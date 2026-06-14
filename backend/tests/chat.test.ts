import 'dotenv/config';

// Define required env vars
process.env.PINECONE_API_KEY = 'mock-key';
process.env.PINECONE_INDEX = 'mock-index';
process.env.ENCRYPTION_KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';
process.env.VOYAGE_API_KEY = 'mock-key';
process.env.GROQ_API_KEY = 'mock-key';

import request from 'supertest';
import { createApp } from '../src/app';
import { query } from '../src/config/db';
import redisClient from '../src/config/redis';
import { signAccessToken } from '../src/services/jwt';
import { encryptAES } from '../src/services/crypto';

// Mock Groq SDK
jest.mock('groq-sdk', () => {
  const mockStream = {
    async *[Symbol.asyncIterator]() {
      yield { choices: [{ delta: { content: 'Mock ' } }] };
      yield { choices: [{ delta: { content: 'streaming ' } }] };
      yield { choices: [{ delta: { content: 'response' } }] };
    }
  };

  const mockCreate = jest.fn().mockImplementation((options: any) => {
    if (options.stream) {
      return Promise.resolve(mockStream);
    } else {
      return Promise.resolve({
        choices: [
          {
            message: {
              content: 'Mock Conversation Title'
            }
          }
        ]
      });
    }
  });

  const MockGroq = jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    };
  });

  return {
    __esModule: true,
    default: MockGroq,
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

// Mock getPineconeIndex
jest.mock('../src/config/pinecone', () => {
  const mockNamespace = {
    query: jest.fn().mockResolvedValue({
      matches: [
        { id: 'abcdef1234567890abcdef1234567890abcdef12', score: 0.8 },
      ],
    }),
  };
  return {
    getPineconeIndex: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue(mockNamespace),
    }),
  };
});

const app = createApp();

describe('Git Analyser AI Chat Engine Integration Tests', () => {
  let userId: string;
  let accessToken: string;
  let repoId: string;
  let conversationId: string;
  let messageId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    // Clear data
    await query('DELETE FROM users WHERE email = $1', ['chat_user@test.com']);
    await redisClient.flushall();

    // Create user
    const encryptedToken = encryptAES('ghp_mocktoken123456789');
    const userInsert = await query<{ id: string }>(`
      INSERT INTO users (email, password_hash, display_name, email_verified, github_access_token, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['chat_user@test.com', 'dummy_hash', 'Chat User', true, encryptedToken, 'user']);
    userId = userInsert.rows[0].id;

    // Create JWT
    accessToken = signAccessToken({ userId, email: 'chat_user@test.com', role: 'user', sessionId: 'dummy_session' });

    // Create repository with indexing_status = 'ready'
    const repoInsert = await query<{ id: string }>(`
      INSERT INTO repositories (user_id, github_repo_id, owner, name, full_name, display_name, indexing_status, default_branch)
      VALUES ($1, 123456, 'test-owner', 'test-repo', 'test-owner/test-repo', 'Test Repo', 'ready', 'main')
      RETURNING id
    `, [userId]);
    repoId = repoInsert.rows[0].id;

    // Create contributor
    const contributorInsert = await query<{ id: string }>(`
      INSERT INTO contributors (repository_id, primary_email, display_name, github_username)
      VALUES ($1, 'contributor@test.com', 'Test Contributor', 'testcontributor')
      RETURNING id
    `, [repoId]);
    const contributorId = contributorInsert.rows[0].id;

    // Create commit
    await query(`
      INSERT INTO commits (repository_id, contributor_id, sha, short_sha, message, message_subject, author_name, author_email, committed_at, additions, deletions, files_changed_count)
      VALUES ($1, $2, 'abcdef1234567890abcdef1234567890abcdef12', 'abcdef1', 'Initial commit message', 'Initial commit message', 'Test Contributor', 'contributor@test.com', NOW(), 50, 10, 3)
    `, [repoId, contributorId]);
  });

  afterAll(async () => {
    // Delete user (cascades to all other records)
    await query('DELETE FROM users WHERE id = $1', [userId]);
    await redisClient.flushall();

    // Close connections
    const { pool } = require('../src/config/db');
    await pool.end();
    await redisClient.quit();
  });

  test('1. POST /api/v1/chat/conversations -> creates a conversation', async () => {
    const res = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        repoId,
        branchFilter: 'main',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.repository_id).toBe(repoId);
    expect(res.body.branch_filter).toBe('main');
    expect(res.body.title).toBeNull();

    conversationId = res.body.id;
  });

  test('2. POST /api/v1/chat/conversations with non-existent or unindexed repo -> error', async () => {
    // Non-existent repo
    const resFake = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        repoId: '00000000-0000-0000-0000-000000000000',
      });
    expect(resFake.status).toBe(404);

    // Create an unindexed repo
    const repoInsertPending = await query<{ id: string }>(`
      INSERT INTO repositories (user_id, github_repo_id, owner, name, full_name, indexing_status)
      VALUES ($1, 654321, 'test-owner', 'test-pending', 'test-owner/test-pending', 'pending')
      RETURNING id
    `, [userId]);
    const pendingRepoId = repoInsertPending.rows[0].id;

    const resPending = await request(app)
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        repoId: pendingRepoId,
      });
    expect(resPending.status).toBe(409);
    expect(resPending.body.code).toBe('REPO_NOT_INDEXED');
  });

  test('3. GET /api/v1/chat/:repoId/conversations -> lists conversations', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/${repoId}/conversations`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(conversationId);
  });

  test('4. POST /api/v1/chat/conversations/:id/chat -> streams SSE response with delta chunks', async () => {
    const res = await request(app)
      .post(`/api/v1/chat/conversations/${conversationId}/chat`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        message: 'who made the most commits?',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/event-stream');

    const bodyText = res.text;
    expect(bodyText).toContain('data: {"type":"delta","text":"Mock "}');
    expect(bodyText).toContain('data: {"type":"delta","text":"streaming "}');
    expect(bodyText).toContain('data: {"type":"delta","text":"response"}');
    expect(bodyText).toContain('data: {"type":"done"}');

    // Verify conversation title is now set
    const convDb = await query<{ title: string }>(`
      SELECT title FROM chat_conversations WHERE id = $1
    `, [conversationId]);
    expect(convDb.rows[0].title).toBe('Mock Conversation Title');
  });

  test('5. GET /api/v1/chat/conversations/:id/messages -> returns user and assistant messages with context_shas', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);

    const userMsg = res.body.find((m: any) => m.role === 'user');
    const assistantMsg = res.body.find((m: any) => m.role === 'assistant');

    expect(userMsg).toBeDefined();
    expect(userMsg.content).toBe('who made the most commits?');
    expect(userMsg.context_shas).toEqual(['abcdef1234567890abcdef1234567890abcdef12']);

    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toBe('Mock streaming response');
    expect(assistantMsg.context_shas).toEqual(['abcdef1234567890abcdef1234567890abcdef12']);

    messageId = assistantMsg.id;
  });

  test('6. POST /api/v1/chat/messages/:id/feedback -> records feedback', async () => {
    const res = await request(app)
      .post(`/api/v1/chat/messages/${messageId}/feedback`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        feedback: 'positive',
        detail: { reason: 'great answer' },
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Feedback recorded');

    // Verify feedback is saved in DB
    const msgDb = await query<{ feedback: string; feedback_detail: any }>(`
      SELECT feedback, feedback_detail FROM chat_messages WHERE id = $1
    `, [messageId]);
    expect(msgDb.rows[0].feedback).toBe('positive');
    expect(msgDb.rows[0].feedback_detail).toEqual({ reason: 'great answer' });
  });

  test('7. DELETE /api/v1/chat/conversations/:id -> soft deletes a conversation', async () => {
    const res = await request(app)
      .delete(`/api/v1/chat/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Conversation deleted');

    // Verify it is not returned in listing
    const resList = await request(app)
      .get(`/api/v1/chat/${repoId}/conversations`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resList.body.length).toBe(0);

    // Verify deleted_at is set
    const convDb = await query<{ deleted_at: string | null }>(`
      SELECT deleted_at FROM chat_conversations WHERE id = $1
    `, [conversationId]);
    expect(convDb.rows[0].deleted_at).not.toBeNull();
  });
});
