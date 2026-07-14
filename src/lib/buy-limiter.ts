import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

export const buyAttemptLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'), // 5 attempts per 10s per identity
  analytics: true,
});
