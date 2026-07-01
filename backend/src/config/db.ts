import { Pool, PoolClient } from 'pg';

let poolInstance: Pool | null = null;

function createPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  const newPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    // Docker's virtualized networking (esp. Docker Desktop on Windows) can silently drop
    // idle TCP connections at the NAT/conntrack layer without either side seeing a FIN/RST,
    // leaving the pool holding sockets that look alive but are actually dead. TCP keepalive
    // probes let the OS detect and recycle these before a real query hits the dead socket.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
  // Without this handler, an error on an idle client (e.g. the connection being reset by
  // the network layer) is an unhandled 'error' event, which can crash the process entirely.
  newPool.on('error', (err) => {
    console.error('⚠️  Unexpected error on idle Postgres client:', err.message);
  });
  return newPool;
}

export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool();
  }
  return poolInstance;
}

function isStaleConnectionError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('timeout exceeded when trying to connect');
}

/**
 * Discards the current pool and replaces it with a fresh one. Observed in this environment:
 * new connection attempts (not just idle reuse) start timing out after the process has been
 * running a while, even though Postgres itself is reachable — recreating the Pool with fresh
 * sockets resolves it exactly like restarting the process does, just without the restart.
 */
function recreatePool(): void {
  const stale = poolInstance;
  poolInstance = createPool();
  if (stale) {
    stale.end().catch(() => {});
  }
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
  try {
    const result = await pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } catch (err) {
    if (!isStaleConnectionError(err)) throw err;
    recreatePool();
    const result = await pool.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  }
}

/**
 * Acquire a client for manual transaction control.
 * Always release in a finally block.
 */
export async function getClient(): Promise<PoolClient> {
  try {
    return await pool.connect();
  } catch (err) {
    if (!isStaleConnectionError(err)) throw err;
    recreatePool();
    return pool.connect();
  }
}

/**
 * Run a set of queries inside a transaction.
 * Automatically commits on success, rolls back on error.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
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
