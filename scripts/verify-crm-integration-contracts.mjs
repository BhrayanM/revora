import assert from "node:assert/strict";

import {
  ghlApi,
  ghlSafeErrorMessage,
} from "../src/lib/integrations/adapters/gohighlevel.ts";
import { hubspotApi } from "../src/lib/integrations/adapters/hubspot.ts";

function jsonResponse(body, status = 200, headers = {}) {
  const encoded = JSON.stringify(body);
  return new Response(encoded, {
    status,
    headers: {
      "content-length": String(Buffer.byteLength(encoded)),
      "content-type": "application/json",
      ...headers,
    },
  });
}

const originalFetch = globalThis.fetch;
let hubspotRequest;
globalThis.fetch = async (url, init) => {
  hubspotRequest = { url: String(url), init };
  return jsonResponse({ results: [] });
};
const hubspotResult = await hubspotApi(
  "hubspot-access-token",
  "/crm/v3/objects/contacts?limit=1",
);
assert.equal(hubspotResult.ok, true);
assert.deepEqual(hubspotResult.data, { results: [] });
assert.equal(
  hubspotRequest.url,
  "https://api.hubapi.com/crm/v3/objects/contacts?limit=1",
);
assert.equal(hubspotRequest.init.redirect, "error");
assert.ok(hubspotRequest.init.signal instanceof AbortSignal);
assert.equal(
  hubspotRequest.init.headers.Authorization,
  "Bearer hubspot-access-token",
);

globalThis.fetch = async () =>
  new Response("x", {
    status: 200,
    headers: { "content-length": String(64 * 1024 + 1) },
  });
assert.equal(
  (await hubspotApi("hubspot-access-token", "/crm/v3/objects/contacts")).ok,
  false,
);

let ghlRequest;
globalThis.fetch = async (url, init) => {
  ghlRequest = { url: String(url), init };
  return jsonResponse({ contacts: [] });
};
const ghlResult = await ghlApi(
  "ghl-access-token",
  "/contacts/?limit=1&locationId=location-1",
);
assert.equal(ghlResult.ok, true);
assert.deepEqual(ghlResult.data, { contacts: [] });
assert.equal(
  ghlRequest.url,
  "https://services.leadconnectorhq.com/contacts/?limit=1&locationId=location-1",
);
assert.equal(ghlRequest.init.redirect, "error");
assert.ok(ghlRequest.init.signal instanceof AbortSignal);
assert.equal(ghlRequest.init.headers.Authorization, "Bearer ghl-access-token");
assert.equal(ghlRequest.init.headers.Version, "2021-07-28");

globalThis.fetch = async () =>
  new Response("x".repeat(64 * 1024 + 1), { status: 200 });
assert.equal((await ghlApi("ghl-access-token", "/contacts/")).ok, false);

for (const message of [
  ghlSafeErrorMessage(422, { message: "lead-private@example.com" }),
  ghlSafeErrorMessage(400, { error_description: "oauth-secret-value" }),
]) {
  assert.doesNotMatch(message, /lead-private|oauth-secret/);
}

globalThis.fetch = originalFetch;
console.log("Phase 14.6G CRM integration transport verification passed.");
