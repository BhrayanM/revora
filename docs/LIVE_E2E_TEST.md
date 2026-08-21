# Live E2E Test — Integration Roadmap

**Updated:** 2026-08-20

**Current phase:** 14.6D — Slack + Twilio

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

The current local environment has no configured `SLACK_CLIENT_ID`,
`SLACK_CLIENT_SECRET`, or `SLACK_REDIRECT_URI`. The linked database has no
Slack or Twilio integration row. Therefore this report does not claim a live
Slack or Twilio gate.

## Local Phase 14.6D Gate

Final local run on 2026-08-20: **PASS** for communications, 14.6C regression,
lint, typecheck, production build, npm audit, whitespace, documentation format,
secret scan, and migrations `00001`-`00033` synchronization.

Run from the project root:

```powershell
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

- Slack/Twilio behavioral contracts pass.
- The Phase 14.6C automation regression passes.
- Lint, strict types, and the production build pass.
- Audit reports zero vulnerabilities.
- Local and linked migrations match from `00001` through `00033`.

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

## Tenant-Isolation Gate

For both providers, use Org A and Org B:

1. Connect the provider only in Org A.
2. Verify Org B cannot read safe account metadata for Org A.
3. Verify Org B cannot test, disconnect, or use Org A credentials.
4. Confirm no credential, webhook URL, or Basic Auth value reaches client DTOs
   or audit metadata.

## Next E2E Boundary

Phase 14.6E adds Tally inbound lead capture, signature verification, and
replay-safe deduplication. It must add its provider-specific tests without
changing the Slack/Twilio contracts above.
