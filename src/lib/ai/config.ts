import "server-only";

export const aiConfig = {
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",

  timeoutMs: 60_000,

  retry: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10_000,
    backoffMultiplier: 2,
  },
} as const;
