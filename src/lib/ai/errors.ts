export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export class AIConfigurationError extends AIError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "AIConfigurationError";
  }
}

export class AIAuthenticationError extends AIError {
  constructor(message: string) {
    super(message, "AUTHENTICATION_ERROR", 401);
    this.name = "AIAuthenticationError";
  }
}

export class AIRateLimitError extends AIError {
  constructor(message: string) {
    super(message, "RATE_LIMIT_ERROR", 429);
    this.name = "AIRateLimitError";
  }
}

export class AITimeoutError extends AIError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR");
    this.name = "AITimeoutError";
  }
}

export class AIRequestError extends AIError {
  constructor(message: string, status?: number, cause?: unknown) {
    super(message, "REQUEST_ERROR", status, cause);
    this.name = "AIRequestError";
  }
}

export class AIResponseValidationError extends AIError {
  constructor(message: string, cause?: unknown) {
    super(message, "RESPONSE_VALIDATION_ERROR", undefined, cause);
    this.name = "AIResponseValidationError";
  }
}

export interface RetryDecision {
  shouldRetry: boolean;
  reason: string;
}

export function classifyAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const error = err as Record<string, unknown> | null | undefined;

  if (!error) {
    return new AIRequestError("Unknown AI error");
  }

  const status = error["status"] as number | undefined;
  const message = (error["message"] as string) || "AI request failed";

  if (status === 401 || status === 403) {
    return new AIAuthenticationError(message);
  }

  if (status === 429) {
    return new AIRateLimitError(message);
  }

  const code = (error["code"] as string) || "";
  if (code === "ETIMEDOUT" || code === "ECONNABORTED") {
    return new AITimeoutError(message);
  }

  return new AIRequestError(message, status, err);
}

export function shouldRetry(
  err: unknown,
  attempt: number,
  maxRetries: number,
): RetryDecision {
  const aiError = classifyAIError(err);

  if (attempt >= maxRetries) {
    return { shouldRetry: false, reason: "Max retries exceeded" };
  }

  if (aiError instanceof AIAuthenticationError) {
    return {
      shouldRetry: false,
      reason: "Authentication error (non-retryable)",
    };
  }

  if (aiError instanceof AIConfigurationError) {
    return {
      shouldRetry: false,
      reason: "Configuration error (non-retryable)",
    };
  }

  if (aiError instanceof AIResponseValidationError) {
    return {
      shouldRetry: false,
      reason: "Response validation failed (non-retryable)",
    };
  }

  if (aiError instanceof AIRateLimitError) {
    return { shouldRetry: true, reason: "Rate limited" };
  }

  if (aiError instanceof AITimeoutError) {
    return { shouldRetry: true, reason: "Request timed out" };
  }

  if (
    aiError instanceof AIRequestError &&
    aiError.status &&
    aiError.status >= 500
  ) {
    return { shouldRetry: true, reason: `Server error (${aiError.status})` };
  }

  if (aiError instanceof AIRequestError && attempt < maxRetries) {
    return { shouldRetry: true, reason: "Transient request error" };
  }

  return { shouldRetry: false, reason: "Non-retryable error" };
}

export function getRetryDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  multiplier: number,
): number {
  const delay = Math.min(
    baseDelayMs * Math.pow(multiplier, attempt),
    maxDelayMs,
  );
  const jitter = delay * 0.2 * Math.random();
  return Math.floor(delay + jitter);
}

export function getSafeAIErrorMessage(error: unknown): string {
  const aiError = classifyAIError(error);

  if (aiError instanceof AIConfigurationError) {
    return "AI qualification is not configured. Contact your administrator.";
  }

  if (aiError instanceof AIAuthenticationError) {
    return "AI qualification is temporarily unavailable. Contact your administrator.";
  }

  if (aiError instanceof AIRateLimitError) {
    return "AI qualification is temporarily busy. Please try again shortly.";
  }

  if (aiError instanceof AITimeoutError) {
    return "AI qualification timed out. Please try again.";
  }

  if (aiError instanceof AIResponseValidationError) {
    return "AI qualification returned an invalid result. Please try again.";
  }

  return "AI qualification could not be completed. Please try again.";
}
