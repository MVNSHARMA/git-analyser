import Redis from 'ioredis';

let redisClientInstance: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClientInstance) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL environment variable is required');
    }
    redisClientInstance = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        // Exponential backoff: 100ms, 200ms, 400ms … capped at 10s
        const delay = Math.min(100 * Math.pow(2, times), 10000);
        console.warn(`⚠️  Redis reconnecting in ${delay}ms (attempt ${times})`);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClientInstance.on('connect', () => console.log('✅ Redis connected'));
    redisClientInstance.on('error', (err) => console.error('❌ Redis error:', err.message));
    redisClientInstance.on('reconnecting', () => console.warn('⚠️  Redis reconnecting…'));
  }
  return redisClientInstance;
}

export const redisClient = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    if (prop === 'then') return undefined;
    return Reflect.get(getRedisClient(), prop, receiver);
  }
});

// ─── Typed Helpers ────────────────────────────────────────────────────────────

export async function get(key: string): Promise<string | null> {
  return redisClient.get(key);
}

export async function set(
  key: string,
  value: string,
  ttlSeconds?: number
): Promise<void> {
  if (ttlSeconds !== undefined) {
    await redisClient.set(key, value, 'EX', ttlSeconds);
  } else {
    await redisClient.set(key, value);
  }
}

export async function del(key: string): Promise<void> {
  await redisClient.del(key);
}

export async function incr(key: string): Promise<number> {
  return redisClient.incr(key);
}

export async function expire(key: string, ttlSeconds: number): Promise<void> {
  await redisClient.expire(key, ttlSeconds);
}

export async function publish(channel: string, message: string): Promise<void> {
  await redisClient.publish(channel, message);
}

/**
 * Blocking left-pop — used by the queue worker to consume jobs.
 * Returns [listKey, value] or null on timeout.
 */
export async function blpop(
  key: string,
  timeoutSeconds: number
): Promise<[string, string] | null> {
  return redisClient.blpop(key, timeoutSeconds);
}

/**
 * Push a value onto the right end of a list (RPUSH).
 */
export async function rpush(key: string, value: string): Promise<void> {
  await redisClient.rpush(key, value);
}

/**
 * Subscribe to a Redis pub/sub channel.
 * Returns a dedicated subscriber client (must not be reused for commands).
 */
export function createSubscriber(): Redis {
  return redisClient.duplicate();
}

export async function testConnection(): Promise<void> {
  try {
    await redisClient.ping();
    console.log('✅ Redis ping OK');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    process.exit(1);
  }
}

export default redisClient;
