/**
 * Upstash Redis-backed sliding window rate limiter.
 *
 * Replaces the previous in-memory Map implementation which reset on every
 * serverless cold start, making it ineffective on multi-instance deployments
 * (Vercel, AWS Lambda, etc.).
 *
 * Uses the same Redis client already configured in src/lib/redis.ts.
 * Reuses the same @upstash/ratelimit package used in buy-limiter.ts.
 *
 * Interface is intentionally identical to the old in-memory version so callers
 * in middleware.ts do not need to change.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Seconds until limit resets
}

// Cache limiter instances per (limit, windowSeconds) combo to avoid
// creating a new Ratelimit object on every middleware invocation.
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${limit}:${windowSeconds}`;
  if (limiterCache.has(cacheKey)) {
    return limiterCache.get(cacheKey)!;
  }
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false, // keep it lightweight for middleware hot-path
    prefix: 'ratelimit', // namespaced under ratelimit:* in Redis
  });
  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Validates request counts against a Redis sliding window rate limit.
 * Drop-in replacement for the old in-memory rateLimit() function.
 *
 * @param key      Unique identifier (e.g. `ratelimit:1.2.3.4:/api/orders/track`)
 * @param limit    Maximum allowed requests within the window
 * @param windowMs Window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  const limiter = getLimiter(limit, windowSeconds);

  try {
    const result = await limiter.limit(key);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      // result.reset is a Unix timestamp in ms; convert to seconds from now
      reset: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
    };
  } catch (err) {
    // If Redis is unreachable, fail open rather than blocking all traffic.
    // The Redis stock-gate (stock-gate.ts) applies the same fail-open policy.
    console.error('[rateLimit] Upstash Redis error — failing open:', err);
    return {
      success: true,
      limit,
      remaining: 1,
      reset: windowSeconds,
    };
  }
}
