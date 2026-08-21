import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  createTallyWebhook,
  deleteTallyWebhook,
  getTallyFormFields,
  listTallyForms,
  verifyTallyWebhook,
} from "../src/lib/integrations/adapters/tally.ts";
import { handleTallyWebhookRequest } from "../src/lib/integrations/tally-webhook-route.ts";
import { ingestTallyWebhook } from "../src/lib/integrations/tally-ingestion.ts";
import {
  mapTallyEventToLeadInput,
  normalizeTallyApiKey,
  parseTallyFields,
  parseTallyForms,
  parseTallyWebhookEvent,
  suggestTallyFieldMapping,
  validateTallyFieldMapping,
  verifyTallySignature,
} from "../src/lib/integrations/tally-contract.ts";

assert.equal(normalizeTallyApiKey("  tally_test_key  "), "tally_test_key");
assert.throws(() => normalizeTallyApiKey(""), /required/i);
assert.throws(() => normalizeTallyApiKey("line\nbreak"), /invalid/i);

assert.deepEqual(
  parseTallyForms({
    items: [
      {
        id: "form-1",
        name: "Website leads",
        workspaceId: "workspace-1",
        status: "PUBLISHED",
        numberOfSubmissions: 12,
        isClosed: false,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-20T10:00:00.000Z",
      },
      {
        id: "deleted-form",
        name: "Deleted",
        workspaceId: "workspace-1",
        status: "DELETED",
        numberOfSubmissions: 0,
        isClosed: true,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-20T10:00:00.000Z",
      },
    ],
    page: 1,
    limit: 500,
    total: 2,
    hasMore: false,
  }),
  [
    {
      id: "form-1",
      name: "Website leads",
      status: "PUBLISHED",
      isClosed: false,
    },
  ],
);
assert.throws(() => parseTallyForms({ items: "not-an-array" }), /unexpected/i);

const fields = parseTallyFields({
  questions: [
    {
      id: "question-name",
      type: "INPUT_TEXT",
      title: "Full name",
      isDeleted: false,
      fields: [
        {
          uuid: "name-id",
          type: "INPUT_TEXT",
          blockGroupUuid: "question-name",
          title: "Full name",
        },
      ],
    },
    {
      id: "question-email",
      type: "INPUT_EMAIL",
      title: "Email address",
      isDeleted: false,
      fields: [
        {
          uuid: "email-id",
          type: "INPUT_EMAIL",
          blockGroupUuid: "question-email",
          title: "Email address",
        },
      ],
    },
    {
      id: "question-phone",
      type: "INPUT_PHONE_NUMBER",
      title: "Phone",
      isDeleted: false,
      fields: [
        {
          uuid: "phone-id",
          type: "INPUT_PHONE_NUMBER",
          blockGroupUuid: "question-phone",
          title: "Phone",
        },
      ],
    },
    {
      id: "question-company",
      type: "INPUT_TEXT",
      title: "Company",
      isDeleted: false,
      fields: [
        {
          uuid: "company-id",
          type: "INPUT_TEXT",
          blockGroupUuid: "question-company",
          title: "Company",
        },
      ],
    },
    {
      id: "question-message",
      type: "TEXTAREA",
      title: "How can we help?",
      isDeleted: false,
      fields: [
        {
          uuid: "message-id",
          type: "TEXTAREA",
          blockGroupUuid: "question-message",
          title: "How can we help?",
        },
      ],
    },
    {
      id: "question-file",
      type: "FILE_UPLOAD",
      title: "Attachment",
      isDeleted: false,
      fields: [
        {
          uuid: "file-id",
          type: "FILE_UPLOAD",
          blockGroupUuid: "question-file",
          title: "Attachment",
        },
      ],
    },
  ],
  hasResponses: true,
});
assert.deepEqual(fields, [
  { id: "name-id", label: "Full name", type: "INPUT_TEXT" },
  { id: "email-id", label: "Email address", type: "INPUT_EMAIL" },
  { id: "phone-id", label: "Phone", type: "INPUT_PHONE_NUMBER" },
  { id: "company-id", label: "Company", type: "INPUT_TEXT" },
  { id: "message-id", label: "How can we help?", type: "TEXTAREA" },
]);
assert.deepEqual(suggestTallyFieldMapping(fields), {
  name: "name-id",
  email: "email-id",
  phone: "phone-id",
  company: "company-id",
  message: "message-id",
});
assert.deepEqual(
  validateTallyFieldMapping(
    {
      name: "name-id",
      email: "email-id",
      phone: "phone-id",
      company: "company-id",
      message: "message-id",
    },
    fields,
  ),
  {
    name: "name-id",
    email: "email-id",
    phone: "phone-id",
    company: "company-id",
    message: "message-id",
  },
);
assert.throws(
  () => validateTallyFieldMapping({ name: "name-id" }, fields),
  /email or phone/i,
);
assert.throws(
  () =>
    validateTallyFieldMapping({ email: "email-id", phone: "email-id" }, fields),
  /more than once/i,
);
assert.throws(
  () => validateTallyFieldMapping({ email: "missing-id" }, fields),
  /unknown field/i,
);

