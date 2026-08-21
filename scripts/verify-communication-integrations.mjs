import assert from "node:assert/strict";

import {
  buildSlackAuthorizationUrl,
  normalizeSlackError,
  parseSlackOAuthPayload,
  shouldSendSlackHotAlert,
} from "../src/lib/integrations/slack-contract.ts";
import { sendHOTLeadAlert } from "../src/lib/notifications/slack.ts";
import {
  normalizeTwilioError,
  normalizeTwilioCredentials,
  validateTwilioAccountReadOnly,
  validateTwilioSignature,
} from "../src/lib/integrations/twilio-contract.ts";

const slackUrl = new URL(
  buildSlackAuthorizationUrl({
    clientId: "111.222",
    redirectUri: "https://app.revora.test/api/integrations/slack/callback",
    state: "opaque-state",
  }),
);
assert.equal(slackUrl.origin, "https://slack.com");
assert.equal(slackUrl.pathname, "/oauth/v2/authorize");
assert.equal(slackUrl.searchParams.get("client_id"), "111.222");
assert.equal(
  slackUrl.searchParams.get("redirect_uri"),
  "https://app.revora.test/api/integrations/slack/callback",
);
assert.equal(slackUrl.searchParams.get("scope"), "incoming-webhook");
assert.equal(slackUrl.searchParams.get("state"), "opaque-state");

const slackGrant = parseSlackOAuthPayload({
  ok: true,
  access_token: "xoxb-test",
  scope: "incoming-webhook",
  team: { id: "T123", name: "Revora Test" },
  incoming_webhook: {
    channel: "#hot-leads",
    channel_id: "C123",
    configuration_url: "https://slack.com/app_redirect?channel=C123",
    url: "https://hooks.slack.com/services/T/B/X",
  },
});
assert.deepEqual(slackGrant, {
  accessToken: "xoxb-test",
  scope: ["incoming-webhook"],
  teamId: "T123",
  teamName: "Revora Test",
  channelId: "C123",
  channelName: "hot-leads",
  webhookUrl: "https://hooks.slack.com/services/T/B/X",
});
assert.throws(
  () => parseSlackOAuthPayload({ ok: false, error: "invalid_code" }),
  /Slack authorization failed/,
);
assert.throws(
  () =>
    parseSlackOAuthPayload({
      ok: true,
      scope: "incoming-webhook",
      team: { id: "T123", name: "Revora Test" },
      incoming_webhook: {
        channel: "#hot-leads",
        channel_id: "C123",
        url: "https://hooks.slack.com/services/T/B/X",
      },
    }),
  /unexpected response/,
);
assert.throws(
  () =>
    parseSlackOAuthPayload({
      ok: true,
      access_token: "xoxb-test",
      scope: "incoming-webhook",
      incoming_webhook: {
        channel: "#hot-leads",
        channel_id: "C123",
        url: "https://hooks.slack.com/services/T/B/X",
      },
    }),
  /unexpected response/,
);
assert.throws(
  () =>
    parseSlackOAuthPayload({
      ok: true,
      access_token: "xoxb-test",
      scope: "incoming-webhook",
      team: { id: "T123", name: "Revora Test" },
    }),
  /unexpected response/,
);
assert.throws(
  () =>
    parseSlackOAuthPayload({
      ok: true,
      access_token: "xoxb-test",
      scope: "incoming-webhook",
      team: { id: "T123", name: "Revora Test" },
      incoming_webhook: {
        channel: "#hot-leads",
        channel_id: "C123",
        url: "https://hooks.slack.example/services/T/B/X",
      },
    }),
  /unexpected response/,
);
assert.equal(normalizeSlackError(401), "INVALID_CREDENTIALS");
assert.equal(normalizeSlackError(200, "invalid_auth"), "INVALID_CREDENTIALS");
assert.equal(normalizeSlackError(200, "missing_scope"), "CONFIGURATION_ERROR");
assert.equal(normalizeSlackError(429), "RATE_LIMITED");
assert.equal(normalizeSlackError(503), "PROVIDER_UNAVAILABLE");
assert.equal(normalizeSlackError(200, "malformed_payload"), "INVALID_RESPONSE");
assert.equal(shouldSendSlackHotAlert("HOT"), true);
assert.equal(shouldSendSlackHotAlert("WARM"), false);
assert.equal(shouldSendSlackHotAlert("COLD"), false);
assert.equal(shouldSendSlackHotAlert("hot"), false);

