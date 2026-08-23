/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  durationMs?: number;
}

const SENSITIVE_KEYS = [
  "password",
  "token",
  "secret",
  "authorization",
  "cookie",
  "key",
  "session",
  "credit_card",
  "email", // Can be PII depending on context, but let's redact in logs
];

/**
 * Redacts sensitive information from an object before logging.
 */
function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitiveKey) =>
      key.toLowerCase().includes(sensitiveKey),
    );

    if (isSensitive && value) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = sanitize(value);
    }
  }

  return sanitized;
}

class Logger {
  private baseContext: LogContext = {};

  constructor(context: LogContext = {}) {
    this.baseContext = context;
  }

  public child(context: LogContext): Logger {
    return new Logger({ ...this.baseContext, ...context });
  }

  private log(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown,
    durationMs?: number,
  ) {
    const env = process.env.NODE_ENV || "development";

    // In test environment, suppress most logs to avoid noise, unless they are errors
    if (env === "test" && level !== "error") {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    const mergedContext = { ...this.baseContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = sanitize(mergedContext);
    }

    if (error instanceof Error) {
      entry.error = {
        message: error.message,
        stack: env === "development" ? error.stack : undefined, // omit stack in prod for brevity or keep it depending on policy
        name: error.name,
      };
      // Keep stack in prod if it's an error
      if (env === "production" || env === "development") {
        entry.error.stack = error.stack;
      }
    } else if (error !== undefined) {
      entry.error = {
        message: String(error),
        name: "UnknownError",
      };
    }

    if (durationMs !== undefined) {
      entry.durationMs = durationMs;
    }

    // Use stdout for structured JSON in production for easy parsing by Datadog/CloudWatch
    if (env === "production") {
      if (level === "error") {
        console.error(JSON.stringify(entry));
      } else {
        console.log(JSON.stringify(entry));
      }
    } else {
      // Human-readable in development
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      const ctxStr = entry.context ? JSON.stringify(entry.context) : "";
      const durStr = entry.durationMs ? ` (+${entry.durationMs}ms)` : "";

      if (level === "error") {
        console.error(`${prefix} ${message}${durStr}`, ctxStr, entry.error);
      } else if (level === "warn") {
        console.warn(`${prefix} ${message}${durStr}`, ctxStr);
      } else if (level === "info") {
        console.info(`${prefix} ${message}${durStr}`, ctxStr);
      } else {
        console.debug(`${prefix} ${message}${durStr}`, ctxStr);
      }
    }
  }

  public debug(message: string, context?: LogContext, durationMs?: number) {
    this.log("debug", message, context, undefined, durationMs);
  }

  public info(message: string, context?: LogContext, durationMs?: number) {
    this.log("info", message, context, undefined, durationMs);
  }

  public warn(
    message: string,
    context?: LogContext,
    error?: unknown,
    durationMs?: number,
  ) {
    this.log("warn", message, context, error, durationMs);
  }

  public error(
    message: string,
    error?: unknown,
    context?: LogContext,
    durationMs?: number,
  ) {
    this.log("error", message, context, error, durationMs);
  }
}

export const logger = new Logger();