const rawPayload = JSON.stringify({
  eventId: "event-1",
  eventType: "FORM_RESPONSE",
  createdAt: "2026-08-21T12:00:00.000Z",
  data: {
    responseId: "submission-1",
    submissionId: "submission-1",
    respondentId: "respondent-1",
    formId: "form-1",
    formName: "Website leads",
    createdAt: "2026-08-21T12:00:00.000Z",
    submissionPdfUrl: "https://example.invalid/private.pdf",
    submissionPreviewUrl: "https://example.invalid/private-preview",
    fields: [
      {
        key: "name-id",
        label: "Full name",
        type: "INPUT_TEXT",
        value: "Ada Lovelace",
      },
      {
        key: "email-id",
        label: "Email",
        type: "INPUT_EMAIL",
        value: "ADA@EXAMPLE.COM",
      },
      {
        key: "phone-id",
        label: "Phone",
        type: "INPUT_PHONE_NUMBER",
        value: "+15551234567",
      },
      {
        key: "company-id",
        label: "Company",
        type: "INPUT_TEXT",
        value: "Analytical Engines",
      },
      {
        key: "message-id",
        label: "Message",
        type: "TEXTAREA",
        value: "Please contact me",
      },
      {
        key: "file-id",
        label: "Attachment",
        type: "FILE_UPLOAD",
        value: [{ url: "https://example.invalid/private-file" }],
      },
    ],
  },
});
const signingSecret = "signing-secret";
const signature = createHmac("sha256", signingSecret)
  .update(rawPayload)
  .digest("base64");
assert.equal(verifyTallySignature(rawPayload, signature, signingSecret), true);
assert.equal(
  verifyTallySignature(`${rawPayload} `, signature, signingSecret),
  false,
);
assert.equal(
  verifyTallySignature(rawPayload, "not-base64!", signingSecret),
  false,
);

const parsedEvent = parseTallyWebhookEvent(JSON.parse(rawPayload));
assert.equal(parsedEvent.eventId, "event-1");
assert.equal(parsedEvent.data.formId, "form-1");
assert.equal(parsedEvent.data.submissionId, "submission-1");
assert.deepEqual(
  mapTallyEventToLeadInput(
    parsedEvent,
    {
      name: "name-id",
      email: "email-id",
      phone: "phone-id",
      company: "company-id",
      message: "message-id",
    },
    "form-1",
  ),
  {
    name: "Ada Lovelace",
    email: "ADA@EXAMPLE.COM",
    phone: "+15551234567",
    company: "Analytical Engines",
    message: "Please contact me",
    source_id: "tally:form-1:submission-1",
  },
);
assert.throws(
  () =>
    mapTallyEventToLeadInput(
      parsedEvent,
      { email: "email-id" },
      "another-form",
    ),
  /form/i,
);
assert.throws(
  () =>
    mapTallyEventToLeadInput(
      parseTallyWebhookEvent({
        eventId: "event-array",
        eventType: "FORM_RESPONSE",
        data: {
          formId: "form-1",
          submissionId: "submission-array",
          fields: [
            {
              key: "email-id",
              label: "Email",
              type: "INPUT_EMAIL",
              value: ["ada@example.com"],
            },
          ],
        },
      }),
      { email: "email-id" },
      "form-1",
    ),
  /unsupported/i,
);
assert.throws(
  () =>
    parseTallyWebhookEvent({
      eventId: "event-2",
      eventType: "FORM_UPDATED",
      data: { formId: "form-1", submissionId: "submission-2", fields: [] },
    }),
  /event type/i,
);
assert.throws(
  () =>
    parseTallyWebhookEvent({
      eventType: "FORM_RESPONSE",
      data: { formId: "form-1", submissionId: "submission-2", fields: [] },
    }),
  /event id/i,
);

const formsApiPayload = {
  items: [
    {
      id: "form-1",
      name: "Website leads",
      workspaceId: "workspace-1",
      status: "PUBLISHED",
      numberOfSubmissions: 12,
      isClosed: false,
      createdAt: "2026-08-01T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z",
    },
  ],
  page: 1,
  limit: 500,
  total: 1,
  hasMore: false,
};
let capturedFormsRequest;
const formsResult = await listTallyForms("test-api-key", async (url, init) => {
  capturedFormsRequest = { url: String(url), init };
  const body = JSON.stringify(formsApiPayload);
  return new Response(body, {
    status: 200,
    headers: { "content-length": String(Buffer.byteLength(body)) },
  });
});
assert.deepEqual(formsResult, {
  ok: true,
  forms: [
    {
      id: "form-1",
      name: "Website leads",
      status: "PUBLISHED",
      isClosed: false,
    },
  ],
});
assert.equal(
  capturedFormsRequest.url,
  "https://api.tally.so/forms?page=1&limit=500",
);
assert.equal(capturedFormsRequest.init.method, "GET");
assert.equal(capturedFormsRequest.init.redirect, "error");
assert.equal(
  capturedFormsRequest.init.headers.Authorization,
  "Bearer test-api-key",
);
assert.equal(capturedFormsRequest.init.headers["tally-version"], "2025-02-01");
assert.ok(capturedFormsRequest.init.signal instanceof AbortSignal);

