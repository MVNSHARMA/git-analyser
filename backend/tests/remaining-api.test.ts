import 'dotenv/config';

// Define required env vars
process.env.PINECONE_API_KEY = 'mock-key';
process.env.PINECONE_INDEX = 'mock-index';
process.env.ENCRYPTION_KEY = '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f';

import request from 'supertest';
import { createApp } from '../src/app';
import { query } from '../src/config/db';
import redisClient from '../src/config/redis';
import { signAccessToken } from '../src/services/jwt';
import { encryptAES } from '../src/services/crypto';

// Mock Pinecone
jest.mock('../src/config/pinecone', () => {
  const mockNamespace = {
    deleteAll: jest.fn().mockResolvedValue({}),
  };
  return {
    getPineconeIndex: jest.fn().mockReturnValue({
      namespace: jest.fn().mockReturnValue(mockNamespace),
    }),
  };
});

const app = createApp();

describe('Git Analyser Remaining REST API Integration Tests (Phase 6)', () => {
  let userId: string;
  let accessToken: string;
  let repoId: string;
  let contributorId: string;
  let notificationId: string;
  let branchIdMain: string;
  let branchIdDevelop: string;
  let commitId1: string;
  let commitId2: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';

    // Cleanup existing data
    await query('DELETE FROM users WHERE email = $1', ['remaining_user@test.com']);
    await redisClient.flushall();

    // Create user
    const encryptedToken = encryptAES('ghp_mocktoken123456789');
    const userInsert = await query<{ id: string }>(`
      INSERT INTO users (email, password_hash, display_name, email_verified, github_access_token, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, ['remaining_user@test.com', 'dummy_hash', 'Remaining User', true, encryptedToken, 'user']);
    userId = userInsert.rows[0].id;

    // Create a dummy session for testing revocation
    await query(`
      INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
      VALUES ($1, 'dummy_session_refresh_hash', NOW() + INTERVAL '1 day')
    `, [userId]);

    // Create JWT
    accessToken = signAccessToken({ userId, email: 'remaining_user@test.com', role: 'user', sessionId: 'dummy_session' });

    // Create repo
    const repoInsert = await query<{ id: string }>(`
      INSERT INTO repositories (user_id, github_repo_id, owner, name, full_name, display_name, indexing_status, default_branch)
      VALUES ($1, 999111, 'test-owner', 'test-repo', 'test-owner/test-repo', 'Test Repo', 'ready', 'main')
      RETURNING id
    `, [userId]);
    repoId = repoInsert.rows[0].id;

    // Create branches
    const bMain = await query<{ id: string }>(`
      INSERT INTO branches (repository_id, name, head_sha, is_default)
      VALUES ($1, 'main', '1111111111111111111111111111111111111111', true)
      RETURNING id
    `, [repoId]);
    branchIdMain = bMain.rows[0].id;

    const bDevelop = await query<{ id: string }>(`
      INSERT INTO branches (repository_id, name, head_sha, is_default)
      VALUES ($1, 'develop', '2222222222222222222222222222222222222222', false)
      RETURNING id
    `, [repoId]);
    branchIdDevelop = bDevelop.rows[0].id;

    // Create contributor
    const contributorInsert = await query<{ id: string }>(`
      INSERT INTO contributors (repository_id, primary_email, display_name, github_username, total_commits)
      VALUES ($1, 'c1@test.com', 'Contributor One', 'contributor1', 15)
      RETURNING id
    `, [repoId]);
    contributorId = contributorInsert.rows[0].id;

    // Create commits
    const c1 = await query<{ id: string }>(`
      INSERT INTO commits (repository_id, contributor_id, sha, short_sha, message, message_subject, author_name, author_email, committed_at, additions, deletions, files_changed_count)
      VALUES ($1, $2, '1111111111111111111111111111111111111111', '1111111', 'Initial commit message fix', 'Initial commit message fix', 'Contributor One', 'c1@test.com', NOW() - INTERVAL '2 days', 50, 10, 3)
      RETURNING id
    `, [repoId, contributorId]);
    commitId1 = c1.rows[0].id;

    const c2 = await query<{ id: string }>(`
      INSERT INTO commits (repository_id, contributor_id, sha, short_sha, message, message_subject, author_name, author_email, committed_at, additions, deletions, files_changed_count)
      VALUES ($1, $2, '2222222222222222222222222222222222222222', '2222222', 'Feature auth implementation', 'Feature auth implementation', 'Contributor One', 'c1@test.com', NOW() - INTERVAL '1 days', 150, 20, 5)
      RETURNING id
    `, [repoId, contributorId]);
    commitId2 = c2.rows[0].id;

    // Associate commits to branches
    await query(`
      INSERT INTO commit_branches (commit_id, branch_id)
      VALUES ($1, $2)
    `, [commitId1, branchIdMain]);

    await query(`
      INSERT INTO commit_branches (commit_id, branch_id)
      VALUES ($1, $2)
    `, [commitId2, branchIdDevelop]);

    // Create commit diffs to trigger potential conflict files detection
    await query(`
      INSERT INTO commit_diffs (commit_id, diff_json)
      VALUES ($1::UUID, $2::JSONB)
    `, [commitId1, JSON.stringify([{ filename: 'src/conflict.ts' }, { filename: 'README.md' }])]);

    await query(`
      INSERT INTO commit_diffs (commit_id, diff_json)
      VALUES ($1::UUID, $2::JSONB)
    `, [commitId2, JSON.stringify([{ filename: 'src/conflict.ts' }, { filename: 'package.json' }])]);

    // Create notifications
    const notifInsert = await query<{ id: string }>(`
      INSERT INTO notifications (user_id, type, title, body, repo_id)
      VALUES ($1, 'indexing_completed', 'Indexing Success', 'Repository has been successfully indexed', $2)
      RETURNING id
    `, [userId, repoId]);
    notificationId = notifInsert.rows[0].id;

    // Create indexing job
    await query(`
      INSERT INTO indexing_jobs (repository_id, triggered_by, status, stage, progress, commits_indexed, started_at)
      VALUES ($1, $2, 'completed', 'seal', 100, 2, NOW())
    `, [repoId, userId]);
  });

  afterAll(async () => {
    // Delete user cascades to everything
    await query('DELETE FROM users WHERE id = $1', [userId]);
    await redisClient.flushall();

    const { pool } = require('../src/config/db');
    await pool.end();
    await redisClient.quit();
  });

  // --- Contributors Tests ---
  test('1. GET /api/v1/repos/:repoId/contributors -> lists contributors', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/contributors`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(contributorId);
    expect(res.body[0].display_name).toBe('Contributor One');
  });

  test('2. GET /api/v1/repos/:repoId/contributors/stats -> gets contributor statistics', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/contributors/stats`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(contributorId);
    expect(res.body[0].commits_last_7_days).toBe(2);
  });

  test('3. GET /api/v1/repos/:repoId/contributors/:contributorId -> gets single contributor details', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/contributors/${contributorId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(contributorId);
    expect(res.body.primary_email).toBe('c1@test.com');
  });

  test('4. GET /api/v1/repos/:repoId/contributors/:contributorId/commits -> gets contributor commits', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/contributors/${contributorId}/commits`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });

  // --- Commits Tests ---
  test('5. GET /api/v1/repos/:repoId/commits -> gets paginated commits list', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/commits?limit=10&offset=0`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('commits');
    expect(res.body).toHaveProperty('total');
    expect(res.body.total).toBe(2);
    expect(res.body.commits.length).toBe(2);
  });

  test('6. GET /api/v1/repos/:repoId/commits with filters -> gets filtered commits list', async () => {
    // Branch filter
    const resBranch = await request(app)
      .get(`/api/v1/repos/${repoId}/commits?branch=main`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resBranch.status).toBe(200);
    expect(resBranch.body.total).toBe(1);
    expect(resBranch.body.commits[0].sha).toBe('1111111111111111111111111111111111111111');

    // Author filter
    const resAuthor = await request(app)
      .get(`/api/v1/repos/${repoId}/commits?author=Contributor`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resAuthor.status).toBe(200);
    expect(resAuthor.body.total).toBe(2);

    // Search filter
    const resSearch = await request(app)
      .get(`/api/v1/repos/${repoId}/commits?search=fix`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(resSearch.status).toBe(200);
    expect(resSearch.body.total).toBe(1);
    expect(resSearch.body.commits[0].sha).toBe('1111111111111111111111111111111111111111');
  });

  test('7. GET /api/v1/repos/:repoId/commits/activity -> gets recent activity by day', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/commits/activity?days=30`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('commit_count');
    expect(res.body[0]).toHaveProperty('active_contributors');
  });

  test('8. GET /api/v1/repos/:repoId/commits/:sha -> gets commit detail and diffs', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/commits/1111111111111111111111111111111111111111`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.sha).toBe('1111111111111111111111111111111111111111');
    expect(res.body.contributor_github_username).toBe('contributor1');
    expect(Array.isArray(res.body.diffs)).toBe(true);
    expect(res.body.diffs.length).toBe(2);
    expect(res.body.diffs[0].filename).toBe('src/conflict.ts');
  });

  // --- Branches Tests ---
  test('9. GET /api/v1/repos/:repoId/branches -> lists all branches', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/branches`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe('main'); // default branch first
  });

  test('10. GET /api/v1/repos/:repoId/branches/:branchName -> gets branch by name', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/branches/develop`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('develop');
    expect(res.body.head_sha).toBe('2222222222222222222222222222222222222222');
  });

  test('11. GET /api/v1/repos/:repoId/branches/compare -> compare branches and detects conflicts', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/branches/compare?base=main&head=develop`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.base).toBe('main');
    expect(res.body.head).toBe('develop');
    expect(res.body.commitsAhead).toBe(1); // c2 is unique to develop
    expect(res.body.commitsBehind).toBe(1); // c1 is unique to main
    expect(res.body.potentialConflictFiles).toEqual(['src/conflict.ts']);
    expect(res.body.conflictRisk).toBe('medium');
  });

  // --- Notifications Tests ---
  test('12. GET /api/v1/notifications -> lists notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].id).toBe(notificationId);
  });

  test('13. GET /api/v1/notifications/unread-count -> gets unread notifications count', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });

  test('14. PATCH /api/v1/notifications/:id/read -> marks a single notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Marked as read');

    // Count is now 0
    const checkRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(checkRes.body.count).toBe(0);
  });

  test('15. PATCH /api/v1/notifications/read-all -> marks all notifications as read', async () => {
    // Reset notification to unread
    await query('UPDATE notifications SET read_at = NULL WHERE id = $1', [notificationId]);

    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All marked as read');

    // Count is 0
    const checkRes = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(checkRes.body.count).toBe(0);
  });

  // --- Users Profile Tests ---
  test('16. GET /api/v1/users/me -> gets authenticated user profile without sensitive fields', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('remaining_user@test.com');
    expect(res.body.display_name).toBe('Remaining User');
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.body).not.toHaveProperty('github_access_token');
  });

  test('17. PATCH /api/v1/users/me -> updates user profile details', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        displayName: 'Updated Name',
        avatarUrl: 'https://avatar.url/new.png',
      });

    expect(res.status).toBe(200);
    expect(res.body.display_name).toBe('Updated Name');
    expect(res.body.avatar_url).toBe('https://avatar.url/new.png');
  });

  // --- Indexing Status Tests ---
  test('18. GET /api/v1/repos/:repoId/indexing/status -> gets indexing job status', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/indexing/status`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
    expect(res.body.stage).toBe('seal');
    expect(res.body.progress).toBe(100);
  });

  test('19. GET /api/v1/repos/:repoId/indexing/history -> gets repository indexing history list', async () => {
    const res = await request(app)
      .get(`/api/v1/repos/${repoId}/indexing/history`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].status).toBe('completed');
  });

  // --- Account Deletion Tests ---
  test('20. DELETE /api/v1/users/me -> soft deletes user, revokes sessions, and purges Pinecone namespace', async () => {
    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Account deleted');

    // Verify user is soft deleted in DB
    const userDb = await query<{ deleted_at: any }>(`
      SELECT deleted_at FROM users WHERE id = $1
    `, [userId]);
    expect(userDb.rows[0].deleted_at).not.toBeNull();

    // Verify all sessions are revoked
    const sessionsDb = await query<{ revoked_at: any }>(`
      SELECT revoked_at FROM user_sessions WHERE user_id = $1
    `, [userId]);
    expect(sessionsDb.rows[0].revoked_at).not.toBeNull();
  });
});
