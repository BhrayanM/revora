# Live E2E Test — Integration Roadmap

**Updated:** 2026-08-21

**Current phase:** 14.6G — Complete Integration E2E Audit

## Current Evidence

| Provider | Implementation | Live status |
| --- | --- | --- |
| HubSpot | Local 14.6G PASS | `PRIOR_LIVE_PASS_14.6B`; current recheck `BLOCKED_ENVIRONMENT` |
| GoHighLevel | Local 14.6G PASS | `PRIOR_LIVE_PASS_14.6B`; current recheck `BLOCKED_CREDENTIALS` |
| n8n | Local 14.6G PASS | `PRIOR_LIVE_PASS_14.6C`; no new mutation |
| Zapier | Local 14.6G PASS | `PRIOR_LIVE_PASS_14.6C`; no new mutation |
| Make | Local 14.6G PASS | `PRIOR_LIVE_PASS_14.6C`; no new mutation |
| Slack | OAuth + test/disconnect + HOT alert complete | `BLOCKED_CREDENTIALS` |
| Twilio | Read-only account/number validation complete | `BLOCKED_CREDENTIALS` |
| Tally | Automatic form mapping + signed inbound capture complete | `BLOCKED_CREDENTIALS` |
| Google Calendar | Shared OAuth + read-only Test + bounded event creation complete | `BLOCKED_CREDENTIALS` |
| Gmail | Shared OAuth + non-mutating Test + bounded plain-text send complete | `BLOCKED_CREDENTIALS` |

The current process has no complete Slack, GHL, Google Workspace, Supabase, or
public-app configuration. It has no Supabase project ref and the local database
is stopped, so no current provider-row claim is possible. This report therefore
does not claim a new live Slack or Twilio gate. There is also no usable Tally
API key, encrypted Tally test connection, or externally reachable HTTPS app
origin; therefore `TALLY_LIVE_GATE=BLOCKED_CREDENTIALS_AND_PUBLIC_HTTPS`.

The current context has no complete `GOOGLE_WORKSPACE_CLIENT_ID`,
`GOOGLE_WORKSPACE_CLIENT_SECRET`, and `GOOGLE_WORKSPACE_REDIRECT_URI` set, no
authorized live Google identity, and no authorized linked application of
migration `00035`. Therefore
`GOOGLE_WORKSPACE_LIVE_GATE=BLOCKED_CREDENTIALS` and no message or event was
created.

## Local the implementation Gate

Final local run on 2026-08-21: **PASS** for the aggregate ten-provider audit,
CRM transport, automation, communications, Tally and Google Workspace suites,
lint, self-contained typecheck, production build, npm audit, and whitespace.
Migrations `00001`-`00035` are statically unchanged from the 14.6F production ready;
linked verification is pending because this worktree has no Supabase project
link.

Run from the project root:

```powershell
npm.cmd run test:integration-e2e
npm.cmd run test:crm-integrations
npm.cmd run test:tally
npm.cmd run test:google-workspace
npm.cmd run test:communications
npm.cmd run test:integrations
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd audit
git diff --check
npx.cmd supabase migration list --linked
```

Expected:

- Tally API/lifecycle/signature/ingestion/tenant contracts pass.
- HubSpot/GoHighLevel bounded transport and CRM failure contracts pass.
- Slack/Twilio behavioral contracts pass.
- The the implementation automation regression passes.
- Lint, strict types, and the production build pass.
- Audit reports zero vulnerabilities.
- Migrations `00001`-`00035` remain unchanged; 14.6G adds no migration and
  linked application remains an explicit external gate.

## Slack Live Gate

Prerequisites:

1. Create or reuse a Slack app.
2. Add OAuth redirect URL
   `https://<revora-host>/api/integrations/slack/callback`.