const questionsPayload = {
  questions: [
    {
      id: "question-email",
      type: "INPUT_EMAIL",
      title: "Email address",
      isDeleted: false,
      fields: [
        {
          uuid: "email-id",
          type: "INPUT_EMAIL",
          blockGroupUuid: "question-email",
          title: "Email address",
        },
      ],
    },
  ],
  hasResponses: false,
};
let capturedQuestionsRequest;
const fieldsResult = await getTallyFormFields(
  "test-api-key",
  "form-1",
  async (url, init) => {
    capturedQuestionsRequest = { url: String(url), init };
    return Response.json(questionsPayload);
  },
);
assert.deepEqual(fieldsResult, {
  ok: true,
  fields: [{ id: "email-id", label: "Email address", type: "INPUT_EMAIL" }],
});
assert.equal(
  capturedQuestionsRequest.url,
  "https://api.tally.so/forms/form-1/questions",
);

let capturedCreateRequest;
const createResult = await createTallyWebhook(
  {
    apiKey: "test-api-key",
    formId: "form-1",
    webhookUrl:
      "https://app.revora.test/api/integrations/tally/webhook/token-1",
    signingSecret: "test-signing-secret",
    externalSubscriber: "revora",
  },
  async (url, init) => {
    capturedCreateRequest = { url: String(url), init };
    return Response.json(
      {
        id: "webhook-1",
        url: "https://app.revora.test/api/integrations/tally/webhook/token-1",
        eventTypes: ["FORM_RESPONSE"],
        isEnabled: true,
        createdAt: "2026-08-21T12:00:00.000Z",
      },
      { status: 201 },
    );
  },
);
assert.deepEqual(createResult, {
  ok: true,
  webhook: { id: "webhook-1", isEnabled: true },
});
assert.equal(capturedCreateRequest.url, "https://api.tally.so/webhooks");
assert.equal(capturedCreateRequest.init.method, "POST");
assert.deepEqual(JSON.parse(capturedCreateRequest.init.body), {
  formId: "form-1",
  url: "https://app.revora.test/api/integrations/tally/webhook/token-1",
  eventTypes: ["FORM_RESPONSE"],
  signingSecret: "test-signing-secret",
  externalSubscriber: "revora",
});

const webhookPages = [
  {
    webhooks: [
      {
        id: "other-webhook",
        formId: "other-form",
        url: "https://example.invalid/other",
        signingSecret: "must-not-leak",
        httpHeaders: [],
        eventTypes: ["FORM_RESPONSE"],
        externalSubscriber: "other",
        isEnabled: true,
        createdAt: "2026-08-01T10:00:00.000Z",
        updatedAt: "2026-08-01T10:00:00.000Z",
      },
    ],
    page: 1,
    limit: 100,
    hasMore: true,
    totalCount: 2,
  },
  {
    webhooks: [
      {
        id: "webhook-1",
        formId: "form-1",
        url: "https://app.revora.test/api/integrations/tally/webhook/token-1",
        signingSecret: "must-not-leak",
        httpHeaders: [],
        eventTypes: ["FORM_RESPONSE"],
        externalSubscriber: "revora",
        isEnabled: true,
        createdAt: "2026-08-21T12:00:00.000Z",
        updatedAt: "2026-08-21T12:00:00.000Z",
      },
    ],
    page: 2,
    limit: 100,
    hasMore: false,
    totalCount: 2,
  },
];
const verificationRequests = [];
const verifyResult = await verifyTallyWebhook(
  "test-api-key",
  "webhook-1",
  "form-1",
  async (url) => {
    verificationRequests.push(String(url));
    return Response.json(webhookPages[verificationRequests.length - 1]);
  },
);
assert.deepEqual(verifyResult, {
  ok: true,
  webhook: { id: "webhook-1", formId: "form-1", isEnabled: true },
});
assert.equal("signingSecret" in verifyResult.webhook, false);
assert.deepEqual(verificationRequests, [
  "https://api.tally.so/webhooks?page=1&limit=100",
  "https://api.tally.so/webhooks?page=2&limit=100",
]);

let capturedDeleteRequest;
const deleteResult = await deleteTallyWebhook(
  "test-api-key",
  "webhook-1",
  async (url, init) => {
    capturedDeleteRequest = { url: String(url), init };
    return new Response(null, { status: 204 });
  },
);
assert.deepEqual(deleteResult, { ok: true });
assert.equal(
  capturedDeleteRequest.url,
  "https://api.tally.so/webhooks/webhook-1",
);
assert.equal(capturedDeleteRequest.init.method, "DELETE");

