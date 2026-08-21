import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

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

console.log("Phase 14.6E Tally contract verification passed.");
