import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  createGoogleCalendarAppointmentWithAccessToken,
  exchangeGoogleAuthorizationCode,
  fetchGoogleUserIdentity,
  refreshGoogleAccessToken,
  revokeGoogleGrant,
  sendGoogleWorkspaceEmailWithAccessToken,
  verifyGoogleCalendarReadOnly,
} from "../src/lib/integrations/adapters/google-workspace.ts";
import {
  GOOGLE_WORKSPACE_SCOPES,
  buildGoogleCalendarEventRequest,
  buildGoogleRawEmail,
  buildGoogleWorkspaceAuthorizationUrl,
  normalizeGoogleCalendarAppointment,
  normalizeGoogleEmailInput,
  normalizeGoogleError,
  parseGoogleCalendarEventResponse,
  parseGoogleTokenPayload,
  parseGoogleUserInfo,
  parseGmailSendResponse,
} from "../src/lib/integrations/google-workspace-contract.ts";

const authorizationUrl = new URL(
  buildGoogleWorkspaceAuthorizationUrl({
    clientId: "google-client-id.apps.googleusercontent.com",
    redirectUri:
      "https://app.revora.test/api/integrations/google-workspace/callback",
    state: "opaque-state",
  }),
);
assert.equal(authorizationUrl.origin, "https://accounts.google.com");
assert.equal(authorizationUrl.pathname, "/o/oauth2/v2/auth");
assert.equal(
  authorizationUrl.searchParams.get("client_id"),
  "google-client-id.apps.googleusercontent.com",
);
assert.equal(authorizationUrl.searchParams.get("response_type"), "code");
assert.equal(authorizationUrl.searchParams.get("access_type"), "offline");
assert.equal(authorizationUrl.searchParams.get("prompt"), "consent");
assert.equal(authorizationUrl.searchParams.get("state"), "opaque-state");
assert.equal(
  authorizationUrl.searchParams.get("redirect_uri"),
  "https://app.revora.test/api/integrations/google-workspace/callback",
);
assert.deepEqual(
  authorizationUrl.searchParams.get("scope")?.split(" "),
  GOOGLE_WORKSPACE_SCOPES,
);
assert.equal(
  authorizationUrl.searchParams.has("include_granted_scopes"),
  false,
);
assert.deepEqual(GOOGLE_WORKSPACE_SCOPES, [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/gmail.send",
]);

const exactScopeString = GOOGLE_WORKSPACE_SCOPES.join(" ");
const fixedNow = new Date("2026-08-21T12:00:00.000Z");
assert.deepEqual(
  parseGoogleTokenPayload(
    {
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      scope: exactScopeString,
      token_type: "Bearer",
    },
    { requireRefreshToken: true },
  ),
  {
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresInSeconds: 3600,
    scopes: GOOGLE_WORKSPACE_SCOPES,
  },
);
assert.deepEqual(
  parseGoogleTokenPayload(
    {
      access_token: "new-access-token",
      expires_in: 1800,
      token_type: "Bearer",
    },
    {
      currentRefreshToken: "refresh-token",
      currentScopes: [...GOOGLE_WORKSPACE_SCOPES],
    },
  ),
  {
    accessToken: "new-access-token",
    refreshToken: "refresh-token",
    expiresInSeconds: 1800,
    scopes: GOOGLE_WORKSPACE_SCOPES,
  },
);
assert.deepEqual(
  parseGoogleTokenPayload(
    {
      access_token: "new-access-token",
      expires_in: 1800,
      scope: exactScopeString,
      token_type: "Bearer",
    },
    { currentRefreshToken: "refresh-token" },
  ),
  {
    accessToken: "new-access-token",
    refreshToken: "refresh-token",
    expiresInSeconds: 1800,
    scopes: GOOGLE_WORKSPACE_SCOPES,
  },
);
assert.throws(
  () =>
    parseGoogleTokenPayload(
      {
        access_token: "access-token",
        expires_in: 3600,
        scope: exactScopeString,
        token_type: "Bearer",
      },
      { requireRefreshToken: true },
    ),
  /unexpected response/,
);
assert.throws(
  () =>
    parseGoogleTokenPayload(
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        scope: `${exactScopeString} https://www.googleapis.com/auth/gmail.readonly`,
        token_type: "Bearer",
      },
      { requireRefreshToken: true },
    ),
  /scope/,
);
assert.throws(
  () =>
    parseGoogleTokenPayload(
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        scope: "openid email https://www.googleapis.com/auth/gmail.send",
        token_type: "Bearer",
      },
      { requireRefreshToken: true },
    ),
  /scope/,
);
assert.throws(
  () =>
    parseGoogleTokenPayload(
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 0,
        scope: exactScopeString,
        token_type: "Bearer",
      },
      { requireRefreshToken: true },
    ),
  /unexpected response/,
);
assert.throws(
  () =>
    parseGoogleTokenPayload(
      {
        access_token: "access-token",
        refresh_token: "refresh-token",
        expires_in: 3600,
        scope: exactScopeString,
        token_type: "MAC",
      },
      { requireRefreshToken: true },
    ),
  /unexpected response/,
);