for (const [status, errorCode] of [
  [401, "INVALID_CREDENTIALS"],
  [403, "REAUTH_REQUIRED"],
  [429, "RATE_LIMITED"],
  [503, "PROVIDER_UNAVAILABLE"],
]) {
  assert.deepEqual(
    await listTallyForms(
      "test-api-key",
      async () => new Response("provider detail", { status }),
    ),
    { ok: false, errorCode },
  );
}
assert.deepEqual(
  await listTallyForms("test-api-key", async () => {
    throw new DOMException("Aborted", "AbortError");
  }),
  { ok: false, errorCode: "NETWORK_ERROR" },
);
assert.deepEqual(
  await listTallyForms(
    "test-api-key",
    async () =>
      new Response("too large", {
        status: 200,
        headers: { "content-length": String(1024 * 1024 + 1) },
      }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE" },
);
assert.deepEqual(
  await listTallyForms(
    "test-api-key",
    async () => new Response("not-json", { status: 200 }),
  ),
  { ok: false, errorCode: "INVALID_RESPONSE" },
);

const immutableMigrationHashes = new Map([
  [
    "00001_initial_schema.sql",
    "6c5563ecc0fdaa6009e259aa042e94367ec101a3d1bb18b881a2345802c282ac",
  ],
  [
    "00002_rls_policies.sql",
    "224ea472b5893ed6f068530cfbbf3dab5154afac2f7f95c30365baf6e0f8a7cf",
  ],
  [
    "00003_rls_hardening.sql",
    "bd1ada818c2878bec61603c76fe3b666e6fdc8af89c1441abe65371fa4c5a5e3",
  ],
  [
    "00004_onboarding_function.sql",
    "6563552a245596bf8b8d1899a3c4619a614cb96bb3e78321742c150b3f0300b0",
  ],
  [
    "00005_query_indexes.sql",
    "f1e8015b63f735b3fbfbfe46e5b21122ef7238d211d56774be86ed29553cb56a",
  ],
  [
    "00006_source_api_keys.sql",
    "ae9b325391324fd2e2bfcffc071d1ca40209323443dffd83a74c0a5c8ab8500f",
  ],
  [
    "00007_lead_source_external_id.sql",
    "1e5f89e7bf44d5233b77ce09c30bc660906596056afdeecdd4d032094886b71b",
  ],
  [
    "00008_automation_executions.sql",
    "77acd1549f415ca40310f1b7d6b61d058ff6f9127feb13de1e03dd96d57b7f22",
  ],
  [
    "00009_executions_policy_fix.sql",
    "a478fd6feff5e20daabecedc6857438d5de9310a900b4f157ff183a36c3bf793",
  ],
  [
    "00010_grants_revoke.sql",
    "1ae274b745675782607a0b5fdee5c2eb6b34450c9dccbcca418e5cc0b24656dc",
  ],
  [
    "00011_service_role_onboard_grant.sql",
    "2bc6ebd3e5031a8cfe73073c930fd29daecd0920ca86b37f3a3b2563a508f805",
  ],
  [
    "00012_is_org_member_anon_lockdown.sql",
    "3da8ad4ceae0627d007b2b6e76628b2f0772f8db1ef1af8a6904f615728bad48",
  ],
  [
    "00013_mfa_recovery_codes.sql",
    "eb52f3a0a06a944b0e236fa27a26158dd2cfcf708fc09d134ecbcbce9300333a",
  ],
  [
    "00014_remove_custom_recovery_codes.sql",
    "efea74606ad4ffa7ec66f59cc30a5373cf19931ffff2c323e5beb7771a4333b7",
  ],
  [
    "00015_drop_recovery_codes_table.sql",
    "69015a60ab19d9b2eec36847ef70dfb46155fb28b6b9e88ba15c0dcae9d00948",
  ],
  [
    "00016_force_drop_recovery_table.sql",
    "0fe5e4bf252f31956473b204efb1d4633a6ae9462c5ef559e602e1da8bb0b8aa",
  ],
  [
    "00017_versioned_legal_consent.sql",
    "6169964334430a53d0ca7790c55e878fbf4754eec0ce00ee14a51fb81a7fcb9a",
  ],
  [
    "00018_team_rbac_foundation.sql",
    "900394f831d6dd914baaa2b3adcae69e886d1f0c1748f982c943f2943cb4e7eb",
  ],
  [
    "00019_owner_protection_cascade_fix.sql",
    "5ddb21d3526460ed5701a7cf62e2b93cc431c34ef44f49b8523a526a25b59972",
  ],
  [
    "00020_secure_organization_invitations.sql",
    "2bb7e0ef434e7627edc11ff951e6747cb123dcbe8d5c32ddcc3fcdcff33a8c70",
  ],
  [
    "00021_invitation_role_guard_null_fix.sql",
    "dd2cf567847c40fa4e258d6457cee7049c11abb61d931fbed7182ff02aaea747",
  ],
  [
    "00022_team_management_operations.sql",
    "4bd44f505cbb028d856cc0a86c8bd4b333b68bb02fb43d1082691d443705c7f8",
  ],
  [
    "00023_team_management_legal_consent_guard.sql",
    "6abe006562c827fea24f98712d850b5cc8e789da37217078c684f99938f59acc",
  ],
  [
    "00024_secure_organization_ownership_transfers.sql",
    "d71186e794b30e839d62ff7b419fb5574fb037c98295d85011f4ed417fabd0f2",
  ],
  [
    "00025_ownership_transfer_constraint_resolution.sql",
    "eee1d2e3c2f82c5d1a2ab0042433b6a9c74818f86e94a4bc413c7b38edfaefa1",
  ],
  [
    "00026_core_crm_live_flow.sql",
    "97d1bfd81055088947674b4133c92b613bb7466d98643fcc860a398b7f6c54a2",
  ],
  [
    "00027_protect_ai_qualification_fields.sql",
    "35b3cbbb926872d98f89465d127f4c699d1a624412dba7450cdf137deb1097b3",
  ],
  [
    "00028_organization_ai_qualification_guardrail.sql",
    "04e8da846af982cff2f7e9e9b798d86f57ed8ab85ba4e7b80ef30c5553b85e58",
  ],
  [
    "00029_integration_foundation.sql",
    "04163bdf32b7049bb90c10b548b18ed8fff9225cc42795af3930d97d5383ecf0",
  ],
  [
    "00030_provider_resource_mappings.sql",
    "336ad3a09ded20f59fb0b9ab41959cce85858141068e69c2894955c20deadb95",
  ],
  [
    "00031_add_contact_synced_audit_event.sql",
    "3d342542155cb4d1da9fd3088c733da9fa88255984b1f414bc3064e0de29129c",
  ],
  [
    "00032_active_sync_concurrency_guard.sql",
    "4c26b35af21bbf2d95e33095c9542e3c97c6d9e57dce29e2a27fea17175388b6",
  ],
  [
    "00033_phase_14_6c_automation_webhooks.sql",
    "ddb92d60f4da4d9d701d4533ebdfa3205debd83da63addeca8332904b5ddfeaa",
  ],
]);
const migrationsDirectory = resolve("supabase/migrations");
const immutableMigrationNames = readdirSync(migrationsDirectory)
  .filter((name) => /^000(?:0[1-9]|[12][0-9]|3[0-3])_/.test(name))
  .sort();
assert.deepEqual(
  immutableMigrationNames,
  [...immutableMigrationHashes.keys()],
  "Migrations 00001-00033 must keep their exact names.",
);
function normalizedMigrationText(value) {
  return value
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n");
}
for (const name of immutableMigrationHashes.keys()) {
  const gitPath = `supabase/migrations/${name}`;
  const baseline = execFileSync("git", ["show", `f5cfb95:${gitPath}`]);
  const current = execFileSync("git", ["show", `HEAD:${gitPath}`]);
  const working = readFileSync(resolve(migrationsDirectory, name));
  assert.equal(
    createHash("sha256").update(current).digest("hex"),
    createHash("sha256").update(baseline).digest("hex"),
    `${name} committed content must remain immutable.`,
  );
  assert.equal(
    normalizedMigrationText(working),
    normalizedMigrationText(current),
    `${name} working content must match its committed content.`,
  );
}

const tallyMigrationName = "00034_phase_14_6e_tally_inbound.sql";
const migrationsFromTallyForward = readdirSync(migrationsDirectory)
  .filter((name) => /^0003[4-9]_/.test(name))
  .sort();
assert.equal(
  migrationsFromTallyForward[0],
  tallyMigrationName,
  "Phase 14.6E migration 00034 must remain the first migration after 00033.",
);
assert.equal(
  migrationsFromTallyForward.filter((name) => name.startsWith("00034_")).length,
  1,
  "Phase 14.6E migration 00034 must remain unique.",
);
const tallyMigration = readFileSync(
  resolve(migrationsDirectory, tallyMigrationName),
  "utf8",
);
for (const requiredFragment of [
  "integration_webhook_events_org_provider_event_key",
  "unique (organization_id, provider, external_event_id)",
  "lead_id uuid references public.leads(id) on delete set null",
  "attempt_count integer not null default 1 check (attempt_count > 0)",
  "last_attempt_at timestamptz not null default now()",
  "idx_webhook_events_org_status_attempt",
  "idx_webhook_events_org_lead",
  "alter table public.integration_webhook_events enable row level security",
  "'connected'",
  "'disconnected'",
  "'reconnected'",
  "'credentials_rotated'",
  "'connection_failed'",
  "'token_refreshed'",
  "'token_refresh_failed'",
  "'webhook_verified'",
  "'webhook_delivered'",
  "'webhook_delivery_failed'",
  "'contact_synced'",
  "'webhook_received'",
  "'webhook_duplicate'",
  "'webhook_rejected'",
  "'lead_captured'",
]) {
  assert.ok(
    tallyMigration.includes(requiredFragment),
    `Migration 00034 is missing: ${requiredFragment}`,
  );
}
assert.equal(
  /on public\.integration_webhook_events[\s\S]{0,160}for\s+(insert|update|delete|all)/i.test(
    tallyMigration,
  ),
  false,
  "Webhook event mutations must remain service-role only.",
);

const webhookRepository = readFileSync(
  resolve("src/lib/integrations/webhooks.ts"),
  "utf8",
);
assert.ok(webhookRepository.includes("claimWebhookEvent"));
assert.ok(
  webhookRepository.includes('.eq("organization_id", params.organizationId)'),
  "Webhook replay lookup must be scoped to organization.",
);
assert.ok(webhookRepository.includes('insertError.code !== "23505"'));

const connectionRepository = readFileSync(
  resolve("src/lib/integrations/connections.ts"),
  "utf8",
);
assert.ok(
  connectionRepository.includes("getActiveTallyConnectionByRoutingToken"),
);
assert.ok(connectionRepository.includes('createHash("sha256")'));
assert.ok(connectionRepository.includes('eq("provider", "tally")'));
assert.ok(connectionRepository.includes('eq("is_active", true)'));
assert.ok(
  connectionRepository.includes('.in("status", ["connected", "degraded"])'),
);

const integrationActions = readFileSync(
  resolve("src/app/(dashboard)/settings/integrations-actions.ts"),
  "utf8",
).replace(/\r\n/g, "\n");
function serverActionBody(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `Missing server action: ${name}`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}
for (const actionName of [
  "discoverTallyForms",
  "inspectTallyForm",
  "connectTally",
  "testTally",
  "disconnectTally",
]) {
  assert.ok(
    serverActionBody(integrationActions, actionName).includes(
      'requireCurrentOrganizationPermission(\n    "integrations.manage"',
    ),
    `${actionName} must re-authorize integrations.manage.`,
  );
}
const connectTallySource = serverActionBody(integrationActions, "connectTally");
assert.ok((connectTallySource.match(/randomBytes\(32\)/g) ?? []).length >= 2);
assert.ok(connectTallySource.includes('createHash("sha256")'));
assert.ok(connectTallySource.includes("routing_token_hash"));
assert.ok(connectTallySource.includes("field_mapping"));
assert.ok(connectTallySource.includes("signing_secret"));
assert.ok(connectTallySource.includes("deleteTallyWebhook"));
assert.equal(connectTallySource.includes("return { routingToken"), false);
assert.equal(connectTallySource.includes("return { signingSecret"), false);
assert.equal(connectTallySource.includes("return { apiKey"), false);

const tallyFormUi = readFileSync(
  resolve("src/app/(dashboard)/settings/tally-connect-form.tsx"),
  "utf8",
);
assert.ok(tallyFormUi.includes('type="password"'));
assert.ok(tallyFormUi.includes("discoverTallyForms"));
assert.ok(tallyFormUi.includes("inspectTallyForm"));
assert.ok(tallyFormUi.includes("connectTally"));
assert.ok(tallyFormUi.includes("suggestedMapping"));
assert.equal(tallyFormUi.includes("localStorage"), false);
assert.equal(tallyFormUi.includes("sessionStorage"), false);

const integrationsPanel = readFileSync(
  resolve("src/app/(dashboard)/settings/integrations-panel.tsx"),
  "utf8",
);
assert.ok(integrationsPanel.includes("TallyConnectForm"));
assert.ok(integrationsPanel.includes("testTally"));
assert.ok(integrationsPanel.includes("disconnectTally"));

const tallyConnection = {
  id: "integration-1",
  organizationId: "organization-1",
  credentials: {
    apiKey: "test-api-key",
    signingSecret: "route-signing-secret",
  },
  config: {
    formId: "form-1",
    formName: "Website leads",
    webhookId: "webhook-1",
    fieldMapping: {
      name: "name-id",
      email: "email-id",
      phone: "phone-id",
      company: "company-id",
      message: "message-id",
    },
    routingTokenHash: "a".repeat(64),
  },
};
const fixedNow = new Date("2026-08-21T15:30:00.000Z");
function createIngestionHarness(overrides = {}) {
  const calls = [];
  let insertedPayload;
  const leadRow = {
    id: "lead-1",
    organization_id: tallyConnection.organizationId,
    workspace_id: "workspace-1",
    pipeline_id: "pipeline-1",
    pipeline_stage_id: "stage-1",
    first_name: "Ada",
    last_name: "Lovelace",
    email: "ada@example.com",
    phone: "+15551234567",
    company: "Analytical Engines",
    source: "other",
    source_external_id: "tally:form-1:submission-1",
    status: "new",
    score: 0,
    metadata: {},
    assigned_to: null,
    tags: null,
    created_at: fixedNow.toISOString(),
    updated_at: fixedNow.toISOString(),
  };
  const dependencies = {
    claimEvent: async () => ({
      status: "claimed",
      id: "webhook-event-1",
      attemptCount: 1,
    }),
    resolveCrmDefaults: async () => ({
      workspaceId: "workspace-1",
      pipelineId: "pipeline-1",
      stageId: "stage-1",
    }),
    insertLead: async (payload) => {
      calls.push("insert");
      insertedPayload = payload;
      return { ok: true, lead: { ...leadRow, ...payload } };
    },
    findLeadBySource: async () => null,
    markProcessed: async () => {
      calls.push("processed");
    },
    markFailed: async () => {
      calls.push("failed");
    },
    dispatchOutbound: async () => {
      calls.push("dispatched");
    },
    recordAudit: async (eventType) => {
      calls.push(`audit:${eventType}`);
    },
    clock: () => fixedNow,
    hashPayload: () => "payload-hash-1",
    ...overrides,
  };
  return {
    calls,
    dependencies,
    getInsertedPayload: () => insertedPayload,
    leadRow,
  };
}

const validHarness = createIngestionHarness();
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: tallyConnection },
    validHarness.dependencies,
  ),
  { status: "created", leadId: "lead-1" },
);
const validInsert = validHarness.getInsertedPayload();
assert.equal(validInsert.organization_id, tallyConnection.organizationId);
assert.equal(validInsert.source, "other");
assert.equal(validInsert.source_external_id, "tally:form-1:submission-1");
assert.equal(validInsert.first_name, "Ada");
assert.equal(validInsert.last_name, "Lovelace");
assert.equal(validInsert.email, "ada@example.com");
assert.deepEqual(validInsert.metadata, {
  ingested_via: "tally",
  tally_form_id: "form-1",
  tally_form_name: "Website leads",
  tally_submission_id: "submission-1",
  tally_event_id: "event-1",
  ingested_at: fixedNow.toISOString(),
});
assert.equal(JSON.stringify(validInsert).includes("private-file"), false);
assert.equal(JSON.stringify(validInsert).includes("private.pdf"), false);
assert.ok(
  validHarness.calls.indexOf("processed") <
    validHarness.calls.indexOf("dispatched"),
);

