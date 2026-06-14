import crypto from 'crypto';
import axios from 'axios';
import { query, withTransaction } from '../../config/db';
import { hashPassword, comparePassword, hashToken, encryptAES } from '../../services/crypto';
import { signAccessToken, signRefreshToken } from '../../services/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../services/email';
import { ConflictError, AuthError, ForbiddenError } from '../../errors';

export interface UserResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
}

export interface SessionResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

/**
 * Register a new user with email and password.
 * Checks for email conflicts, hashes the password, records the verification token, and sends an email.
 */
export async function registerWithEmail({
  email,
  password,
  displayName,
}: Record<string, string>): Promise<{ userId: string; email: string }> {
  // Check if email already exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new ConflictError('Email already registered');
  }

  const hashedPassword = await hashPassword(password);
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  return withTransaction(async (client) => {
    // 1. Insert user
    const userResult = await client.query(`
      INSERT INTO users (email, password_hash, display_name, role)
      VALUES ($1, $2, $3, 'user')
      RETURNING id
    `, [email, hashedPassword, displayName]);
    const userId = userResult.rows[0].id as string;

    // 2. Insert email verification token
    await client.query(`
      INSERT INTO email_verifications (user_id, token_hash, type, expires_at)
      VALUES ($1, $2, 'verify_email', NOW() + INTERVAL '24 hours')
    `, [userId, tokenHash]);

    // 3. Trigger email delivery (logs to console in dev)
    await sendVerificationEmail(email, rawToken);

    return { userId, email };
  });
}

/**
 * Verify a user's email address using a raw token.
 */
export async function verifyEmail(rawToken: string): Promise<{ success: boolean }> {
  const tokenHash = hashToken(rawToken);

  // Find verification record
  const result = await query(`
    SELECT id, user_id FROM email_verifications
    WHERE token_hash = $1 AND type = 'verify_email' AND used_at IS NULL AND expires_at > NOW()
  `, [tokenHash]);

  if (result.rows.length === 0) {
    throw new AuthError('TOKEN_INVALID', 'Invalid or expired verification token');
  }

  const { id: verificationId, user_id: userId } = result.rows[0] as { id: string; user_id: string };

  await withTransaction(async (client) => {
    // 1. Mark verification token as used
    await client.query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [verificationId]);
    
    // 2. Set user as verified
    await client.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
  });

  return { success: true };
}

/**
 * Log in a user with email and password.
 */
export async function loginWithEmail({ email, password }: Record<string, string>): Promise<LoginResult> {
  const result = await query(`
    SELECT id, password_hash, display_name, role, avatar_url, email_verified 
    FROM users 
    WHERE email = $1 AND deleted_at IS NULL
  `, [email]);

  if (result.rows.length === 0) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const user = result.rows[0] as {
    id: string;
    password_hash: string | null;
    display_name: string;
    role: string;
    avatar_url: string | null;
    email_verified: boolean;
  };

  // Check if account is verified
  if (!user.email_verified) {
    throw new ForbiddenError('Email not verified', 'EMAIL_NOT_VERIFIED');
  }

  // Handle users created via GitHub OAuth without a password hash
  if (!user.password_hash) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Compare passwords
  const isMatch = await comparePassword(password, user.password_hash);
  if (!isMatch) {
    throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
  }

  // Create session and issue tokens
  const session = await createSession(user.id);

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      email,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    },
  };
}

/**
 * Create a session for a user, record the refresh token, and sign an access token.
 */
export async function createSession(userId: string): Promise<SessionResult> {
  // Get user info for token payload
  const userResult = await query(
    'SELECT id, email, role FROM users WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );
  if (!userResult.rows[0]) throw new AuthError('TOKEN_INVALID', 'User does not exist');
  const { email, role } = userResult.rows[0] as { email: string; role: string };

  const rawRefreshToken = signRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);

  const sessionResult = await query(`
    INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '30 days')
    RETURNING id
  `, [userId, refreshTokenHash]);
  const sessionId = sessionResult.rows[0].id as string;

  const accessToken = signAccessToken({ userId, email, role, sessionId });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId,
  };
}

/**
 * Refresh user session using a raw refresh token.
 * Performs rotation: invalidates the old token and issues a new one.
 */
export async function refreshSession(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const currentHash = hashToken(rawRefreshToken);

  return withTransaction(async (client) => {
    // Find active session
    const sessionResult = await client.query(`
      SELECT us.id AS session_id, us.user_id, u.email, u.role
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.refresh_token_hash = $1 AND us.revoked_at IS NULL AND us.expires_at > NOW()
    `, [currentHash]);

    if (sessionResult.rows.length === 0) {
      throw new AuthError('TOKEN_INVALID', 'Invalid or expired refresh token');
    }

    const { session_id: sessionId, user_id: userId, email, role } = sessionResult.rows[0] as {
      session_id: string;
      user_id: string;
      email: string;
      role: string;
    };

    // Rotate refresh token
    const newRawRefreshToken = signRefreshToken();
    const newHash = hashToken(newRawRefreshToken);

    await client.query(`
      UPDATE user_sessions
      SET refresh_token_hash = $1, expires_at = NOW() + INTERVAL '30 days'
      WHERE id = $2
    `, [newHash, sessionId]);

    const newAccessToken = signAccessToken({ userId, email, role, sessionId });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  });
}

/**
 * Revoke session using raw refresh token.
 */
