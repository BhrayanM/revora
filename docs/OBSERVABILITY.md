# Observability & Logging

## Overview
This document outlines the observability strategy for the Revora / AI Growth Platform. To adhere to a $0 initial budget constraint, we rely on a structured JSON logging strategy (stdout/stderr) rather than deploying an external observability SaaS (like Datadog or Sentry). 

## Structured Logging
A central server-only logger is implemented at `src/lib/logger/index.ts`. 
- **Production:** Outputs single-line stringified JSON objects. This allows any standard log aggregator (Vercel Logs, AWS CloudWatch, Google Cloud Logging) to parse the logs automatically without additional agents.
- **Development:** Outputs pretty-printed, human-readable strings to the console.

## Log Sanitization
The logger automatically intercepts and sanitizes sensitive fields before they are written. 
- Matches keys containing `password`, `token`, `secret`, `authorization`, `cookie`, `key`, `session`, `email`, etc.
- Values are replaced with `[REDACTED]`.

## Usage
The logger must only be used on the server side (`import "server-only";` is present).

```typescript
import { logger } from "@/lib/logger";

// Standard logging
logger.info("User logged in", { userId: "123" });

// Error logging
try {
  await doSomething();
} catch (error) {
  logger.error("Failed to do something", error, { userId: "123" });
}

// Child loggers with inherited context
const requestLogger = logger.child({ requestId: "req-xyz" });
requestLogger.info("Processing webhook");
```

## Connecting External Monitoring (Post-Activation)
When scaling or the budget expands, we can activate external monitoring (e.g., Sentry) by extending the logger class:

1. Install `@sentry/nextjs`.
2. Update `src/lib/logger/index.ts` to forward `logger.error` calls to `Sentry.captureException()`.
3. Add environment variables for the monitoring service.
4. No other application code needs to change since everything goes through the central `logger` module.

## Health & Readiness Checks
Basic health checks can be added to standard Next.js route handlers (`/api/health`) that use this logger to output uptime and dependency connectivity without exposing system details to the client.