const hotLead = {
  first_name: "<script>alert(1)</script>",
  last_name: "Buyer & Co",
  email: "buyer@example.com",
  phone: "+15551234567",
  company: "Example > Rivals",
  score: 95,
  temperature: "HOT",
  summary: "Asked for pricing <today>",
  recommendedAction: "Call & qualify",
  source: "website",
  lead_url: "https://app.revora.test/leads/lead-1",
};
let capturedSlackRequest;
const successfulSlackFetch = async (url, init) => {
  capturedSlackRequest = { url: String(url), init };
  return new Response("ok", {
    status: 200,
    headers: { "content-length": "2" },
  });
};
assert.deepEqual(
  await sendHOTLeadAlert(
    "https://hooks.slack.com/services/T/B/X",
    hotLead,
    successfulSlackFetch,
  ),
  { success: true },
);
assert.equal(
  capturedSlackRequest.url,
  "https://hooks.slack.com/services/T/B/X",
);
assert.equal(capturedSlackRequest.init.redirect, "error");
assert.ok(capturedSlackRequest.init.signal instanceof AbortSignal);
assert.match(capturedSlackRequest.init.body, /&lt;script&gt;/);
assert.match(capturedSlackRequest.init.body, /Buyer &amp; Co/);

let invalidSlackFetchCalls = 0;
const invalidSlackFetch = async () => {
  invalidSlackFetchCalls += 1;
  return new Response("ok");
};
for (const invalidUrl of [
  "https://hooks.slack.com.evil.test/services/T/B/X",
  "https://hooks.slack.com:444/services/T/B/X",
  "https://user:pass@hooks.slack.com/services/T/B/X",
]) {
  const result = await sendHOTLeadAlert(invalidUrl, hotLead, invalidSlackFetch);
  assert.equal(result.success, false);
  assert.match(result.error, /Invalid Slack webhook URL/);
}
assert.equal(invalidSlackFetchCalls, 0);

const redirectResult = await sendHOTLeadAlert(
  "https://hooks.slack.com/services/T/B/X",
  hotLead,
  async () => new Response("redirect", { status: 302 }),
);
assert.equal(redirectResult.success, false);

const abortResult = await sendHOTLeadAlert(
  "https://hooks.slack.com/services/T/B/X",
  hotLead,
  async (_url, init) => {
    assert.ok(init.signal instanceof AbortSignal);
    throw new DOMException("Aborted", "AbortError");
  },
);
assert.equal(abortResult.success, false);
assert.equal(abortResult.error, "Slack request timed out");

const oversizedResult = await sendHOTLeadAlert(
  "https://hooks.slack.com/services/T/B/X",
  hotLead,
  async () =>
    new Response("x".repeat(64 * 1024 + 1), {
      status: 200,
      headers: { "content-length": String(64 * 1024 + 1) },
    }),
);
assert.equal(oversizedResult.success, false);
assert.equal(oversizedResult.error, "Slack response was too large");

const accountSid = `AC${"a".repeat(32)}`;
assert.deepEqual(
  normalizeTwilioCredentials({
    account_sid: accountSid,
    auth_token: "secret-token",
    phone_number: "+15551234567",
  }),
  {
    account_sid: accountSid,
    auth_token: "secret-token",
    phone_number: "+15551234567",
  },
);
assert.deepEqual(
  normalizeTwilioCredentials({
    account_sid: accountSid,
    auth_token: "secret-token",
    phone_number: "  ",
  }),
  {
    account_sid: accountSid,
    auth_token: "secret-token",
  },
);
assert.throws(
  () =>
    normalizeTwilioCredentials({
      account_sid: "AC123",
      auth_token: "secret-token",
    }),
  /Account SID/,
);
assert.throws(
  () =>
    normalizeTwilioCredentials({
      account_sid: accountSid,
      auth_token: "   ",
    }),
  /Auth Token/,
);
assert.throws(
  () =>
    normalizeTwilioCredentials({
      account_sid: accountSid,
      auth_token: "secret-token",
      phone_number: "555-123-4567",
    }),
  /E.164/,
);

const twilioSignatureFixture = {
  url: "https://example.com/myapp.php?foo=1&bar=2",
  params: {
    CallSid: "CA1234567890ABCDE",
    Caller: "+14158675310",
    Digits: "1234",
    From: "+14158675310",
    To: "+18005551212",
  },
  signature: "L/OH5YylLD5NRKLltdqwSvS0BnU=",
  authToken: "12345",
};
assert.equal(validateTwilioSignature(twilioSignatureFixture), true);
assert.equal(
  validateTwilioSignature({
    ...twilioSignatureFixture,
    url: "https://example.com/altered",
  }),
  false,
);
assert.equal(
  validateTwilioSignature({
    ...twilioSignatureFixture,
    params: { ...twilioSignatureFixture.params, Digits: "9999" },
  }),
  false,
);
assert.equal(
  validateTwilioSignature({
    ...twilioSignatureFixture,
    signature: "",
  }),
  false,
);
assert.equal(
  validateTwilioSignature({
    ...twilioSignatureFixture,
    authToken: "wrong-token",
  }),
  false,
);