function payloadWithFields(predicate, eventId, submissionId) {
  const payload = JSON.parse(rawPayload);
  payload.eventId = eventId;
  payload.data.submissionId = submissionId;
  payload.data.responseId = submissionId;
  payload.data.fields = payload.data.fields.filter(predicate);
  return JSON.stringify(payload);
}
const emailOnlyHarness = createIngestionHarness();
const emailOnlyResult = await ingestTallyWebhook(
  {
    rawPayload: payloadWithFields(
      (field) => ["name-id", "email-id"].includes(field.key),
      "event-email",
      "submission-email",
    ),
    connection: tallyConnection,
  },
  emailOnlyHarness.dependencies,
);
assert.equal(emailOnlyResult.status, "created");
assert.equal(emailOnlyHarness.getInsertedPayload().phone, null);

const phoneOnlyHarness = createIngestionHarness();
const phoneOnlyResult = await ingestTallyWebhook(
  {
    rawPayload: payloadWithFields(
      (field) => ["name-id", "phone-id"].includes(field.key),
      "event-phone",
      "submission-phone",
    ),
    connection: tallyConnection,
  },
  phoneOnlyHarness.dependencies,
);
assert.equal(phoneOnlyResult.status, "created");
assert.equal(phoneOnlyHarness.getInsertedPayload().email, null);