assert.deepEqual(
  parseGoogleUserInfo({
    sub: "google-subject-123",
    email: "Owner@Example.com",
    email_verified: true,
  }),
  {
    subject: "google-subject-123",
    email: "owner@example.com",
  },
);
assert.throws(
  () =>
    parseGoogleUserInfo({
      sub: "google-subject-123",
      email: "owner@example.com",
      email_verified: false,
    }),
  /verified/,
);
assert.throws(
  () =>
    parseGoogleUserInfo({
      sub: "google-subject-123",
      email: "not-an-email",
      email_verified: true,
    }),
  /unexpected response/,
);

assert.equal(normalizeGoogleError(401), "INVALID_CREDENTIALS");
assert.equal(
  normalizeGoogleError(400, "invalid_grant", true),
  "REAUTH_REQUIRED",
);
assert.equal(normalizeGoogleError(403), "CONFIGURATION_ERROR");
assert.equal(normalizeGoogleError(429), "RATE_LIMITED");
assert.equal(normalizeGoogleError(503), "PROVIDER_UNAVAILABLE");
assert.equal(normalizeGoogleError(200, "invalid_scope"), "CONFIGURATION_ERROR");
assert.equal(normalizeGoogleError(200, "other"), "INVALID_RESPONSE");

const googleConfig = {
  clientId: "google-client-id.apps.googleusercontent.com",
  clientSecret: "google-client-secret",
  redirectUri:
    "https://app.revora.test/api/integrations/google-workspace/callback",
};
function googleJsonResponse(body, status = 200) {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: {
      "content-length": String(Buffer.byteLength(json)),
      "content-type": "application/json",
    },
  });
}

let tokenExchangeRequest;
const exchangeResult = await exchangeGoogleAuthorizationCode(
  googleConfig,
  "authorization-code",
  async (url, init) => {
    tokenExchangeRequest = { url: String(url), init };
    return googleJsonResponse({
      access_token: "access-token",
      refresh_token: "refresh-token",
      expires_in: 3600,
      scope: exactScopeString,
      token_type: "Bearer",
    });
  },
);
assert.equal(exchangeResult.ok, true);
assert.equal(tokenExchangeRequest.url, "https://oauth2.googleapis.com/token");
assert.equal(tokenExchangeRequest.init.method, "POST");
assert.equal(tokenExchangeRequest.init.redirect, "error");
assert.ok(tokenExchangeRequest.init.signal instanceof AbortSignal);
assert.equal(
  tokenExchangeRequest.init.headers["Content-Type"],
  "application/x-www-form-urlencoded",
);
const exchangeBody = new URLSearchParams(tokenExchangeRequest.init.body);
assert.equal(exchangeBody.get("client_id"), googleConfig.clientId);
assert.equal(exchangeBody.get("client_secret"), googleConfig.clientSecret);
assert.equal(exchangeBody.get("code"), "authorization-code");
assert.equal(exchangeBody.get("grant_type"), "authorization_code");
assert.equal(exchangeBody.get("redirect_uri"), googleConfig.redirectUri);

