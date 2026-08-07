export interface RateLimiter {
  checkLimit(key: string): {
    allowed: boolean;
    remaining: number;
    retryAfter: number;
  };
}

export { checkRateLimit as inMemoryRateLimit } from "@/lib/lead-ingestion/rate-limit";