let invalidClaimCalls = 0;
const invalidContactHarness = createIngestionHarness({
  claimEvent: async () => {
    invalidClaimCalls += 1;
    throw new Error("must not claim invalid contact data");
  },
});
const invalidContactPayload = payloadWithFields(
  (field) => field.key === "name-id",
  "event-invalid",
  "submission-invalid",
);
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload: invalidContactPayload, connection: tallyConnection },
    invalidContactHarness.dependencies,
  ),
  { status: "invalid_event" },
);
assert.equal(invalidClaimCalls, 0);

assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload: "{not-json", connection: tallyConnection },
    invalidContactHarness.dependencies,
  ),
  { status: "invalid_event" },
);
assert.equal(invalidClaimCalls, 0);

const foreignFormConnection = {
  ...tallyConnection,
  config: { ...tallyConnection.config, formId: "another-form" },
};
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: foreignFormConnection },
    invalidContactHarness.dependencies,
  ),
  { status: "invalid_event" },
);
assert.equal(invalidClaimCalls, 0);

const duplicateHarness = createIngestionHarness({
  claimEvent: async () => ({
    status: "duplicate",
    id: "webhook-event-1",
    leadId: "lead-existing",
  }),
});
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: tallyConnection },
    duplicateHarness.dependencies,
  ),
  { status: "duplicate", leadId: "lead-existing" },
);
assert.equal(duplicateHarness.calls.includes("insert"), false);

