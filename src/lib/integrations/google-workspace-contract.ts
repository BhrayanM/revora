import "server-only";

import type { IntegrationErrorCategory } from "@/lib/integrations/types";

export const GOOGLE_WORKSPACE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/gmail.send",
] as const;

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CALENDAR_EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const MAX_TOKEN_LENGTH = 4096;
const MAX_TOKEN_LIFETIME_SECONDS = 7 * 24 * 60 * 60;
const MAX_SUBJECT_LENGTH = 255;
const MAX_EMAIL_LENGTH = 320;
const MAX_CALENDAR_LIST_RESULTS = 25;
const RFC3339_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type UnknownRecord = Record<string, unknown>;

export interface GoogleTokenGrant {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scopes: string[];
}

export interface GoogleIdentity {
  subject: string;
  email: string;
}

export interface GoogleCalendarAppointmentInput {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone: string;
  attendee?: string;
}

export interface GoogleCalendarEventSummary {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  attendeeCount: number;
}

export interface NormalizedGoogleCalendarAppointment {
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  timeZone: string;
  attendee?: string;
  durationMinutes: number;
}

export interface GoogleEmailInput {
  to: string;
  subject: string;
  body: string;
}

export type NormalizedGoogleEmailInput = GoogleEmailInput;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyBoundedString(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : null;
}

function validateEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length < 3 ||
    normalized.length > MAX_EMAIL_LENGTH ||
    normalized.includes("\r") ||
    normalized.includes("\n") ||
    !EMAIL_PATTERN.test(normalized)
  ) {
    throw new Error("Google email address is invalid.");
  }
  return normalized;
}

function parseExactScopes(value: unknown): string[] {
  if (typeof value !== "string") {
    throw new Error("Google returned an unexpected scope response.");
  }
  const scopes = value
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean);
  const uniqueScopes = new Set(scopes);
  if (
    uniqueScopes.size !== GOOGLE_WORKSPACE_SCOPES.length ||
    GOOGLE_WORKSPACE_SCOPES.some((scope) => !uniqueScopes.has(scope)) ||
    scopes.some(
      (scope) =>
        !GOOGLE_WORKSPACE_SCOPES.includes(
          scope as (typeof GOOGLE_WORKSPACE_SCOPES)[number],
        ),
    )
  ) {
    throw new Error("Google returned an unexpected scope grant.");
  }
  return [...GOOGLE_WORKSPACE_SCOPES];
}

export function hasExactGoogleWorkspaceScopes(value: unknown): boolean {
  try {
    const scopes = Array.isArray(value) ? value.join(" ") : value;
    parseExactScopes(scopes);
    return true;
  } catch {
    return false;
  }
}

export function buildGoogleWorkspaceAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(GOOGLE_AUTHORIZATION_URL);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
    state: input.state,
  }).toString();
  return url.toString();
}

export function parseGoogleTokenPayload(
  payload: unknown,
  options: {
    requireRefreshToken?: boolean;
    currentRefreshToken?: string;
    currentScopes?: string[];
  } = {},
): GoogleTokenGrant {
  if (!isRecord(payload)) {
    throw new Error("Google returned an unexpected response.");
  }
  const accessToken = nonEmptyBoundedString(
    payload["access_token"],
    MAX_TOKEN_LENGTH,
  );
  const returnedRefreshToken = nonEmptyBoundedString(
    payload["refresh_token"],
    MAX_TOKEN_LENGTH,
  );
  const fallbackRefreshToken = nonEmptyBoundedString(
    options.currentRefreshToken,
    MAX_TOKEN_LENGTH,
  );
  const refreshToken = returnedRefreshToken ?? fallbackRefreshToken;
  const expiresInSeconds = payload["expires_in"];
  const tokenType = nonEmptyBoundedString(payload["token_type"], 32);

  if (
    !accessToken ||
    !refreshToken ||
    (options.requireRefreshToken && !returnedRefreshToken) ||
    tokenType?.toLowerCase() !== "bearer" ||
    typeof expiresInSeconds !== "number" ||
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds <= 0 ||
    expiresInSeconds > MAX_TOKEN_LIFETIME_SECONDS
  ) {
    throw new Error("Google returned an unexpected response.");
  }

  return {
    accessToken,
    refreshToken,
    expiresInSeconds,
    scopes:
      payload["scope"] === undefined && options.currentScopes
        ? parseExactScopes(options.currentScopes.join(" "))
        : parseExactScopes(payload["scope"]),
  };
}

