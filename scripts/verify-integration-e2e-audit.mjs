import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const EXPECTED_PROVIDERS = [
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
];
const IMMUTABLE_MIGRATION_BASELINE = "a3b4f95";

function source(path) {
  return readFileSync(resolve(path), "utf8").replace(/\r\n/g, "\n");
}

function functionBody(text, name) {
  const start = text.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `Missing exported function: ${name}`);
  const next = text.indexOf("\nexport ", start + 1);
  return text.slice(start, next === -1 ? text.length : next);
}

function providerBlock(text, provider) {
  const start = text.indexOf(`id: "${provider}"`);
  assert.notEqual(start, -1, `Missing provider catalog entry: ${provider}`);
  const next = text.indexOf("\n  {", start + 1);
  return text.slice(start, next === -1 ? text.length : next);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function normalizedBuffer(value) {
  return value
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}

const providersSource = source("src/lib/integrations/providers.ts");
const typesSource = source("src/lib/integrations/types.ts");
const providerIds = [
  ...typesSource
    .slice(
      typesSource.indexOf("INTEGRATION_PROVIDER_IDS"),
      typesSource.indexOf("] as const;"),
    )
    .matchAll(/"([a-z0-9-]+)"/g),
].map((match) => match[1]);
assert.deepEqual(providerIds, EXPECTED_PROVIDERS);
assert.deepEqual(
  [...providersSource.matchAll(/\bid: "([a-z0-9-]+)"/g)].map(
    (match) => match[1],
  ),
  EXPECTED_PROVIDERS,
);

const databaseAllowlist = source(
  "supabase/migrations/00033_phase_14_6c_automation_webhooks.sql",
);
for (const provider of EXPECTED_PROVIDERS) {
  assert.ok(
    databaseAllowlist.includes(`'${provider}'`),
    `Database provider allowlist is missing ${provider}.`,
  );
}

const googleContract = source(
  "src/lib/integrations/google-workspace-contract.ts",
);
for (const scope of [
  '"openid"',
  '"email"',
  '"https://www.googleapis.com/auth/calendar.events.owned"',
  '"https://www.googleapis.com/auth/gmail.send"',
]) {
  assert.ok(googleContract.includes(scope), `Missing Google scope ${scope}.`);
}
assert.doesNotMatch(
  googleContract,
  /auth\/calendar["\s,]|auth\/gmail\.readonly|auth\/gmail\.modify|mail\.google\.com/,
);

const oauth = source("src/lib/integrations/oauth.ts");
const generateState = functionBody(oauth, "generateOAuthState");
const storeVerifier = functionBody(oauth, "storePKCEVerifier");
const validateState = functionBody(oauth, "validateOAuthState");
assert.match(generateState, /randomBytes\(32\)/);
assert.match(generateState, /createHash\("sha256"\)/);
assert.match(generateState, /if \(error\)/);
assert.match(storeVerifier, /encryptCredential\(verifier\)/);
assert.match(storeVerifier, /if \(error/);
assert.match(validateState, /data\.organization_id !== organizationId/);
assert.match(validateState, /data\.provider !== provider/);
assert.match(validateState, /new Date\(data\.expires_at\) < new Date\(\)/);
assert.match(validateState, /\.is\("consumed_at", null\)/);
assert.match(validateState, /\.select\("id"\)/);
assert.match(validateState, /if \(consumeError \|\| !consumed\)/);
assert.match(validateState, /decryptCredential\(/);
assert.ok(
  validateState.indexOf("decryptCredential(") >
    validateState.indexOf("if (consumeError || !consumed)"),
  "PKCE may only be decrypted after atomic state consumption.",
);

const hubspotCatalog = providerBlock(providersSource, "hubspot");
assert.match(hubspotCatalog, /authType: "oauth2"/);
assert.match(hubspotCatalog, /supportsOAuth: true/);
assert.match(hubspotCatalog, /supportsApiKey: false/);
const ghlCatalog = providerBlock(providersSource, "gohighlevel");
assert.match(ghlCatalog, /authType: "oauth2"/);
assert.match(ghlCatalog, /supportsOAuth: true/);
assert.match(ghlCatalog, /supportsApiKey: false/);

const connections = source("src/lib/integrations/connections.ts");
for (const name of [
  "getConnection",
  "listConnections",
  "getActiveTallyConnection",
  "listActiveAutomationWebhookConnections",
  "disconnectConnection",
  "getDecryptedCredentials",
  "markConnectionHealthy",
  "markConnectionError",
  "rotateCredentials",
]) {
  assert.match(
    functionBody(connections, name),
    /\.eq\("organization_id", (?:input\.)?organizationId\)/,
    `${name} must be organization-scoped.`,
  );
}
const saveConnection = functionBody(connections, "saveConnection");
assert.match(saveConnection, /organization_id: organizationId/);
assert.match(saveConnection, /onConflict: "organization_id, provider"/);
assert.match(saveConnection, /encryptCredentialsObject/);
assert.match(
  functionBody(connections, "getActiveGoogleWorkspaceConnection"),
  /loadGoogleWorkspaceConnection\(organizationId/,
);
assert.match(
  functionBody(connections, "rotateCredentials"),
  /encryptCredentialsObject/,
);
assert.match(
  functionBody(connections, "disconnectConnection"),
  /credentials: \{\}/,
);

const actions = source("src/app/(dashboard)/settings/integrations-actions.ts");
for (const name of [
  "saveIntegration",
  "saveAutomationWebhookIntegration",
  "deleteIntegration",
  "testIntegration",
  "startHubSpotOAuth",
  "startGHLOAuth",
  "startSlackOAuth",
  "startGoogleWorkspaceOAuth",
  "discoverTallyForms",
  "inspectTallyForm",
  "connectTally",
  "testTally",
  "disconnectTally",
  "saveTwilioIntegration",
  "disconnectHubSpot",
  "disconnectGHL",
  "disconnectSlack",
  "disconnectTwilio",
  "disconnectGoogleWorkspace",
  "testHubSpot",
  "testGHL",
  "testSlack",
  "testTwilio",
  "testGoogleCalendar",
  "testGmail",
]) {
  assert.match(
    functionBody(actions, name),
    /requireCurrentOrganizationPermission\(\s*"integrations\.manage"/,
    `${name} must re-authorize integrations.manage.`,
  );
}
assert.match(
  functionBody(actions, "getOrganizationIntegrations"),
  /requireCurrentOrganizationPermission\("integrations\.read"\)/,
);
const safeConnections = functionBody(actions, "getSafeConnections");
assert.match(
  safeConnections,
  /requireCurrentOrganizationPermission\("integrations\.read"\)/,
);
assert.doesNotMatch(
  safeConnections,
  /credentials|config|webhookUrl|accessToken|refreshToken|apiKey|authToken|signingSecret|verifier/,
);

const genericSave = functionBody(actions, "saveIntegration");
for (const provider of [
  "hubspot",
  "gohighlevel",
  "slack",
  "twilio",
  "tally",
  "google-calendar",
  "gmail",
]) {
  assert.ok(
    genericSave.includes(`provider === "${provider}"`),
    `Generic save must reject specialized provider ${provider}.`,
  );
}
assert.ok(genericSave.includes("isAutomationWebhookProvider(provider)"));
const genericDelete = functionBody(actions, "deleteIntegration");
for (const provider of [
  "hubspot",
  "gohighlevel",
  "slack",
  "twilio",
  "tally",
  "google-calendar",
  "gmail",
]) {
  assert.ok(
    genericDelete.includes(`provider === "${provider}"`),
    `Generic disconnect must reject specialized provider ${provider}.`,
  );
}

const tallyRoute = source("src/lib/integrations/tally-webhook-route.ts");
assert.match(tallyRoute, /MAX_TALLY_BODY_BYTES = 1024 \* 1024/);
assert.match(tallyRoute, /verifyTallySignature/);
assert.doesNotMatch(tallyRoute, /request\.json\(\)/);
const webhookRepository = source("src/lib/integrations/webhooks.ts");
assert.match(
  webhookRepository,
  /\.eq\("organization_id", params\.organizationId\)/,
);
assert.match(
  webhookRepository,
  /\.eq\("attempt_count", existing\.attempt_count\)/,
);
assert.match(
  webhookRepository,
  /\.eq\("last_attempt_at", existing\.last_attempt_at\)/,
);

const dispatcher = source("src/lib/automation/webhook-dispatcher.ts");
assert.match(dispatcher, /const MAX_ATTEMPTS = 5/);
assert.match(
  dispatcher,
  /event_snapshot\.organization_id === claimed\.organization_id/,
);
assert.match(dispatcher, /nextAttempt < MAX_ATTEMPTS/);
const googleAdapter = source(
  "src/lib/integrations/adapters/google-workspace.ts",
);
assert.match(googleAdapter, /redirect: "error"/);
assert.match(googleAdapter, /REQUEST_TIMEOUT_MS = 15_000/);
assert.match(googleAdapter, /MAX_RESPONSE_BYTES = 64 \* 1024/);
assert.doesNotMatch(
  googleAdapter,
  /for \s*\([^)]*attempt|while \s*\([^)]*retry/i,
);
const hubspotAdapter = source("src/lib/integrations/adapters/hubspot.ts");
const ghlAdapter = source("src/lib/integrations/adapters/gohighlevel.ts");
for (const [provider, adapter] of [
  ["HubSpot", hubspotAdapter],
  ["GoHighLevel", ghlAdapter],
]) {
  assert.match(adapter, /MAX_RESPONSE_BYTES = 64 \* 1024/);
  assert.match(adapter, /readBoundedJson/);
  assert.match(adapter, /redirect: "error"/);
  assert.doesNotMatch(adapter, /await res\.json\(\)/);
  assert.match(
    adapter,
    /persistenceError/,
    `${provider} must check connection persistence failures.`,
  );
}
assert.match(hubspotAdapter, /refreshPersistenceError/);
assert.match(hubspotAdapter, /!validated\.valid \|\| !validated\.verifier/);
assert.match(
  hubspotAdapter,
  /body\.set\("code_verifier", validated\.verifier\)/,
);
assert.match(ghlAdapter, /refreshPersistenceError/);
assert.match(ghlAdapter, /creds\["company_id"\]/);
assert.doesNotMatch(ghlAdapter, /provider_message:/);
const crmSyncActions = source("src/app/(dashboard)/leads/sync-actions.ts");
assert.match(crmSyncActions, /hubspotApi/);
assert.match(crmSyncActions, /ghlApi/);
assert.doesNotMatch(
  crmSyncActions,
  /\bfetch\(/,
  "Active CRM sync must use bounded fixed-origin adapter transports.",
);
assert.doesNotMatch(crmSyncActions, /providerMessage\.substring/);
const twilioAdapter = source("src/lib/integrations/adapters/twilio.ts");
assert.doesNotMatch(
  twilioAdapter,
  /Messages\.create|messages\.create|\/Messages\.json/,
);

const srcRoot = resolve("src");
for (const path of walk(srcRoot).filter((path) => path.endsWith(".tsx"))) {
  const text = readFileSync(path, "utf8");
  if (!/^\s*["']use client["'];/m.test(text)) continue;
  assert.doesNotMatch(
    text,
    /@\/lib\/integrations\/adapters\//,
    `Client component imports a server provider adapter: ${relative(srcRoot, path)}`,
  );
}

const migrationsDirectory = resolve("supabase/migrations");
const immutableMigrationNames = readdirSync(migrationsDirectory)
  .filter((name) => /^000(?:0[1-9]|[12][0-9]|3[0-5])_/.test(name))
  .sort();
assert.equal(immutableMigrationNames.length, 35);
for (const name of immutableMigrationNames) {
  const gitPath = `supabase/migrations/${name}`;
  const baseline = execFileSync("git", [
    "show",
    `${IMMUTABLE_MIGRATION_BASELINE}:${gitPath}`,
  ]);
  const head = execFileSync("git", ["show", `HEAD:${gitPath}`]);
  const working = readFileSync(resolve(migrationsDirectory, name));
  assert.equal(
    normalizedBuffer(head),
    normalizedBuffer(baseline),
    `${name} changed after the 14.6F checkpoint.`,
  );
  assert.equal(
    normalizedBuffer(working),
    normalizedBuffer(head),
    `${name} working content differs from HEAD.`,
  );
}

const auditReportPath = resolve(
  "docs/audits/PHASE_14.6G_INTEGRATION_E2E_AUDIT_2026-08-21.md",
);
assert.ok(
  statSync(auditReportPath).isFile(),
  "Missing Phase 14.6G audit report.",
);
const auditReport = source(auditReportPath);
for (const provider of EXPECTED_PROVIDERS) {
  assert.match(
    auditReport,
    new RegExp(`\\| ${provider.replace("-", "\\-")} \\|`, "i"),
    `Audit report has no live-status row for ${provider}.`,
  );
}

console.log("Phase 14.6G integration E2E audit verification passed.");
