import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  isPublicWebhookAddress,
  resolveWebhookTarget,
} from "../src/lib/integrations/webhook-security.ts";

assert.equal(isPublicWebhookAddress("8.8.8.8"), true);
assert.equal(isPublicWebhookAddress("127.0.0.1"), false);
assert.equal(isPublicWebhookAddress("10.0.0.1"), false);
assert.equal(isPublicWebhookAddress("169.254.169.254"), false);
assert.equal(isPublicWebhookAddress("168.63.129.16"), false);
assert.equal(isPublicWebhookAddress("192.168.1.1"), false);
assert.equal(isPublicWebhookAddress("::1"), false);
assert.equal(isPublicWebhookAddress("::ffff:127.0.0.1"), false);
assert.equal(isPublicWebhookAddress("64:ff9b::7f00:1"), false);
assert.equal(isPublicWebhookAddress("2002:7f00:1::"), false);
assert.equal(isPublicWebhookAddress("fc00::1"), false);
assert.equal(isPublicWebhookAddress("fe80::1"), false);
assert.equal(isPublicWebhookAddress("2606:4700:4700::1111"), true);

await assert.rejects(
  resolveWebhookTarget("http://8.8.8.8/webhook", "n8n"),
  /HTTPS/,
);
await assert.rejects(
  resolveWebhookTarget("https://localhost/webhook", "n8n"),
  /host is not allowed/,
);
await assert.rejects(
  resolveWebhookTarget("https://127.0.0.1/webhook", "n8n"),
  /non-public/,
);
await assert.rejects(
  resolveWebhookTarget("https://[::ffff:127.0.0.1]/webhook", "n8n"),
  /non-public/,
);
await assert.rejects(
  resolveWebhookTarget("https://user:pass@example.com/webhook", "n8n"),
  /embedded credentials/,
);
await assert.rejects(
  resolveWebhookTarget("https://example.com/hooks/catch/1/2", "zapier"),
  /not hosted by zapier/,
);
await assert.rejects(
  resolveWebhookTarget("https://example.com/custom-hook", "make"),
  /not hosted by make/,
);

const publicTarget = await resolveWebhookTarget(
  "https://8.8.8.8/revora",
  "n8n",
);
assert.equal(publicTarget.address, "8.8.8.8");

const publicIpv6Target = await resolveWebhookTarget(
  "https://[2606:4700:4700::1111]/revora",
  "n8n",
);
assert.equal(publicIpv6Target.address, "2606:4700:4700::1111");

const [dispatcherSource, transportSource, n8nAdapter, zapierAdapter, makeAdapter] =
  await Promise.all(
    [
      "../src/lib/automation/webhook-dispatcher.ts",
      "../src/lib/integrations/webhook-transport.ts",
      "../src/lib/integrations/adapters/n8n.ts",
      "../src/lib/integrations/adapters/zapier.ts",
      "../src/lib/integrations/adapters/make.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  );
assert.match(
  dispatcherSource,
  /event_snapshot\.organization_id === claimed\.organization_id/,
);
assert.match(dispatcherSource, /event_snapshot\.id === claimed\.event_id/);
assert.match(dispatcherSource, /event_snapshot\.type === claimed\.event_type/);
assert.match(transportSource, /status === 408 \|\| status === 425 \|\| status === 429 \|\| status >= 500/);
assert.match(transportSource, /Math\.min\(seconds \* 1_000, 60 \* 60 \* 1_000\)/);
assert.match(transportSource, /REDIRECT_NOT_ALLOWED/);
assert.match(transportSource, /request\.setTimeout\(REQUEST_TIMEOUT_MS/);
assert.match(transportSource, /options\.all === true/);
assert.match(
  transportSource,
  /callback\(null, \[\{ address: target\.address, family: target\.family \}\]\)/,
);
assert.match(n8nAdapter, /webhookSecret\.length < 16/);
assert.match(n8nAdapter, /"X-Revora-Webhook-Secret"/);
assert.match(zapierAdapter, /provider: "zapier"/);
assert.doesNotMatch(zapierAdapter, /authHeaders/);
assert.match(makeAdapter, /apiKey\.length < 8/);
assert.match(makeAdapter, /"x-make-apikey"/);

const workflow = JSON.parse(
  await readFile(
    new URL("../docs/n8n/lead-automation-workflow.json", import.meta.url),
    "utf8",
  ),
);
assert.equal(workflow.active, false);
assert.equal(workflow.nodes.length, 2);
assert.equal(workflow.nodes[0].parameters.authentication, "headerAuth");
assert.equal(workflow.nodes[0].parameters.responseMode, "lastNode");
assert.equal(
  workflow.nodes.some((node) => /hubspot|gohighlevel/i.test(node.name)),
  false,
);

const migration = await readFile(
  new URL(
    "../supabase/migrations/00033_phase_14_6c_automation_webhooks.sql",
    import.meta.url,
  ),
  "utf8",
);
assert.match(migration, /'zapier', 'make'/);
assert.match(migration, /'google_calendar', 'google-calendar'/);
assert.match(migration, /action = 'sync_contact'/);
assert.match(migration, /drop policy if exists "Service can insert executions"/);
assert.match(migration, /drop policy if exists "Service can update executions"/);
assert.doesNotMatch(migration, /alter table public\.leads/);

const operationalDocs = await Promise.all(
  [
    "../README.md",
    "../docs/DEPLOYMENT.md",
    "../docs/LIVE_E2E_TEST.md",
    "../docs/PRODUCTION_CHECKLIST.md",
    "../docs/PROVISIONING.md",
    "../docs/n8n-workflow-architecture.md",
    "../docs/n8n/README.md",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
const currentDocumentation = operationalDocs.join("\n");
assert.doesNotMatch(
  currentDocumentation,
  /N8N_WEBHOOK_URL|N8N_WEBHOOK_SECRET|N8N_INTERNAL_SECRET/,
);
assert.doesNotMatch(currentDocumentation, /api\/internal\/leads\/.*qualify/);

console.log("Phase 14.6C automation webhook verification passed.");
