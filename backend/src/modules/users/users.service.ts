import { query } from '../../config/db';
import { NotFoundError, ValidationError } from '../../errors';
import { getPineconeIndex } from '../../config/pinecone';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  github_username: string | null;
  role: string;
  email_verified: boolean;
  created_at: Date;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const res = await query<any>(`
    SELECT id, email, display_name, avatar_url, github_username, role, email_verified, created_at 
    FROM users 
    WHERE id = $1 AND deleted_at IS NULL
  `, [userId]);

  if (res.rows.length === 0) {
    throw new NotFoundError('User not found');
  }

  const row = res.rows[0];
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    github_username: row.github_username,
    role: row.role,
    email_verified: row.email_verified,
    created_at: row.created_at,
  };
}

export async function updateUserProfile(
  userId: string,
  updates: { displayName?: string; avatarUrl?: string }
): Promise<UserProfile> {
  // 1. Validation
  if (updates.displayName !== undefined) {
    if (updates.displayName.trim().length < 2) {
      throw new ValidationError('Display name must be at least 2 characters');
    }
  }

  // 2. Fetch current user to use values as defaults if not provided in updates
  const currentUser = await getUserProfile(userId);

  const newDisplayName = updates.displayName !== undefined ? updates.displayName.trim() : currentUser.display_name;
  const newAvatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl.trim() : currentUser.avatar_url;

  // 3. Update profile
  await query(`
    UPDATE users 
    SET display_name = $1, avatar_url = $2, updated_at = NOW() 
    WHERE id = $3 AND deleted_at IS NULL
  `, [newDisplayName, newAvatarUrl, userId]);

  return getUserProfile(userId);
}

export async function deleteAccount(userId: string): Promise<void> {
  // 1. Soft delete user
  await query(`
    UPDATE users 
    SET deleted_at = NOW(), updated_at = NOW() 
    WHERE id = $1 AND deleted_at IS NULL
  `, [userId]);

  // 2. Revoke all user sessions
  await query(`
    UPDATE user_sessions 
    SET revoked_at = NOW() 
    WHERE user_id = $1 AND revoked_at IS NULL
  `, [userId]);

  // 3. Fetch all repositories owned by the user
  const reposRes = await query<{ id: string }>(`
    SELECT id FROM repositories WHERE user_id = $1 AND deleted_at IS NULL
  `, [userId]);

  // 4. Clean up Pinecone vectors for each repository
  for (const repo of reposRes.rows) {
    try {
      const pineconeIndex = getPineconeIndex();
      await pineconeIndex.namespace(repo.id).deleteAll();
    } catch (err) {
      console.error(`Failed to purge Pinecone namespace for repo ${repo.id} during user account deletion:`, err);
    }
  }
}
