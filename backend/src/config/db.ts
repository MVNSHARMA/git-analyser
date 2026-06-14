import { Pool, PoolClient } from 'pg';

let poolInstance: Pool | null = null;

export function getPool(): Pool {
  if (!poolInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    poolInstance = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return poolInstance;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined;
    return Reflect.get(getPool(), prop, receiver);
  }
});

/**
 * Execute a parameterised query.
 * Usage: query('SELECT * FROM users WHERE id = $1', [userId])
 */
export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const result = await pool.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount };
}

/**
 * Acquire a client for manual transaction control.
 * Always release in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Run a set of queries inside a transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Test the database connection on startup.
 * Throws a fatal error if the DB is unreachable.
 */
export async function testConnection(): Promise<void> {
  try {
    const { rows } = await query<{ now: string }>('SELECT NOW() AS now');
    console.log(`✅ Database connected — server time: ${rows[0].now}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  }
}
