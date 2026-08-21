import assert from "node:assert/strict";

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

const fixedNow = new Date("2026-08-21T12:00:00.000Z");
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

console.log("Phase 14.6F Google Workspace contract verification passed.");