let userInfoRequest;
assert.deepEqual(
  await fetchGoogleUserIdentity("access-token", async (url, init) => {
    userInfoRequest = { url: String(url), init };
    return googleJsonResponse({
      sub: "google-subject-123",
      email: "owner@example.com",
      email_verified: true,
    });
  }),
  {
    ok: true,
    identity: { subject: "google-subject-123", email: "owner@example.com" },
  },
);
assert.equal(
  userInfoRequest.url,
  "https://openidconnect.googleapis.com/v1/userinfo",
);
assert.equal(userInfoRequest.init.method, "GET");
assert.equal(userInfoRequest.init.headers.Authorization, "Bearer access-token");
assert.equal(userInfoRequest.init.redirect, "error");

let refreshRequest;
const refreshResult = await refreshGoogleAccessToken(
  googleConfig,
  "refresh-token",
  async (url, init) => {
    refreshRequest = { url: String(url), init };
    return googleJsonResponse({
      access_token: "refreshed-access-token",
      expires_in: 3600,
      scope: exactScopeString,
      token_type: "Bearer",
    });
  },
);
assert.deepEqual(refreshResult, {
  ok: true,
  grant: {
    accessToken: "refreshed-access-token",
    refreshToken: "refresh-token",
    expiresInSeconds: 3600,
    scopes: GOOGLE_WORKSPACE_SCOPES,
  },
});
const refreshBody = new URLSearchParams(refreshRequest.init.body);
assert.equal(refreshBody.get("grant_type"), "refresh_token");
assert.equal(refreshBody.get("refresh_token"), "refresh-token");

let calendarTestRequest;
assert.deepEqual(
  await verifyGoogleCalendarReadOnly(
    "access-token",
    fixedNow,
    async (url, init) => {
      calendarTestRequest = { url: new URL(String(url)), init };
      return googleJsonResponse({ kind: "calendar#events", items: [] });
    },
  ),
  { ok: true },
);
assert.equal(calendarTestRequest.url.origin, "https://www.googleapis.com");
assert.equal(
  calendarTestRequest.url.pathname,
  "/calendar/v3/calendars/primary/events",
);
assert.equal(calendarTestRequest.url.searchParams.get("maxResults"), "1");
assert.equal(calendarTestRequest.url.searchParams.get("singleEvents"), "true");
assert.equal(
  calendarTestRequest.url.searchParams.get("timeMin"),
  fixedNow.toISOString(),
);
assert.equal(calendarTestRequest.init.method, "GET");
assert.equal(calendarTestRequest.init.body, undefined);

let revokeRequest;
assert.deepEqual(
  await revokeGoogleGrant("refresh-token", async (url, init) => {
    revokeRequest = { url: String(url), init };
    return new Response(null, { status: 200 });
  }),
  { ok: true },
);
assert.equal(revokeRequest.url, "https://oauth2.googleapis.com/revoke");
assert.equal(revokeRequest.init.method, "POST");
assert.equal(
  new URLSearchParams(revokeRequest.init.body).get("token"),
  "refresh-token",
);

