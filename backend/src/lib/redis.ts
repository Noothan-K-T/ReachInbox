import Redis from 'ioredis';
import { config } from '../config';

/**
 * Create a Redis connection.
 * Supports both:
 *   - REDIS_URL (for hosted services like Upstash with TLS)
 *   - REDIS_HOST + REDIS_PORT (for local Docker/dev)
 */
function createRedisClient(): Redis {
  if (config.redis.url) {
    return new Redis(config.redis.url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      tls: config.redis.url.startsWith('rediss://') ? {} : undefined,
    });
  }

  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
}

export const redis = createRedisClient();

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

/**
 * Redis connection options for BullMQ queues and workers.
 * BullMQ creates its own connections internally.
 */
export function getRedisConnectionOptions() {
  if (config.redis.url) {
    return {
      url: config.redis.url,
      tls: config.redis.url.startsWith('rediss://') ? {} : undefined,
      maxRetriesPerRequest: null,
    } as any;
  }

  return {
    host: config.redis.host,
    port: config.redis.port,
  };
}

// Keep backward-compatible export
export const redisConnection = getRedisConnectionOptions();