const conflictHarness = createIngestionHarness({
  claimEvent: async () => ({
    status: "payload_conflict",
    id: "webhook-event-1",
  }),
});
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: tallyConnection },
    conflictHarness.dependencies,
  ),
  { status: "payload_conflict" },
);
assert.equal(conflictHarness.calls.includes("insert"), false);

for (const attemptCount of [2, 3]) {
  const recoveryHarness = createIngestionHarness({
    claimEvent: async () => ({
      status: "claimed",
      id: `webhook-event-${attemptCount}`,
      attemptCount,
    }),
  });
  assert.equal(
    (
      await ingestTallyWebhook(
        { rawPayload, connection: tallyConnection },
        recoveryHarness.dependencies,
      )
    ).status,
    "created",
  );
}

const existingLeadHarness = createIngestionHarness({
  insertLead: async () => ({
    ok: false,
    conflict: true,
    errorCode: "23505",
  }),
  findLeadBySource: async () => ({ id: "lead-existing", status: "new" }),
});
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: tallyConnection },
    existingLeadHarness.dependencies,
  ),
  { status: "duplicate", leadId: "lead-existing" },
);
assert.equal(existingLeadHarness.calls.includes("processed"), true);

const missingDefaultsHarness = createIngestionHarness({
  resolveCrmDefaults: async () => null,
});
assert.deepEqual(
  await ingestTallyWebhook(
    { rawPayload, connection: tallyConnection },
    missingDefaultsHarness.dependencies,
  ),
  { status: "configuration_error" },
);
assert.equal(missingDefaultsHarness.calls.includes("failed"), true);

