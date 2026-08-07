import "server-only";

import { checkRateLimit as inMemoryCheck } from "@/lib/lead-ingestion/rate-limit";

export interface RateLimiter {
  checkLimit(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  };
}

function createInMemoryRateLimiter(): RateLimiter {
  return { checkLimit: inMemoryCheck };
}

function createRedisRateLimiter(): RateLimiter | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  // Upstash Redis / Redis stub — returns null if not available
  // Production: replace with actual @upstash/redis implementation
  return null;
}

export function getRateLimiter(): RateLimiter {
  const env = process.env.RATE_LIMITER ?? "memory";

  if (env === "redis") {
    const redis = createRedisRateLimiter();
    if (redis) return redis;
    console.warn(
      "[RateLimiter] Redis configured but unavailable, falling back to in-memory",
    );
  }

  return createInMemoryRateLimiter();
}

export { checkRateLimit as inMemoryRateLimit } from "@/lib/lead-ingestion/rate-limit";
