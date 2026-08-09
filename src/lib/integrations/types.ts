export const INTEGRATION_PROVIDER_IDS = [
  "hubspot",
  "gohighlevel",
  "n8n",
  "slack",
  "tally",
  "twilio",
  "google-calendar",
  "gmail",
  "zapier",
  "make",
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export type IntegrationAuthType = "oauth2" | "api_key" | "webhook" | "none";

export type IntegrationStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "degraded"
  | "reauth_required"
  | "error";

export type IntegrationHealthStatus =
  "unknown" | "healthy" | "degraded" | "reauth_required";

export type IntegrationCategory =
  "crm" | "automation" | "communication" | "lead-capture" | "google-workspace";

export interface ProviderCatalogEntry {
  id: IntegrationProviderId;
  displayName: string;
  description: string;
  category: IntegrationCategory;
  authType: IntegrationAuthType;
  supportsOAuth: boolean;
  supportsApiKey: boolean;
  supportsWebhooks: boolean;
  supportsInbound: boolean;
  supportsOutbound: boolean;
  requiredScopes: string[];
  docsUrl: string;
}

export interface IntegrationConnection {
  id: string;
  organizationId: string;
  provider: IntegrationProviderId;
  status: IntegrationStatus;
  healthStatus: IntegrationHealthStatus;
  connectedAt: string | null;
  externalAccountId: string | null;
  externalAccountName: string | null;
  scopes: string[] | null;
  tokenExpiresAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationError {
  code: string;
  userMessage: string;
  category: IntegrationErrorCategory;
}

export type IntegrationErrorCategory =
  | "AUTH_ERROR"
  | "RATE_LIMITED"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_CREDENTIALS"
  | "REAUTH_REQUIRED"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE"
  | "CONFIGURATION_ERROR";

export const INTEGRATION_ERROR_MESSAGES: Record<
  IntegrationErrorCategory,
  string
> = {
  AUTH_ERROR: "Authentication failed. Please check your credentials.",
  RATE_LIMITED: "Too many requests. Please try again shortly.",
  PROVIDER_UNAVAILABLE: "The provider is temporarily unavailable.",
  INVALID_CREDENTIALS: "The stored credentials are no longer valid.",
  REAUTH_REQUIRED: "Please reconnect this integration to continue.",
  NETWORK_ERROR: "A network error occurred. Please try again.",
  INVALID_RESPONSE: "The provider returned an unexpected response.",
  CONFIGURATION_ERROR: "This integration is not properly configured.",
};

export function getSafeIntegrationError(
  category: IntegrationErrorCategory,
): IntegrationError {
  return {
    code: category,
    userMessage:
      INTEGRATION_ERROR_MESSAGES[category] ?? "An integration error occurred.",
    category,
  };
}

export interface OutboundEvent {
  eventId: string;
  organizationId: string;
  type: string;
  occurredAt: string;
  resourceType: string;
  resourceId: string;
  data: Record<string, unknown>;
}

export const OUTBOUND_EVENT_TYPES = [
  "lead.created",
  "lead.updated",
  "lead.qualified",
  "lead.stage_changed",
  "appointment.created",
] as const;

export type OutboundEventType = (typeof OUTBOUND_EVENT_TYPES)[number];

export interface IntegrationAdapter {
  provider: IntegrationProviderId;

  getAuthorizationUrl?(
    organizationId: string,
    returnPath: string,
  ): Promise<{ url: string; state: string }>;

  exchangeAuthorizationCode?(
    organizationId: string,
    code: string,
    state: string,
  ): Promise<Record<string, unknown>>;

  refreshAccessToken?(
    organizationId: string,
    refreshToken: string,
  ): Promise<Record<string, unknown>>;

  validateCredentials?(credentials: Record<string, unknown>): Promise<boolean>;

  testConnection?(organizationId: string): Promise<boolean>;

  disconnect?(organizationId: string): Promise<void>;

  sendEvent?(
    organizationId: string,
    event: OutboundEvent,
  ): Promise<{ success: boolean; error?: string }>;

  handleWebhook?(
    organizationId: string,
    payload: unknown,
    headers: Headers,
  ): Promise<{ acknowledged: boolean; eventId?: string }>;
}