export function parseGoogleUserInfo(payload: unknown): GoogleIdentity {
  if (!isRecord(payload)) {
    throw new Error("Google returned an unexpected response.");
  }
  const subject = nonEmptyBoundedString(payload["sub"], MAX_SUBJECT_LENGTH);
  if (!subject) {
    throw new Error("Google returned an unexpected response.");
  }
  if (payload["email_verified"] !== true) {
    throw new Error("Google email address is not verified.");
  }

  let email: string;
  try {
    email = validateEmail(String(payload["email"] ?? ""));
  } catch {
    throw new Error("Google returned an unexpected response.");
  }
  return { subject, email };
}

export function normalizeGoogleError(
  status: number,
  providerError?: string,
  refreshContext = false,
): IntegrationErrorCategory {
  if (refreshContext && providerError === "invalid_grant") {
    return "REAUTH_REQUIRED";
  }
  if (
    status === 401 ||
    ["invalid_token", "invalid_client"].includes(providerError ?? "")
  ) {
    return "INVALID_CREDENTIALS";
  }
  if (
    status === 403 ||
    ["invalid_scope", "access_denied", "unauthorized_client"].includes(
      providerError ?? "",
    )
  ) {
    return "CONFIGURATION_ERROR";
  }
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "PROVIDER_UNAVAILABLE";
  return "INVALID_RESPONSE";
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
  fieldName: string,
): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is invalid.`);
  }
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    normalized.includes("\0")
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }
  return normalized;
}

function parseBoundedRfc3339(value: unknown, fieldName: string): Date {
  if (
    typeof value !== "string" ||
    value.length > 64 ||
    !RFC3339_WITH_OFFSET.test(value)
  ) {
    throw new Error(
      `${fieldName} must be an RFC 3339 timestamp with an offset.`,
    );
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(
      `${fieldName} must be an RFC 3339 timestamp with an offset.`,
    );
  }
  return parsed;
}

function validateTimeZone(value: unknown): string {
  if (typeof value !== "string") throw new Error("Time zone is invalid.");
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) {
    throw new Error("Time zone is invalid.");
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format();
  } catch {
    throw new Error("Time zone is invalid.");
  }
  return normalized;
}

export function normalizeGoogleCalendarAppointment(
  input: GoogleCalendarAppointmentInput,
  now = new Date(),
): NormalizedGoogleCalendarAppointment {
  if (!isRecord(input)) throw new Error("Calendar appointment is invalid.");
  const summary = normalizeOptionalText(input.summary, 200, "Summary");
  if (!summary) throw new Error("Summary is required.");
  const description = normalizeOptionalText(
    input.description,
    2000,
    "Description",
  );
  const location = normalizeOptionalText(input.location, 500, "Location");
  const startValue = typeof input.start === "string" ? input.start : "";
  const endValue = typeof input.end === "string" ? input.end : "";
  const start = parseBoundedRfc3339(startValue, "Start");
  const end = parseBoundedRfc3339(endValue, "End");
  const durationMs = end.getTime() - start.getTime();
  if (durationMs <= 0 || durationMs > 24 * 60 * 60 * 1000) {
    throw new Error("Appointment duration is invalid.");
  }
  const earliest = now.getTime() - 365 * 24 * 60 * 60 * 1000;
  const latest = now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000;
  if (start.getTime() < earliest || start.getTime() > latest) {
    throw new Error("Appointment start is outside the allowed range.");
  }
  const timeZone = validateTimeZone(input.timeZone);
  const attendee = input.attendee ? validateEmail(input.attendee) : undefined;

  return {
    summary,
    ...(description ? { description } : {}),
    ...(location ? { location } : {}),
    start: startValue,
    end: endValue,
    timeZone,
    ...(attendee ? { attendee } : {}),
    durationMinutes: Math.ceil(durationMs / 60_000),
  };
}

export function buildGoogleCalendarEventRequest(
  appointment: NormalizedGoogleCalendarAppointment,
): {
  url: string;
  body: Record<string, unknown>;
} {
  const url = new URL(GOOGLE_CALENDAR_EVENTS_URL);
  url.searchParams.set("sendUpdates", appointment.attendee ? "all" : "none");
  return {
    url: url.toString(),
    body: {
      summary: appointment.summary,
      ...(appointment.description
        ? { description: appointment.description }
        : {}),
      ...(appointment.location ? { location: appointment.location } : {}),
      start: {
        dateTime: appointment.start,
        timeZone: appointment.timeZone,
      },
      end: {
        dateTime: appointment.end,
        timeZone: appointment.timeZone,
      },
      ...(appointment.attendee
        ? { attendees: [{ email: appointment.attendee }] }
        : {}),
    },
  };
}

export function buildGoogleCalendarListRequest(
  now = new Date(),
  horizonDays = 30,
  maxResults = MAX_CALENDAR_LIST_RESULTS,
): string {
  if (
    !Number.isFinite(now.getTime()) ||
    !Number.isInteger(horizonDays) ||
    horizonDays < 1 ||
    horizonDays > 90 ||
    !Number.isInteger(maxResults) ||
    maxResults < 1 ||
    maxResults > MAX_CALENDAR_LIST_RESULTS
  ) {
    throw new Error("Calendar list request is invalid.");
  }
  const timeMax = new Date(now.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const url = new URL(GOOGLE_CALENDAR_EVENTS_URL);
  url.searchParams.set("timeMin", now.toISOString());
  url.searchParams.set("timeMax", timeMax.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set(
    "fields",
    "kind,items(id,summary,start,end,location,attendees)",
  );
  return url.toString();
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_ONLY_PATTERN.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function parseGoogleCalendarListResponse(
  payload: unknown,
): GoogleCalendarEventSummary[] {
  if (
    !isRecord(payload) ||
    payload["kind"] !== "calendar#events" ||
    !Array.isArray(payload["items"]) ||
    payload["items"].length > MAX_CALENDAR_LIST_RESULTS
  ) {
    throw new Error("Google Calendar returned an unexpected response.");
  }

  return payload["items"].flatMap((item): GoogleCalendarEventSummary[] => {
    if (!isRecord(item) || !isRecord(item["start"]) || !isRecord(item["end"])) {
      return [];
    }
    const id = nonEmptyBoundedString(item["id"], 1024);
    if (!id) return [];
    const startDateTime = item["start"]["dateTime"];
    const endDateTime = item["end"]["dateTime"];
    const startDate = item["start"]["date"];
    const endDate = item["end"]["date"];
    let start: string;
    let end: string;
    let allDay: boolean;

    if (typeof startDateTime === "string" && typeof endDateTime === "string") {
      try {
        const parsedStart = parseBoundedRfc3339(startDateTime, "Event start");
        const parsedEnd = parseBoundedRfc3339(endDateTime, "Event end");
        if (parsedEnd.getTime() <= parsedStart.getTime()) return [];
      } catch {
        return [];
      }
      start = startDateTime;
      end = endDateTime;
      allDay = false;
    } else if (isValidDateOnly(startDate) && isValidDateOnly(endDate)) {
      if (endDate <= startDate) return [];
      start = startDate;
      end = endDate;
      allDay = true;
    } else {
      return [];
    }

    const summary =
      nonEmptyBoundedString(item["summary"], 200) ?? "Untitled event";
    const location = nonEmptyBoundedString(item["location"], 500);
    const attendees = item["attendees"];
    return [
      {
        id,
        summary,
        start,
        end,
        allDay,
        ...(location ? { location } : {}),
        attendeeCount: Array.isArray(attendees)
          ? Math.min(attendees.length, 100)
          : 0,
      },
    ];
  });
}

export function parseGoogleCalendarEventResponse(payload: unknown): {
  eventId: string;
} {
  if (!isRecord(payload)) {
    throw new Error("Google Calendar returned an unexpected response.");
  }
  const eventId = nonEmptyBoundedString(payload["id"], 1024);
  if (!eventId) {
    throw new Error("Google Calendar returned an unexpected response.");
  }
  return { eventId };
}

export function normalizeGoogleEmailInput(
  input: GoogleEmailInput,
): NormalizedGoogleEmailInput {
  if (!isRecord(input)) throw new Error("Email message is invalid.");
  const to = validateEmail(String(input.to ?? ""));
  const subject = normalizeOptionalText(input.subject, 200, "Subject");
  if (!subject || subject.includes("\r") || subject.includes("\n")) {
    throw new Error("Subject is invalid.");
  }
  if (
    typeof input.body !== "string" ||
    input.body.length < 1 ||
    input.body.length > 20_000 ||
    input.body.includes("\0")
  ) {
    throw new Error("Email body is invalid.");
  }
  return {
    to,
    subject,
    body: input.body.replace(/\r\n?/g, "\n"),
  };
}

export function buildGoogleRawEmail(input: NormalizedGoogleEmailInput): string {
  const encodedSubject = Buffer.from(input.subject, "utf8").toString("base64");
  const normalizedBody = input.body.replace(/\n/g, "\r\n");
  const message = [
    `To: ${input.to}`,
    `Subject: =?UTF-8?B?${encodedSubject}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizedBody,
  ].join("\r\n");
  return Buffer.from(message, "utf8").toString("base64url");
}

export function parseGmailSendResponse(payload: unknown): {
  messageId: string;
} {
  if (!isRecord(payload)) {
    throw new Error("Gmail returned an unexpected response.");
  }
  const messageId = nonEmptyBoundedString(payload["id"], 1024);
  if (!messageId) {
    throw new Error("Gmail returned an unexpected response.");
  }
  return { messageId };
}
