import 'dotenv/config';
import request from 'supertest';
import { createApp } from '../src/app';
import { query } from '../src/config/db';
import redisClient from '../src/config/redis';
import { authenticate } from '../src/middleware/authenticate';
import { authRouter } from '../src/modules/auth/auth.routes';

const app = createApp();

// Dummy protected route registered on authRouter to run before the 404 handler
authRouter.get('/protected-test', authenticate, (req, res) => {
  res.status(200).json({ message: 'Success', user: req.user });
});

describe('Git Analyser Authentication System Integration Tests', () => {
  const testEmail = 'testuser@example.com';
  const testPassword = 'password123';
  const testDisplayName = 'Test User';
  
  const duplicateEmail = 'duplicate@example.com';

  beforeAll(async () => {
    // Ensure test environment
    process.env.NODE_ENV = 'test';
    
    // Clear any existing test data to ensure clean slate
    await query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail, duplicateEmail]);
    await redisClient.flushall();
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM users WHERE email IN ($1, $2)', [testEmail, duplicateEmail]);
    await redisClient.flushall();
    
    // Close DB Pool and Redis client connections
    const { pool } = require('../src/config/db');
    await pool.end();
    await redisClient.quit();
  });

  beforeEach(async () => {
    // Clear Redis rate limit keys before each test to isolate tests
    await redisClient.flushall();
  });

  // 1. POST /api/v1/auth/register with new email -> 201
  test('1. POST /register with new email -> 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      message: 'Check your email to verify your account',
    });

    // Verify user row exists in DB
    const dbRes = await query('SELECT id, email, email_verified FROM users WHERE email = $1', [testEmail]);
    expect(dbRes.rows.length).toBe(1);
    expect(dbRes.rows[0].email_verified).toBe(false);
  });

  // 2. POST /api/v1/auth/register with duplicate email -> 409
  test('2. POST /register with duplicate email -> 409', async () => {
    // Attempt duplicate registration
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'anotherpassword',
        displayName: 'Duplicate User',
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already registered');
    expect(res.body.code).toBe('CONFLICT');
  });

  // 3. POST /api/v1/auth/login with unverified email -> 403
  test('3. POST /login with unverified email -> 403', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('not verified');
    expect(res.body.code).toBe('EMAIL_NOT_VERIFIED');
  });

  // 4. POST /api/v1/auth/login with wrong password -> 401
  test('4. POST /login with wrong password -> 401', async () => {
    // Temporarily verify the email in the DB to test password failure
    await query('UPDATE users SET email_verified = true WHERE email = $1', [testEmail]);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
    expect(res.body.code).toBe('INVALID_CREDENTIALS');

    // Revert verification status
    await query('UPDATE users SET email_verified = false WHERE email = $1', [testEmail]);
  });

  // 5. POST /api/v1/auth/login with correct credentials (after manually setting email_verified=true) -> 200 + accessToken in body + cookie set
  test('5. POST /login with correct credentials -> 200 + tokens', async () => {
    // Manually verify email
    await query('UPDATE users SET email_verified = true WHERE email = $1', [testEmail]);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.displayName).toBe(testDisplayName);
    expect(res.body.user).not.toHaveProperty('password_hash');

    // Confirm HttpOnly cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refresh_token=');
    expect(cookies[0]).toContain('HttpOnly');
    expect(cookies[0].toLowerCase()).toContain('path=/api/v1/auth');
  });

  // 6. GET protected route with no token -> 401
  test('6. GET protected route with no token -> 401', async () => {
    const res = await request(app).get('/api/v1/auth/protected-test');
    
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorised');
    expect(res.body.code).toBe('AUTH_TOKEN_INVALID');
  });

  // 7. GET protected route with valid accessToken -> 200
  test('7. GET protected route with valid accessToken -> 200', async () => {
    // Login to get access token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .get('/api/v1/auth/protected-test')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Success');
    expect(res.body.user.email).toBe(testEmail);
  });

  // 8. POST /api/v1/auth/refresh with valid cookie -> 200 + new accessToken
  test('8. POST /refresh with valid cookie -> 200 + rotated token', async () => {
    // Login to get cookies
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });
    const cookies = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    
    const newCookies = res.headers['set-cookie'];
    expect(newCookies).toBeDefined();
    expect(newCookies[0]).toContain('refresh_token=');
  });

  // 9. POST /api/v1/auth/refresh with invalid/revoked token -> 401
  test('9. POST /refresh with invalid token -> 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=invalidtokenvalue; Path=/api/v1/auth; HttpOnly']);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  // 10. POST /api/v1/auth/logout -> 200 + cookie cleared
  test('10. POST /logout -> 200 + cookie cleared', async () => {
    // Login to get cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });
    const cookies = loginRes.headers['set-cookie'];
    const token = loginRes.body.accessToken;

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookies);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
    
    // Check cookie cleared (Max-Age=0 or Expires in past)
    const clearCookies = res.headers['set-cookie'];
    expect(clearCookies).toBeDefined();
    expect(clearCookies[0]).toMatch(/refresh_token=($|;)/);
  });

  // 11. POST /api/v1/auth/refresh after logout (old refresh token) -> 401
  test('11. POST /refresh after logout (revoked refresh token) -> 401', async () => {
    // Login to get token and cookie
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });
    const cookies = loginRes.headers['set-cookie'];
    const token = loginRes.body.accessToken;

    // Logout
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', cookies);

    // Try to refresh with the logged out cookie
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });

  // 12. POST /api/v1/auth/login 11 times rapidly -> 429 on 11th
  test('12. POST /login 11 times rapidly -> 429 on 11th', async () => {
    // We send 10 valid formatted login requests that should fail (with wrong password) to verify 429 limit on 11th
    const requests = Array.from({ length: 10 }, () =>
      request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword',
        })
    );

    const responses = await Promise.all(requests);
    
    // Verify first 10 were rejected due to credentials (401) and not rate-limited (429)
    for (const r of responses) {
      expect(r.status).toBe(401);
    }

    // 11th request should be blocked by rate limiter
    const rateLimitedRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'wrongpassword',
      });

    expect(rateLimitedRes.status).toBe(429);
    expect(rateLimitedRes.headers['retry-after']).toBe('60');
    expect(rateLimitedRes.body.code).toBe('TOO_MANY_REQUESTS');
  });
});
