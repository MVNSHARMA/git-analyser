import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Hash a password using bcrypt with a cost factor of 12.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

/**
 * Compare a plain text password with a bcrypt hash.
 */
export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Generate a SHA-256 hash of a token as a hex string.
 */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Encrypt a text string using AES-256-GCM.
 * Prepend the IV (12 bytes) and auth tag (16 bytes) to the ciphertext.
 * Returns single hex string: iv (24 hex chars) + authTag (32 hex chars) + ciphertext (hex)
 */
export function encryptAES(text: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let ciphertext = cipher.update(text, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return iv.toString('hex') + authTag + ciphertext;
}

/**
 * Decrypt a single hex string (containing iv + authTag + ciphertext) using AES-256-GCM.
 */
export function decryptAES(encrypted: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  const key = Buffer.from(encryptionKey, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters)');
  }

  if (encrypted.length < 56) {
    throw new Error('Invalid encrypted payload: too short');
  }

  const iv = Buffer.from(encrypted.substring(0, 24), 'hex');
  const authTag = Buffer.from(encrypted.substring(24, 56), 'hex');
  const ciphertext = Buffer.from(encrypted.substring(56), 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