const outboundFailureHarness = createIngestionHarness({
  dispatchOutbound: async () => {
    outboundFailureHarness.calls.push("dispatched");
    throw new Error("provider unavailable");
  },
});
assert.equal(
  (
    await ingestTallyWebhook(
      { rawPayload, connection: tallyConnection },
      outboundFailureHarness.dependencies,
    )
  ).status,
  "created",
);
assert.ok(
  outboundFailureHarness.calls.indexOf("processed") <
    outboundFailureHarness.calls.indexOf("dispatched"),
);

let routeLookupCalls = 0;
let routeIngestCalls = 0;
const invalidSignatureResponse = await handleTallyWebhookRequest(
  new Request("https://app.revora.test/api/integrations/tally/webhook/token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "tally-signature": "invalid",
    },
    body: rawPayload,
  }),
  "A".repeat(43),
  {
    findConnection: async () => {
      routeLookupCalls += 1;
      return tallyConnection;
    },
    ingest: async () => {
      routeIngestCalls += 1;
      return { status: "created", leadId: "lead-1" };
    },
  },
);
assert.equal(invalidSignatureResponse.status, 401);
assert.equal(routeLookupCalls, 1);
assert.equal(routeIngestCalls, 0);

routeLookupCalls = 0;
const oversizedResponse = await handleTallyWebhookRequest(
  new Request("https://app.revora.test/api/integrations/tally/webhook/token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(1024 * 1024 + 1),
    },
    body: "{}",
  }),
  "A".repeat(43),
  {
    findConnection: async () => {
      routeLookupCalls += 1;
      return tallyConnection;
    },
    ingest: async () => {
      routeIngestCalls += 1;
      return { status: "created", leadId: "lead-1" };
    },
  },
);
assert.equal(oversizedResponse.status, 413);
assert.equal(routeLookupCalls, 0);

const actualOversizedResponse = await handleTallyWebhookRequest(
  new Request("https://app.revora.test/api/integrations/tally/webhook/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "x".repeat(1024 * 1024 + 1),
  }),
  "A".repeat(43),
  {
    findConnection: async () => {
      routeLookupCalls += 1;
      return tallyConnection;
    },
    ingest: async () => {
      routeIngestCalls += 1;
      return { status: "created", leadId: "lead-1" };
    },
  },
);
assert.equal(actualOversizedResponse.status, 413);
assert.equal(routeLookupCalls, 0);

const unknownTokenResponse = await handleTallyWebhookRequest(
  new Request("https://app.revora.test/api/integrations/tally/webhook/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: rawPayload,
  }),
  "B".repeat(43),
  {
    findConnection: async () => null,
    ingest: async () => {
      routeIngestCalls += 1;
      return { status: "created", leadId: "lead-1" };
    },
  },
);
assert.equal(unknownTokenResponse.status, 404);
assert.equal(routeIngestCalls, 0);

const routeSignature = createHmac(
  "sha256",
  tallyConnection.credentials.signingSecret,
)
  .update(rawPayload)
  .digest("base64");
for (const [ingestionResult, expectedStatus] of [
  [{ status: "created", leadId: "lead-1" }, 201],
  [{ status: "duplicate", leadId: "lead-1" }, 200],
  [{ status: "in_progress" }, 202],
  [{ status: "payload_conflict" }, 409],
  [{ status: "configuration_error" }, 409],
  [{ status: "invalid_event" }, 400],
  [{ status: "retryable_error" }, 500],
]) {
  const response = await handleTallyWebhookRequest(
    new Request(
      "https://app.revora.test/api/integrations/tally/webhook/token",
      {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "tally-signature": routeSignature,
        },
        body: rawPayload,
      },
    ),
    "A".repeat(43),
    {
      findConnection: async () => tallyConnection,
      ingest: async () => ingestionResult,
    },
  );
  assert.equal(response.status, expectedStatus);
  assert.equal(response.headers.get("cache-control"), "no-store");
}

const tallyRouteSource = readFileSync(
  resolve("src/app/api/integrations/tally/webhook/[token]/route.ts"),
  "utf8",
);
assert.ok(tallyRouteSource.includes("await context.params"));
assert.equal(tallyRouteSource.includes("request.json()"), false);
assert.equal(tallyRouteSource.includes("console.log"), false);

console.log("Phase 14.6E Tally contract verification passed.");
