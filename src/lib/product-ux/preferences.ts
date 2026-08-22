export const SUPPORTED_LANGUAGES = [
  { value: "en-US", label: "English (United States)" },
  { value: "es-419", label: "Español (Latinoamérica)" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en-US";
export const DEFAULT_TIME_ZONE = "America/New_York";

const FALLBACK_TIME_ZONES = [
  "Africa/Johannesburg",
  "America/Anchorage",
  "America/Bogota",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Phoenix",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Pacific/Auckland",
  "UTC",
] as const;

const LANGUAGE_ALIASES = new Map<string, SupportedLanguage>([
  ["en-us", "en-US"],
  ["english (us)", "en-US"],
  ["english (united states)", "en-US"],
  ["es-419", "es-419"],
  ["spanish (latin america)", "es-419"],
  ["español (latinoamérica)", "es-419"],
  ["espanol (latinoamerica)", "es-419"],
]);

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

type WorkspaceSettingsField =
  "organizationName" | "website" | "contactEmail" | "language" | "timezone";

export interface WorkspaceSettingsInput {
  organizationName: unknown;
  website: unknown;
  contactEmail: unknown;
  language: unknown;
  timezone: unknown;
}

export interface ValidatedWorkspaceSettings {
  organizationName: string;
  website: string;
  contactEmail: string;
  language: SupportedLanguage;
  timezone: string;
}

export type WorkspaceSettingsValidation =
  | { ok: true; value: ValidatedWorkspaceSettings }
  | {
      ok: false;
      error: string;
      fieldErrors: Partial<Record<WorkspaceSettingsField, string>>;
    };

function normalizedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLanguagePreference(
  value: unknown,
): SupportedLanguage | null {
  const normalized = normalizedString(value);
  if (!normalized) return null;
  return LANGUAGE_ALIASES.get(normalized.toLocaleLowerCase("en-US")) ?? null;
}

export function isValidIanaTimeZone(value: unknown): value is string {
  const normalized = normalizedString(value);
  if (
    !normalized ||
    normalized.length > 100 ||
    CONTROL_CHARACTER_PATTERN.test(normalized)
  ) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimeZones(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const runtimeValues = intlWithSupportedValues.supportedValuesOf?.("timeZone");
  const values =
    runtimeValues && runtimeValues.length > 0
      ? [...runtimeValues, "UTC"]
      : [...FALLBACK_TIME_ZONES];
  return [...new Set(values)].filter(isValidIanaTimeZone).sort();
}

function validateWebsite(value: unknown): string | null {
  const normalized = normalizedString(value);
  if (!normalized) return "";
  if (normalized.length > 2048 || CONTROL_CHARACTER_PATTERN.test(normalized)) {
    return null;
  }
  try {
    const url = new URL(normalized);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function validateContactEmail(value: unknown): string | null {
  const normalized = normalizedString(value).toLocaleLowerCase("en-US");
  if (!normalized) return "";
  if (
    normalized.length > 320 ||
    CONTROL_CHARACTER_PATTERN.test(normalized) ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function validateWorkspaceSettings(
  input: WorkspaceSettingsInput,
): WorkspaceSettingsValidation {
  const fieldErrors: Partial<Record<WorkspaceSettingsField, string>> = {};
  const organizationName = normalizedString(input.organizationName);
  if (
    !organizationName ||
    organizationName.length > 120 ||
    CONTROL_CHARACTER_PATTERN.test(organizationName)
  ) {
    fieldErrors.organizationName =
      "Organization name must contain 1 to 120 valid characters.";
  }

  const website = validateWebsite(input.website);
  if (website === null) {
    fieldErrors.website = "Website must be a valid HTTPS URL.";
  }

  const contactEmail = validateContactEmail(input.contactEmail);
  if (contactEmail === null) {
    fieldErrors.contactEmail = "Contact email is invalid.";
  }

  const language = normalizeLanguagePreference(input.language);
  if (!language) {
    fieldErrors.language = "Select a supported language.";
  }

  const timezone = normalizedString(input.timezone);
  if (!isValidIanaTimeZone(timezone)) {
    fieldErrors.timezone = "Select a valid IANA timezone.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      error: "Review the highlighted workspace settings.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    value: {
      organizationName,
      website: website!,
      contactEmail: contactEmail!,
      language: language!,
      timezone,
    },
  };
}
