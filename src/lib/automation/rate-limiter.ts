import "server-only";

export interface RateLimiter {
  checkLimit(
    key: string,
    limit?: number,
    windowMs?: number,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }>;
}

// In-memory store for Demo / Local
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const store = new Map<string, RateLimitEntry>();

export class InMemoryRateLimiter implements RateLimiter {
  async checkLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: limit - 1, retryAfter: 0 };
    }

    if (entry.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
  }
}

// Upstash Redis adapter using native fetch (No external dependency needed)
// READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT
export class UpstashRedisRateLimiter implements RateLimiter {
  private url: string;
  private token: string;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async checkLimit(
    key: string,
    limit: number = 100,
    windowMs: number = 60000,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  }> {
    const windowSeconds = Math.ceil(windowMs / 1000);
    // Simple fixed window rate limit using Redis Pipeline
    // 1. INCR key
    // 2. EXPIRE key windowSeconds (only if it was 1)

    try {
      const response = await fetch(`${this.url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSeconds, "NX"],
        ]),
      });

      if (!response.ok) {
        throw new Error(`Upstash API error: ${response.status}`);
      }

      const results = await response.json();
      const count = results[0]?.result || 0;

      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);
      // Fallback approximation for retryAfter if we can't get TTL easily
      const retryAfter = allowed ? 0 : windowSeconds;

      return { allowed, remaining, retryAfter };
    } catch (error) {
      // Fail-open or fallback to in-memory on error
      console.error("[RateLimiter] Redis error, allowing request", error);
      return { allowed: true, remaining: 1, retryAfter: 0 };
    }
  }
}

let activeLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (activeLimiter) return activeLimiter;

  const env = process.env.RATE_LIMITER ?? "memory";

  if (env === "redis") {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      activeLimiter = new UpstashRedisRateLimiter(url, token);
      return activeLimiter;
    }
    console.warn(
      "[RateLimiter] UPSTASH_REDIS_REST_URL or TOKEN missing, falling back to memory",
    );
  }

  activeLimiter = new InMemoryRateLimiter();
  return activeLimiter;
}