3. Enable the `incoming-webhook` bot scope.
4. Configure server-only `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and
   `SLACK_REDIRECT_URI`.

Test procedure:

1. Open **Settings → Integrations → Slack → Connect**.
2. Authorize the workspace and choose the alert channel.
3. Confirm Revora shows the safe workspace/channel name and never the token or
   webhook URL.
4. Click **Test** and verify exactly one `Revora — Integration test` message.
5. Qualify one synthetic lead to `HOT`; verify exactly one escaped alert.
6. Qualify one WARM and one COLD lead; verify no Slack alert for either.
7. Temporarily make delivery fail; verify the qualification remains persisted
   and Slack health becomes degraded with a safe code.
8. Disconnect; verify credentials are cleared and Test no longer delivers.

Do not put Slack tokens or webhook URLs in screenshots, logs, tickets, or this
report.

## Twilio Read-Only Gate

1. Open **Settings → Integrations → Twilio → Connect**.
2. Enter the Account SID, Auth Token, and optional source number in E.164.
3. Connect and verify only these provider operations occur:
   - `GET /2010-04-01/Accounts/{AccountSid}.json`
   - Optional `GET .../IncomingPhoneNumbers.json?PhoneNumber=...`
4. Click **Test** and verify the same read-only validation succeeds.
5. Disconnect and verify credentials are cleared.

the implementation must not send SMS, WhatsApp messages, place calls, buy numbers,
configure callbacks, or invoke any mutating Twilio endpoint.

## Tally Live Gate

Prerequisites:

1. Use an authorized non-production organization and Supabase project.
2. Apply migration `00034` without changing `00001`-`00033`.
3. Configure `NEXT_PUBLIC_APP_URL` as an externally reachable HTTPS origin.
4. Create a Tally API key and enter it only in the masked Tally connection form.
   Do not place it in chat, clipboard history, shell transcripts, source, or
   screenshots.
5. Use an open, published test form with mapped email or phone.

Procedure:

1. Open **Settings → Integrations → Tally → Connect**.
2. Load forms, select one form, review the suggested name/email/phone/company/
   message mappings, and confirm at least email or phone.
3. Verify Connect uses only `GET /forms`, `GET /forms/{id}/questions`, and
   `POST /webhooks`; no raw callback token or signing secret reaches the UI.
4. Click **Test**. Verify it performs only the same question lookup plus
   paginated `GET /webhooks`; it must not create a submission or lead.
5. Submit one unique response in Tally. Expect one Revora lead with source
   `other`, source external ID `tally:{formId}:{submissionId}`, and only the safe
   Tally metadata documented for the implementation.
6. Confirm an identical provider retry returns 2xx and creates no second lead.
   Confirm a conflicting payload for the same event ID returns 409.
7. Verify a missing/invalid signature returns 401, an unknown routing token 404,
   and an oversized body 413 without lead/event persistence.
8. Connect Tally only in Org A; verify Org B cannot discover, test, disconnect,
   or route through Org A's connection.
9. Disconnect. Verify local ingestion is disabled and credentials are cleared,
   even if remote `DELETE /webhooks/{id}` cleanup reports a safe warning.

Never save raw Tally payloads, file/preview/PDF URLs, API keys, signing secrets,
raw routing tokens, or provider webhook URLs in evidence artifacts.

## Google Workspace Live Gate

Prerequisites:

1. Use an authorized non-production Google Cloud and Supabase project.
2. Enable Calendar and Gmail APIs, configure the consent screen/test users, and
   register the exact HTTPS callback path.
3. Configure the three server-only `GOOGLE_WORKSPACE_*` variables without
   placing their values in chat, screenshots, commands, logs, or reports.
4. Apply only pending migration `00035` after reading back linked history.
5. Choose a test Google account, one safe recipient controlled by the tester,
   and a future test interval. Explicitly authorize the two mutating checks.

Procedure:

1. Connect from Google Calendar in Org A and verify both Google cards become
   connected to the same safe email; Org B must remain disconnected.
2. Confirm the consent request contains exactly `openid`, `email`,
   `calendar.events.owned`, and `gmail.send`.
3. Click Calendar **Test** and verify only one bounded `events.list` request on
   `primary`; no event is created.
4. Click Gmail **Test** and verify OIDC identity/scope validation only; no email
   is sent and no Gmail read scope is requested.
5. With explicit mutation authorization, create one bounded future appointment
   on `primary`; verify one event and safe audit metadata without title,
   description, location, or attendee address.
6. With explicit mutation authorization, send one plain-text message to the
   controlled recipient; verify one message and safe audit metadata without
   recipient, subject, or body.
7. Force one provider error and verify there is no automatic mutation retry.
8. Verify Org B cannot read, test, disconnect, refresh, or use Org A's grant.
9. Disconnect from either card. Both cards must disconnect and clear local
   credentials even if remote revocation reports a safe warning.

Do not claim a live PASS without recorded scope, tenant, provider-result, and
cleanup evidence. Never include tokens, codes, client secrets, message content,
event content, or recipient addresses in evidence.

## Tenant-Isolation Gate

For Slack, Twilio, Tally, and Google Workspace, use Org A and Org B:

1. Connect the provider only in Org A.
2. Verify Org B cannot read safe account metadata for Org A.
3. Verify Org B cannot test, disconnect, or use Org A credentials.
4. Confirm no credential, webhook URL, or Basic Auth value reaches client DTOs
   or audit metadata.

## Next Product Boundary

the implementation performs Product UX Completion. It must preserve the complete 14.6G
integration gate while improving visual consistency, accessibility, responsive
behavior, provider identity, settings selectors, and the explicit scope of each
remaining `Soon` module.
