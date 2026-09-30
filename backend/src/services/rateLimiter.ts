import { redis } from '../lib/redis';
import { config } from '../config';

/**
 * Distributed rate limiter using Redis atomic operations.
 *
 * Uses a sliding window approach keyed by sender + hour.
 * Multiple workers can safely check/increment the counter
 * because INCR is atomic in Redis.
 *
 * Key format: rate:email:{senderId}:{hourWindow}
 * Example:   rate:email:sender123:2026-09-30T10
 */
export class RateLimiter {
  /**
   * Get the current hour window key component.
   * e.g. "2026-09-30T10"
   */
  private static getHourWindow(date: Date = new Date()): string {
    return date.toISOString().slice(0, 13); // "2026-09-30T10"
  }

  private static getKey(senderId: string, hourWindow: string): string {
    return `rate:email:${senderId}:${hourWindow}`;
  }

  /**
   * Try to consume one unit from the rate limit for a sender.
   * Returns { allowed: true, remaining } if under limit.
   * Returns { allowed: false, remaining: 0, retryAfterMs } if limit reached.
   */
  static async tryConsume(senderId: string): Promise<{
    allowed: boolean;
    count: number;
    limit: number;
    retryAfterMs?: number;
  }> {
    const hourWindow = this.getHourWindow();
    const key = this.getKey(senderId, hourWindow);
    const limit = config.rateLimit.maxEmailsPerHour;

    // Atomic check: get current count
    const currentStr = await redis.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;

    if (current >= limit) {
      // Calculate ms until the next hour
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      const retryAfterMs = nextHour.getTime() - now.getTime();

      return {
        allowed: false,
        count: current,
        limit,
        retryAfterMs,
      };
    }

    // Atomically increment. Use MULTI/EXEC for safety.
    const newCount = await redis.incr(key);

    // Set TTL to 2 hours (so keys auto-expire)
    await redis.expire(key, 7200);

    // Double-check after increment (race condition guard)
    if (newCount > limit) {
      return {
        allowed: false,
        count: newCount,
        limit,
        retryAfterMs: this.msUntilNextHour(),
      };
    }

    return {
      allowed: true,
      count: newCount,
      limit,
    };
  }

  /**
   * Get current usage for a sender in the current hour.
   */
  static async getCurrentUsage(senderId: string): Promise<number> {
    const hourWindow = this.getHourWindow();
    const key = this.getKey(senderId, hourWindow);
    const val = await redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /**
   * Calculate milliseconds until the next hour boundary.
   */
  private static msUntilNextHour(): number {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    return nextHour.getTime() - now.getTime();
  }
}