const twilioJsonResponse = (body, status = 200) => {
  const json = JSON.stringify(body);
  return new Response(json, {
    status,
    headers: {
      "content-length": String(Buffer.byteLength(json)),
      "content-type": "application/json",
    },
  });
};
const twilioRequests = [];
const twilioReadOnlyFetch = async (url, init) => {
  twilioRequests.push({ url: String(url), init });
  if (twilioRequests.length === 1) {
    return twilioJsonResponse({
      sid: accountSid,
      friendly_name: "Revora Twilio",
      status: "active",
    });
  }
  return twilioJsonResponse({
    incoming_phone_numbers: [
      { sid: `PN${"b".repeat(32)}`, phone_number: "+15551234567" },
    ],
  });
};
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    {
      account_sid: accountSid,
      auth_token: "secret-token",
      phone_number: "+15551234567",
    },
    twilioReadOnlyFetch,
  ),
  {
    ok: true,
    accountSid,
    friendlyName: "Revora Twilio",
    phoneNumber: "+15551234567",
  },
);
assert.equal(twilioRequests.length, 2);
assert.equal(
  twilioRequests[0].url,
  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
);
assert.equal(twilioRequests[0].init.method, "GET");
assert.equal(
  twilioRequests[0].init.headers.Authorization,
  `Basic ${Buffer.from(`${accountSid}:secret-token`).toString("base64")}`,
);
assert.equal(twilioRequests[0].init.redirect, "error");
assert.ok(twilioRequests[0].init.signal instanceof AbortSignal);
assert.equal(
  twilioRequests[1].url,
  `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=%2B15551234567`,
);
for (const request of twilioRequests) {
  assert.equal(request.init.method, "GET");
  assert.doesNotMatch(request.url, /Messages|Calls|AvailablePhoneNumbers/);
}

const noPhoneRequests = [];
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    { account_sid: accountSid, auth_token: "secret-token" },
    async (url, init) => {
      noPhoneRequests.push({ url: String(url), init });
      return twilioJsonResponse({
        sid: accountSid,
        friendly_name: "Revora Twilio",
      });
    },
  ),
  { ok: true, accountSid, friendlyName: "Revora Twilio" },
);
assert.equal(noPhoneRequests.length, 1);

for (const [status, errorCode] of [
  [401, "INVALID_CREDENTIALS"],
  [403, "INVALID_CREDENTIALS"],
  [429, "RATE_LIMITED"],
  [500, "PROVIDER_UNAVAILABLE"],
]) {
  assert.deepEqual(
    await validateTwilioAccountReadOnly(
      { account_sid: accountSid, auth_token: "secret-token" },
      async () => twilioJsonResponse({ code: 20_003 }, status),
    ),
    { ok: false, errorCode },
  );
  assert.equal(normalizeTwilioError(status), errorCode);
}
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    { account_sid: accountSid, auth_token: "secret-token" },
    async () => {
      throw new DOMException("Aborted", "AbortError");
    },
  ),
  { ok: false, errorCode: "NETWORK_ERROR" },
);
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    { account_sid: accountSid, auth_token: "secret-token" },
    async () => new Response("{not-json", { status: 200 }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE" },
);
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    { account_sid: accountSid, auth_token: "secret-token" },
    async () =>
      twilioJsonResponse({
        sid: `AC${"c".repeat(32)}`,
        friendly_name: "Wrong account",
      }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE" },
);
let missingPhoneRequestCount = 0;
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    {
      account_sid: accountSid,
      auth_token: "secret-token",
      phone_number: "+15551234567",
    },
    async () => {
      missingPhoneRequestCount += 1;
      return missingPhoneRequestCount === 1
        ? twilioJsonResponse({
            sid: accountSid,
            friendly_name: "Revora Twilio",
          })
        : twilioJsonResponse({ incoming_phone_numbers: [] });
    },
  ),
  { ok: false, errorCode: "CONFIGURATION_ERROR" },
);
assert.deepEqual(
  await validateTwilioAccountReadOnly(
    { account_sid: accountSid, auth_token: "secret-token" },
    async () =>
      new Response("x".repeat(64 * 1024 + 1), {
        status: 200,
        headers: { "content-length": String(64 * 1024 + 1) },
      }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE" },
);

console.log("Phase 14.6D communication contract verification passed.");