assert.deepEqual(
  await refreshGoogleAccessToken(googleConfig, "refresh-token", async () =>
    googleJsonResponse({ error: "invalid_grant" }, 400),
  ),
  { ok: false, errorCode: "REAUTH_REQUIRED", status: 400 },
);
assert.deepEqual(
  await fetchGoogleUserIdentity("access-token", async () =>
    googleJsonResponse({ error: { status: "PERMISSION_DENIED" } }, 403),
  ),
  { ok: false, errorCode: "CONFIGURATION_ERROR", status: 403 },
);
assert.deepEqual(
  await verifyGoogleCalendarReadOnly("access-token", fixedNow, async () =>
    googleJsonResponse({ kind: "calendar#events", items: [] }, 429),
  ),
  { ok: false, errorCode: "RATE_LIMITED", status: 429 },
);
assert.deepEqual(
  await exchangeGoogleAuthorizationCode(
    googleConfig,
    "authorization-code",
    async () => new Response("redirect", { status: 302 }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE", status: 302 },
);
assert.deepEqual(
  await exchangeGoogleAuthorizationCode(
    googleConfig,
    "authorization-code",
    async () =>
      new Response("x".repeat(64 * 1024 + 1), {
        status: 200,
        headers: { "content-length": String(64 * 1024 + 1) },
      }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE", status: 200 },
);
assert.deepEqual(
  await fetchGoogleUserIdentity("access-token", async () => {
    throw new DOMException("Aborted", "AbortError");
  }),
  { ok: false, errorCode: "NETWORK_ERROR", status: null },
);

const appointment = normalizeGoogleCalendarAppointment(
  {
    summary: "  Product demo  ",
    description: "Discuss Revora",
    location: "Video call",
    start: "2026-08-22T10:00:00-05:00",
    end: "2026-08-22T10:45:00-05:00",
    timeZone: "America/Chicago",
    attendee: " Lead@Example.com ",
  },
  fixedNow,
);
assert.deepEqual(appointment, {
  summary: "Product demo",
  description: "Discuss Revora",
  location: "Video call",
  start: "2026-08-22T10:00:00-05:00",
  end: "2026-08-22T10:45:00-05:00",
  timeZone: "America/Chicago",
  attendee: "lead@example.com",
  durationMinutes: 45,
});
assert.deepEqual(buildGoogleCalendarEventRequest(appointment), {
  url: "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
  body: {
    summary: "Product demo",
    description: "Discuss Revora",
    location: "Video call",
    start: {
      dateTime: "2026-08-22T10:00:00-05:00",
      timeZone: "America/Chicago",
    },
    end: {
      dateTime: "2026-08-22T10:45:00-05:00",
      timeZone: "America/Chicago",
    },
    attendees: [{ email: "lead@example.com" }],
  },
});
const appointmentWithoutAttendee = normalizeGoogleCalendarAppointment(
  {
    summary: "Internal review",
    start: "2026-08-22T15:00:00Z",
    end: "2026-08-22T15:30:00Z",
    timeZone: "UTC",
  },
  fixedNow,
);
assert.equal(
  buildGoogleCalendarEventRequest(appointmentWithoutAttendee).url,
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=none",
);
for (const invalid of [
  {
    summary: "",
    start: "2026-08-22T15:00:00Z",
    end: "2026-08-22T15:30:00Z",
    timeZone: "UTC",
  },
  {
    summary: "Bad order",
    start: "2026-08-22T15:30:00Z",
    end: "2026-08-22T15:00:00Z",
    timeZone: "UTC",
  },
  {
    summary: "Too long",
    start: "2026-08-22T15:00:00Z",
    end: "2026-08-23T15:00:01Z",
    timeZone: "UTC",
  },
  {
    summary: "No offset",
    start: "2026-08-22T15:00:00",
    end: "2026-08-22T15:30:00",
    timeZone: "UTC",
  },
  {
    summary: "Bad zone",
    start: "2026-08-22T15:00:00Z",
    end: "2026-08-22T15:30:00Z",
    timeZone: "Mars/Olympus",
  },
  {
    summary: "Too far",
    start: "2029-08-22T15:00:00Z",
    end: "2029-08-22T15:30:00Z",
    timeZone: "UTC",
  },
  {
    summary: "Bad attendee",
    start: "2026-08-22T15:00:00Z",
    end: "2026-08-22T15:30:00Z",
    timeZone: "UTC",
    attendee: "not-an-email",
  },
]) {
  assert.throws(() => normalizeGoogleCalendarAppointment(invalid, fixedNow));
}
assert.deepEqual(
  parseGoogleCalendarEventResponse({
    id: "event-123",
    htmlLink: "https://calendar.google.com/calendar/event?eid=abc",
  }),
  { eventId: "event-123" },
);
assert.throws(() => parseGoogleCalendarEventResponse({ id: "" }));

let calendarCreateRequest;
assert.deepEqual(
  await createGoogleCalendarAppointmentWithAccessToken(
    "access-token",
    appointment,
    async (url, init) => {
      calendarCreateRequest = { url: String(url), init };
      return googleJsonResponse({ id: "event-123" });
    },
  ),
  {
    ok: true,
    eventId: "event-123",
    durationMinutes: 45,
    hasAttendee: true,
  },
);
assert.equal(
  calendarCreateRequest.url,
  "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
);
assert.equal(calendarCreateRequest.init.method, "POST");
assert.equal(calendarCreateRequest.init.redirect, "error");
assert.equal(
  calendarCreateRequest.init.headers.Authorization,
  "Bearer access-token",
);
assert.equal(
  calendarCreateRequest.init.headers["Content-Type"],
  "application/json",
);
assert.deepEqual(JSON.parse(calendarCreateRequest.init.body), {
  summary: "Product demo",
  description: "Discuss Revora",
  location: "Video call",
  start: {
    dateTime: "2026-08-22T10:00:00-05:00",
    timeZone: "America/Chicago",
  },
  end: {
    dateTime: "2026-08-22T10:45:00-05:00",
    timeZone: "America/Chicago",
  },
  attendees: [{ email: "lead@example.com" }],
});
let calendarFailureCalls = 0;
assert.deepEqual(
  await createGoogleCalendarAppointmentWithAccessToken(
    "access-token",
    appointmentWithoutAttendee,
    async () => {
      calendarFailureCalls += 1;
      return googleJsonResponse({ error: { status: "UNAVAILABLE" } }, 503);
    },
  ),
  { ok: false, errorCode: "PROVIDER_UNAVAILABLE", status: 503 },
);
assert.equal(calendarFailureCalls, 1);

const email = normalizeGoogleEmailInput({
  to: " Lead@Example.com ",
  subject: " Próxima reunión ",
  body: "Hola,\n\nConfirmamos la reunión.",
});
assert.deepEqual(email, {
  to: "lead@example.com",
  subject: "Próxima reunión",
  body: "Hola,\n\nConfirmamos la reunión.",
});
const encodedMessage = buildGoogleRawEmail(email);
assert.match(encodedMessage, /^[A-Za-z0-9_-]+$/);
assert.doesNotMatch(encodedMessage, /=/);
const decodedMessage = Buffer.from(encodedMessage, "base64url").toString(
  "utf8",
);
assert.match(decodedMessage, /^To: lead@example\.com\r\n/);
assert.match(decodedMessage, /Subject: =\?UTF-8\?B\?.+\?=\r\n/);
assert.match(decodedMessage, /Content-Type: text\/plain; charset=UTF-8\r\n/);
assert.match(decodedMessage, /\r\n\r\nHola,\r\n\r\nConfirmamos la reunión\.$/);
for (const invalid of [
  { to: "not-an-email", subject: "Hello", body: "Body" },
  { to: "a@example.com,b@example.com", subject: "Hello", body: "Body" },
  { to: "a@example.com", subject: "Hello\r\nBcc: x@example.com", body: "Body" },
  { to: "a@example.com", subject: "", body: "Body" },
  { to: "a@example.com", subject: "Hello", body: "" },
  { to: "a@example.com", subject: "Hello", body: "x".repeat(20_001) },
]) {
  assert.throws(() => normalizeGoogleEmailInput(invalid));
}
assert.deepEqual(parseGmailSendResponse({ id: "message-123" }), {
  messageId: "message-123",
});
assert.throws(() => parseGmailSendResponse({ threadId: "thread-123" }));

let gmailSendRequest;
assert.deepEqual(
  await sendGoogleWorkspaceEmailWithAccessToken(
    "access-token",
    email,
    async (url, init) => {
      gmailSendRequest = { url: String(url), init };
      return googleJsonResponse({ id: "message-123" });
    },
  ),
  { ok: true, messageId: "message-123" },
);
assert.equal(
  gmailSendRequest.url,
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
);
assert.equal(gmailSendRequest.init.method, "POST");
assert.equal(gmailSendRequest.init.redirect, "error");
assert.equal(
  gmailSendRequest.init.headers.Authorization,
  "Bearer access-token",
);
assert.equal(gmailSendRequest.init.headers["Content-Type"], "application/json");
assert.deepEqual(JSON.parse(gmailSendRequest.init.body), {
  raw: encodedMessage,
});
let gmailFailureCalls = 0;
assert.deepEqual(
  await sendGoogleWorkspaceEmailWithAccessToken(
    "access-token",
    email,
    async () => {
      gmailFailureCalls += 1;
      return googleJsonResponse({ error: { status: "UNAVAILABLE" } }, 503);
    },
  ),
  { ok: false, errorCode: "PROVIDER_UNAVAILABLE", status: 503 },
);
assert.equal(gmailFailureCalls, 1);

const tallyMigrationPath = resolve(
  "supabase/migrations/00034_phase_14_6e_tally_inbound.sql",
);
assert.equal(
  createHash("sha256").update(readFileSync(tallyMigrationPath)).digest("hex"),
  "d0ce003d57c42a612da497efccaaf28013c24de7b701938a04604d0b3329e643",
  "Migration 00034 must remain immutable.",
);
const googleMigration = readFileSync(
  resolve("supabase/migrations/00035_phase_14_6f_google_workspace_audit.sql"),
  "utf8",
);
for (const establishedEventType of [
  "connected",
  "disconnected",
  "reconnected",
  "credentials_rotated",
  "connection_failed",
  "token_refreshed",
  "token_refresh_failed",
  "webhook_verified",
  "webhook_delivered",
  "webhook_delivery_failed",
  "contact_synced",
  "webhook_received",
  "webhook_duplicate",
  "webhook_rejected",
  "lead_captured",
]) {
  assert.ok(
    googleMigration.includes(`'${establishedEventType}'`),
    `Migration 00035 must preserve ${establishedEventType}.`,
  );
}
assert.ok(googleMigration.includes("'calendar_event_created'"));
assert.ok(googleMigration.includes("'gmail_message_sent'"));
assert.equal(
  googleMigration.includes("create table"),
  false,
  "Migration 00035 must only extend the audit event allowlist.",
);

const providerCatalogSource = readFileSync(
  resolve("src/lib/integrations/providers.ts"),
  "utf8",
);
assert.ok(
  providerCatalogSource.includes(
    '"https://www.googleapis.com/auth/calendar.events.owned"',
  ),
);
assert.equal(
  providerCatalogSource.includes(
    'requiredScopes: ["https://www.googleapis.com/auth/calendar"]',
  ),
  false,
);
assert.equal(providerCatalogSource.includes("Send and track emails"), false);

const integrationPanelSource = readFileSync(
  resolve("src/app/(dashboard)/settings/integrations-panel.tsx"),
  "utf8",
);
for (const lifecycleAction of [
  "startGoogleWorkspaceOAuth",
  "testGoogleCalendar",
  "testGmail",
  "disconnectGoogleWorkspace",
]) {
  assert.ok(
    integrationPanelSource.includes(lifecycleAction),
    `Settings must wire ${lifecycleAction}.`,
  );
}
assert.match(
  integrationPanelSource,
  /providerId === "google-calendar" \|\| providerId === "gmail"/,
);

const integrationActionsSource = readFileSync(
  resolve("src/app/(dashboard)/settings/integrations-actions.ts"),
  "utf8",
);
for (const actionName of [
  "startGoogleWorkspaceOAuth",
  "testGoogleCalendar",
  "testGmail",
  "disconnectGoogleWorkspace",
]) {
  const start = integrationActionsSource.indexOf(
    `export async function ${actionName}`,
  );
  assert.ok(start >= 0, `${actionName} server action must exist.`);
  const next = integrationActionsSource.indexOf(
    "\nexport async function ",
    start + 1,
  );
  const body = integrationActionsSource.slice(
    start,
    next === -1 ? integrationActionsSource.length : next,
  );
  assert.ok(
    body.includes('"integrations.manage"'),
    `${actionName} must re-authorize integrations.manage.`,
  );
}

console.log("Phase 14.6F Google Workspace contract verification passed.");
