import assert from "node:assert/strict";

import { buildSlackAuthorizationUrl } from "../src/lib/integrations/slack-contract.ts";
import {
  normalizeTwilioCredentials,
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

console.log("Phase 14.6D communication contract verification passed.");
