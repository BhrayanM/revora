import "server-only";

/**
 * Centralized Environment Configuration & Validation for Revora / AI Growth Platform.
 *
 * Design Principles:
 * 1. Safe Diagnostics: Never log or print secret values, tokens, or connection strings.
 * 2. Layered Validation: Differentiate between core requirements vs optional integration requirements.
 * 3. Environment Awareness: Handle development, CI/test, and production modes cleanly.
 */

export class EnvValidationError extends Error {
  public readonly missingVars: string[];
  public readonly invalidVars: string[];

  constructor(message: string, missing: string[] = [], invalid: string[] = []) {
    super(message);
    this.name = "EnvValidationError";
    this.missingVars = missing;
    this.invalidVars = invalid;
  }
}

export type AppEnvironment = "development" | "test" | "production";

/**
 * Returns the effective application environment.
 */
export function getAppEnvironment(): AppEnvironment {
  const env =
    process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development";
  if (env === "production") return "production";
  if (env === "test") return "test";
  return "development";
}

/**
 * Returns the sanitized application base URL.
 */
export function getAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (raw && raw.trim().length > 0) {
    return raw.trim().replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}

export interface CoreEnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  appUrl: string;
  appName: string;
  appEnv: AppEnvironment;
  encryptionKey?: string;
  automationRetrySecret?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  errors: string[];
}

/**
 * Validates core environment variables required for standard server runtime operations.
 * Does NOT fail on optional third-party integrations (HubSpot, Slack, Google, etc.).
 */
export function validateCoreEnv(options?: {
  strictProduction?: boolean;
}): EnvValidationResult {
  const missing: string[] = [];
  const invalid: string[] = [];
  const errors: string[] = [];
  const isProd =
    options?.strictProduction ?? getAppEnvironment() === "production";

  // 1. Supabase Public URL
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl.trim().length === 0) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
    errors.push("Missing NEXT_PUBLIC_SUPABASE_URL");
  } else {
    try {
      const parsed = new URL(supabaseUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        invalid.push("NEXT_PUBLIC_SUPABASE_URL");
        errors.push(
          "NEXT_PUBLIC_SUPABASE_URL must use http:// or https:// protocol",
        );
      }
    } catch {
      invalid.push("NEXT_PUBLIC_SUPABASE_URL");
      errors.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL format");
    }
  }

  // 2. Supabase Anon Key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey || anonKey.trim().length === 0) {
    missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    errors.push("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // 3. Supabase Service Role Key (Server-Only)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey.trim().length === 0) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
    errors.push("Missing SUPABASE_SERVICE_ROLE_KEY");
  } else if (anonKey && serviceKey === anonKey) {
    invalid.push("SUPABASE_SERVICE_ROLE_KEY");
    errors.push(
      "SUPABASE_SERVICE_ROLE_KEY must not be identical to NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  // 4. Production specific checks
  if (isProd) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl || appUrl.trim().length === 0) {
      missing.push("NEXT_PUBLIC_APP_URL");
      errors.push("Missing NEXT_PUBLIC_APP_URL in production");
    } else if (
      !appUrl.startsWith("https://") &&
      !appUrl.startsWith("http://localhost")
    ) {
      invalid.push("NEXT_PUBLIC_APP_URL");
      errors.push("NEXT_PUBLIC_APP_URL in production must use https:// origin");
    }

    // Encryption key check in production
    const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (encKey) {
      if (!/^[0-9a-fA-F]{64}$/.test(encKey.trim())) {
        invalid.push("INTEGRATION_ENCRYPTION_KEY");
        errors.push(
          "INTEGRATION_ENCRYPTION_KEY must be a 64-character hexadecimal string (32 bytes)",
        );
      }
    }

    // Retry secret check in production
    const retrySecret = process.env.AUTOMATION_RETRY_SECRET;
    if (retrySecret && retrySecret.trim().length < 32) {
      invalid.push("AUTOMATION_RETRY_SECRET");
      errors.push(
        "AUTOMATION_RETRY_SECRET in production must have at least 32 characters",
      );
    }

    // Disallow insecure webhooks in production
    if (process.env.ALLOW_INSECURE_INTEGRATION_WEBHOOKS === "true") {
      invalid.push("ALLOW_INSECURE_INTEGRATION_WEBHOOKS");
      errors.push(
        "ALLOW_INSECURE_INTEGRATION_WEBHOOKS cannot be enabled in production",
      );
    }
  }

  return {
    valid: missing.length === 0 && invalid.length === 0,
    missing,
    invalid,
    errors,
  };
}

/**
 * Validates required configuration for OpenAI features on demand.
 */
export function validateAIEnv(): { valid: boolean; error?: string } {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, error: "Missing OPENAI_API_KEY" };
  }
  return { valid: true };
}

/**
 * Validates OAuth provider configuration when an OAuth handshake is initiated.
 */
export function validateProviderOAuthEnv(
  provider: "slack" | "hubspot" | "gohighlevel" | "google-workspace",
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  switch (provider) {
    case "slack":
      if (!process.env.SLACK_CLIENT_ID?.trim()) missing.push("SLACK_CLIENT_ID");
      if (!process.env.SLACK_CLIENT_SECRET?.trim())
        missing.push("SLACK_CLIENT_SECRET");
      if (!process.env.SLACK_REDIRECT_URI?.trim())
        missing.push("SLACK_REDIRECT_URI");
      break;

    case "hubspot":
      if (!process.env.HUBSPOT_CLIENT_ID?.trim())
        missing.push("HUBSPOT_CLIENT_ID");
      if (!process.env.HUBSPOT_CLIENT_SECRET?.trim())
        missing.push("HUBSPOT_CLIENT_SECRET");
      if (!process.env.HUBSPOT_REDIRECT_URI?.trim())
        missing.push("HUBSPOT_REDIRECT_URI");
      break;

    case "gohighlevel":
      if (!process.env.GHL_CLIENT_ID?.trim()) missing.push("GHL_CLIENT_ID");
      if (!process.env.GHL_CLIENT_SECRET?.trim())
        missing.push("GHL_CLIENT_SECRET");
      if (!process.env.GHL_REDIRECT_URI?.trim())
        missing.push("GHL_REDIRECT_URI");
      break;

    case "google-workspace":
      if (!process.env.GOOGLE_WORKSPACE_CLIENT_ID?.trim())
        missing.push("GOOGLE_WORKSPACE_CLIENT_ID");
      if (!process.env.GOOGLE_WORKSPACE_CLIENT_SECRET?.trim())
        missing.push("GOOGLE_WORKSPACE_CLIENT_SECRET");
      if (!process.env.GOOGLE_WORKSPACE_REDIRECT_URI?.trim())
        missing.push("GOOGLE_WORKSPACE_REDIRECT_URI");
      break;
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates rate limiter configuration.
 */
export function validateRateLimiterEnv(): { valid: boolean; error?: string } {
  const limiter = process.env.RATE_LIMITER ?? "memory";
  if (limiter === "redis") {
    const url = process.env.REDIS_URL;
    if (!url || url.trim().length === 0) {
      return {
        valid: false,
        error: "RATE_LIMITER is set to redis but REDIS_URL is missing",
      };
    }
  }
  return { valid: true };
}
