# Live E2E Test — Integration Roadmap

**Updated:** 2026-08-21

**Current phase:** 14.6E — Tally

## Current Evidence

| Provider | Implementation | Live status |
| --- | --- | --- |
| HubSpot | Complete | Validated in Phase 14.6B |
| GoHighLevel | Complete | Validated in Phase 14.6B |
| n8n | Complete | Validated in Phase 14.6C |
| Zapier | Complete | Validated in Phase 14.6C |
| Make | Complete | Validated in Phase 14.6C |
| Slack | OAuth + test/disconnect + HOT alert complete | `BLOCKED_CREDENTIALS` |
| Twilio | Read-only account/number validation complete | `BLOCKED_CREDENTIALS` |
| Tally | Automatic form mapping + signed inbound capture complete | `BLOCKED_CREDENTIALS` |

The current local environment has no configured `SLACK_CLIENT_ID`,
`SLACK_CLIENT_SECRET`, or `SLACK_REDIRECT_URI`. The linked database has no
Slack or Twilio integration row. Therefore this report does not claim a live
Slack or Twilio gate. The current context also has no usable Tally API key or
encrypted Tally test connection, and no externally reachable HTTPS app origin;
therefore `TALLY_LIVE_GATE=BLOCKED_CREDENTIALS`.

## Local Phase 14.6E Gate

Final local run on 2026-08-21: **PASS** for Tally contracts, communications,
14.6C automation regression, lint, typecheck, production build, npm audit, and
whitespace. Migration `00034` is statically validated; linked verification is
pending because this worktree has no Supabase project link.

Run from the project root:

```powershell
npm.cmd run test:tally
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
- Slack/Twilio behavioral contracts pass.
- The Phase 14.6C automation regression passes.
- Lint, strict types, and the production build pass.
- Audit reports zero vulnerabilities.
- Migrations `00001`-`00033` remain byte-for-byte unchanged and only `00034`
  is added; linked application remains an explicit external gate.

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

Phase 14.6D must not send SMS, WhatsApp messages, place calls, buy numbers,
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
   Tally metadata documented for Phase 14.6E.
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

## Tenant-Isolation Gate

For Slack, Twilio, and Tally, use Org A and Org B:

1. Connect the provider only in Org A.
2. Verify Org B cannot read safe account metadata for Org A.
3. Verify Org B cannot test, disconnect, or use Org A credentials.
4. Confirm no credential, webhook URL, or Basic Auth value reaches client DTOs
   or audit metadata.

## Next E2E Boundary

Phase 14.6F adds Google Calendar and Gmail OAuth plus constrained provider
operations. It must preserve the 14.6B-14.6E provider contracts above.
