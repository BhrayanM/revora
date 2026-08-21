# Phase 14.6F Completion Handoff — Google Calendar + Gmail

- **Date:** 2026-08-21
- **Project:** `C:\Users\bhray\proyectos\01_Activos\Plataformas\ai-growth-platform`
- **Feature branch:** `feature/phase-14-6f-google-workspace`
- **Status:** Local implementation complete; live OAuth/mutation and linked
  migration gates remain external.

## Outcome

Phase 14.6F adds one organization-scoped Google Workspace OAuth bundle for
Google Calendar and Gmail. It uses exact least-privilege scopes, encrypted
coordinated tokens, safe non-mutating Tests, joint revocation/disconnect, and
server-only bounded appointment/email operations.

- Local result: **PASS**.
- Live result: `GOOGLE_WORKSPACE_LIVE_GATE=BLOCKED_CREDENTIALS`.
- Migration result: `MIGRATION_00035_LINKED=PENDING_NOT_LINKED`.

No push, deployment, purchase, live message, live event, OAuth grant, linked
migration application, or production mutation was performed.

## Local Commits

- `672ef0b test(integrations): define google workspace contracts`
- `a8e0902 feat(integrations): add google workspace oauth lifecycle`
- `007d325 fix(integrations): keep tally route next compliant`
- `fe455ae feat(integrations): add bounded calendar and gmail operations`
- `2758924 feat(integrations): wire google workspace settings`
- Phase closure documentation: this commit

## Delivered Scope

- One OAuth consent from either Google card connects both capabilities to the
  same verified Google subject/email in one atomic two-row upsert.
- Exact scopes: `openid`, `email`, `calendar.events.owned`, and `gmail.send`.
- Fixed Google origins, 15-second timeout, 64 KiB response bound, redirect
  rejection, strict token/UserInfo parsing, and safe error normalization.
- Access and refresh tokens are encrypted and updated atomically across both
  organization/provider rows; drift fails closed.
- Calendar Test performs only a one-item `events.list` on `primary`.
- Gmail Test verifies OIDC identity and exact send scope without sending or
  requesting any Gmail read permission.
- Disconnect from either card attempts one grant revocation, then always clears
  and disables both local rows.
- Calendar operation creates only one bounded event on `primary`, with optional
  one attendee, no recurrence/conferencing/attachments, and no automatic retry.
- Gmail operation sends one plain-text message to one recipient with no HTML,
  attachments, tracking, inbox access, caller-controlled From, or automatic
  retry.
- Audit metadata stores only provider IDs, event/message IDs, coarse
  count/duration, normalized status, and cleanup outcome—not content or
  credentials.

## Migration State

- Migrations `00001`-`00034` remain immutable; migration `00034` matches its
  Phase 14.6E SHA-256 guard.
- `00035_phase_14_6f_google_workspace_audit.sql` is the only new migration.
- It only preserves/extends the audit event allowlist with
  `calendar_event_created` and `gmail_message_sent`.
- No migration was applied locally or to a linked project.

## Compatibility Correction

Fresh Next 16 route typing detected that the Tally Route Handler exported a
test helper in addition to `POST`. The helper was moved unchanged to
`src/lib/integrations/tally-webhook-route.ts`; the route now exports only
`POST`. The full Tally suite passes, and no Tally behavior, migration, security
contract, or payload handling changed.

## Fresh Validation Evidence

Executed successfully on 2026-08-21:

- `npm.cmd run test:google-workspace`
- `npm.cmd run test:tally`
- `npm.cmd run test:communications`
- `npm.cmd run test:integrations`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd audit` — 0 vulnerabilities
- `git diff --check`
- targeted Prettier, migration immutability, credential, non-printing, and
  temporary-artifact checks

The Google suite covers exact OAuth/scopes, token and identity validation,
refresh behavior, fixed origins, timeout/redirect/body bounds, normalized
errors, read-only Tests, event/email limits and request bodies, one-attempt
mutations, migration preservation, and Settings authorization wiring.

## Credential and Live Safety

- No complete Google Workspace OAuth configuration or authorized Google test
  identity was available, so no live OAuth or API call was attempted.
- Do not place client secrets, authorization codes, access/refresh tokens,
  recipient addresses, message content, or event content in chat, clipboard
  history, commands, logs, screenshots, tickets, or handoffs.
- A future live mutation requires explicit authorization for the intended
  non-production account, recipient, and event interval.

## Next Exact Boundary

Start **Phase 14.6G — Complete Integration E2E Audit**:

1. Read this handoff, `PROJECT_STATUS.md`, `ROADMAP.md`, and
   `docs/LIVE_E2E_TEST.md`.
2. Inventory all Phase 14.6A-14.6F providers and execute deterministic local
   regression, tenant, credential-exposure, timeout, retry/idempotency, lint,
   type, build, audit, and migration immutability gates.
3. Separate local PASS evidence from live provider gates blocked by credentials,
   HTTPS origins, or authorized migration application.
4. Do not alter migrations `00001`-`00035`, push, deploy, purchase, or perform
   live mutations without explicit authorization.
5. Finish with a 14.6G handoff and one independent local commit.