export async function revokeSession(rawRefreshToken: string): Promise<{ success: boolean }> {
  const tokenHash = hashToken(rawRefreshToken);
  
  await query(`
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE refresh_token_hash = $1
  `, [tokenHash]);

  return { success: true };
}

/**
 * Handle GitHub OAuth login/callback flow.
 * Exchanges the code, gets profile info, upserts user, and returns session tokens.
 */
export async function handleGithubOAuth(code: string): Promise<LoginResult> {
  // Step 1: Exchange code for access token
  const tokenResponse = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    { headers: { Accept: 'application/json' } }
  );
  const accessToken = tokenResponse.data.access_token;
  if (!accessToken) throw new AuthError('GITHUB_TOKEN_INVALID');

  // Step 2: Get GitHub user profile
  const userResponse = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const githubUser = userResponse.data;

  // Step 3: Get primary email
  const emailsResponse = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const primaryEmail = emailsResponse.data.find((e: any) => e.primary)?.email || githubUser.email;
  if (!primaryEmail) throw new AuthError('GITHUB_TOKEN_INVALID');

  const encryptedToken = encryptAES(accessToken);
  const displayName = githubUser.name || githubUser.login;
  const avatarUrl = githubUser.avatar_url;
  const githubId = githubUser.id;
  const githubUsername = githubUser.login;

  // Step 4: Check if user exists by github_id first, then by email
  let userId: string;

  const existingByGithubId = await query<{ id: string }>(
    'SELECT id FROM users WHERE github_id = $1 AND deleted_at IS NULL',
    [githubId]
  );

  if (existingByGithubId.rows[0]) {
    // User exists — update their token
    userId = existingByGithubId.rows[0].id;
    await query(
      `UPDATE users SET 
        github_access_token = $1,
        avatar_url = $2,
        github_username = $3,
        updated_at = now()
       WHERE id = $4`,
      [encryptedToken, avatarUrl, githubUsername, userId]
    );
  } else {
    // Check by email
    const existingByEmail = await query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL',
      [primaryEmail]
    );

    if (existingByEmail.rows[0]) {
      // Link GitHub to existing email account
      userId = existingByEmail.rows[0].id;
      await query(
        `UPDATE users SET
          github_id = $1,
          github_access_token = $2,
          github_username = $3,
          avatar_url = $4,
          email_verified = true,
          updated_at = now()
         WHERE id = $5`,
        [githubId, encryptedToken, githubUsername, avatarUrl, userId]
      );
    } else {
      // Create new user
      const insertResult = await query<{ id: string }>(
        `INSERT INTO users (
          email, display_name, avatar_url, github_id, github_username,
          github_access_token, email_verified, role
        ) VALUES ($1, $2, $3, $4, $5, $6, true, 'user')
        RETURNING id`,
        [primaryEmail, displayName, avatarUrl, githubId, githubUsername, encryptedToken]
      );
      userId = insertResult.rows[0].id;
    }
  }

  // Step 5: Create session
  const session = await createSession(userId);

  // Step 6: Get user profile for response
  const userResult = await query<{ id: string; email: string; display_name: string; role: string; avatar_url: string }>(
    'SELECT id, email, display_name, role, avatar_url FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      avatarUrl: user.avatar_url,
    },
  };
}

/**
 * Handle forgot password request: generate token, store, and send email.
 * Always returns void/silently even if user is not found to prevent enumeration.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const result = await query('SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
  if (result.rows.length === 0) {
    // Return early to prevent enumeration
    return;
  }

  const userId = result.rows[0].id as string;
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);

  await withTransaction(async (client) => {
    // Invalidate existing reset tokens for this user
    await client.query(`
      UPDATE email_verifications 
      SET used_at = NOW() 
      WHERE user_id = $1 AND type = 'reset_password' AND used_at IS NULL
    `, [userId]);

    // Insert new reset token (expires in 1 hour)
    await client.query(`
      INSERT INTO email_verifications (user_id, token_hash, type, expires_at)
      VALUES ($1, $2, 'reset_password', NOW() + INTERVAL '1 hour')
    `, [userId, tokenHash]);

    await sendPasswordResetEmail(email, rawToken);
  });
}

/**
 * Reset a user's password using a raw token.
 * Returns the updated user details so we can do an auto-login.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<UserResponse> {
  const tokenHash = hashToken(rawToken);

  // Find valid token
  const result = await query(`
    SELECT id, user_id FROM email_verifications
    WHERE token_hash = $1 AND type = 'reset_password' AND used_at IS NULL AND expires_at > NOW()
  `, [tokenHash]);

  if (result.rows.length === 0) {
    throw new AuthError('TOKEN_INVALID', 'Invalid or expired password reset token');
  }

  const { id: verificationId, user_id: userId } = result.rows[0] as { id: string; user_id: string };
  const hashedPassword = await hashPassword(newPassword);

  return withTransaction(async (client) => {
    // 1. Mark verification token as used
    await client.query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [verificationId]);

    // 2. Update user password
    const userResult = await client.query(`
      UPDATE users
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, role, display_name, avatar_url
    `, [hashedPassword, userId]);

    if (userResult.rows.length === 0) {
      throw new AuthError('TOKEN_INVALID', 'User does not exist');
    }

    const updatedUser = userResult.rows[0] as { id: string; email: string; role: string; display_name: string; avatar_url: string | null };
    return {
      id: updatedUser.id,
      email: updatedUser.email,
      displayName: updatedUser.display_name,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatar_url,
    };
  });
}
