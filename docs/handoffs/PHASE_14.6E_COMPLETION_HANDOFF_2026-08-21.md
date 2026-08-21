# Phase 14.6E Completion Handoff — Tally

- **Date:** 2026-08-21
- **Project:** `C:\Users\bhray\proyectos\01_Activos\Plataformas\ai-growth-platform`
- **Feature branch:** `feature/phase-14-6e-tally`
**Status:** Local implementation and phase gate complete; live and linked
database gates remain external.

## Outcome

Phase 14.6E adds an organization-scoped Tally integration that discovers forms,
suggests and validates field mappings, creates a signed remote webhook, ingests
one replay-safe lead per submission, supports read-only Test, and performs safe
Disconnect cleanup.

- Local result: **PASS**.
- Live result: `TALLY_LIVE_GATE=BLOCKED_CREDENTIALS`.
- Migration result: `MIGRATION_00034_LINKED=PENDING_NOT_LINKED`.

No push, deployment, purchase, linked migration application, or production
mutation was performed.

## Local Commits

- `de1423c test(integrations): define tally contracts`
- `7ca5783 feat(integrations): add bounded tally api adapter`
- `19189b6 feat(integrations): add tally inbound event ledger`
- `a5bc4c3 feat(integrations): connect tally forms automatically`
- `60cd231 feat(integrations): ingest signed tally leads`
- Phase closure documentation: this commit

## Delivered Scope

- Fixed-origin Tally adapter for the versioned `https://api.tally.so` API with
  15-second timeout, 1 MiB response bound, no redirects, safe error mapping, and
  only these operations: list forms, get questions, create/list/delete webhooks.
- Three-step Tally UI for an API key, one open published form, and confirmed
  name/email/phone/company/message mapping. Email or phone is mandatory.
- API key and independent signing secret encrypted at rest. A separate 256-bit
  routing token is exposed only while creating the provider webhook; only its
  SHA-256 hash is stored.
- New public route `/api/integrations/tally/webhook/[token]` using the Next.js 16
  async params contract, `application/json`, exact raw-body HMAC-SHA256,
  `Tally-Signature`, and a 1 MiB declared/actual body limit.
- Tenant-scoped webhook event claims with duplicate, payload-conflict,
  in-progress, failed-retry, and stale-claim recovery paths.
- Lead insertion uses source `other`, source external ID
  `tally:{formId}:{submissionId}`, the existing CRM default convention, and only
  safe Tally metadata. Event completion is persisted before outbound automation.
- Connect, Test, Disconnect, routing lookup, event lookup, and lead persistence
  retain organization isolation. Test is read-only. Disconnect disables local
  ingestion and clears encrypted credentials even if remote cleanup fails.

## Migration State

- `00001`-`00033` are byte-for-byte guarded by SHA-256 assertions and were not
  modified.
- `00034_phase_14_6e_tally_inbound.sql` is the only new migration.
- It changes event uniqueness to
  `(organization_id, provider, external_event_id)`, adds lead/retry metadata and
  indexes, preserves RLS/server-only mutation, and extends safe audit events.
- Local database validation could not connect because PostgreSQL was not running
  at `127.0.0.1:54322`.
- Linked validation returned `Cannot find project ref`; this worktree is not
  linked. Migration `00034` was not applied anywhere.

Before a live Tally test, explicitly authorize the intended non-production
Supabase project, link it safely, apply only pending migration `00034`, and read
back the migration history. Do not edit an applied migration.

## Fresh Validation Evidence

Executed successfully on 2026-08-21:

- `npm.cmd run test:tally`
- `npm.cmd run test:communications`
- `npm.cmd run test:integrations`
- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run build`
- `npm.cmd audit` — 0 vulnerabilities
- `git diff --check`
- Non-printing scan — 0 current phase-file matches for real provider credential
  patterns, 0 nonblank `TALLY_*` assignments, and 0 relevant temporary artifacts

The production build includes dynamic route
`/api/integrations/tally/webhook/[token]`. The Tally suite covers API bounds,
form parsing/mapping, raw-body signatures, valid creation, email-only and
phone-only leads, invalid/foreign events, completed duplicates, conflicts,
failed/stale recovery, lead uniqueness conflict, missing CRM defaults, outbound
ordering/failure, body limits, response codes, and unknown-token isolation.

## Credential and Data Safety

- No Tally API key was available in the process environment or supplied through
  an encrypted test connection, so no live provider call was attempted.
- The configured local `NEXT_PUBLIC_APP_URL` is HTTP. A live Connect requires an
  externally reachable HTTPS origin.
- Do not request or place a Tally API key, signing secret, routing token, or
  webhook URL in chat, clipboard history, repository files, commands, logs,
  screenshots, tickets, or handoffs.
- Raw Tally payloads, file/preview/PDF URLs, signature images, and unmapped
  answers are never stored.
- `src/lib/supabase/types.ts` was mechanically normalized from its prior UTF-16
  encoding to UTF-8 so the generated type changes could be applied. A semantic
  comparison confirmed that only the `00034` columns and relationship changed.

## Live Gate Procedure

After credentials, an HTTPS origin, and authorized migration application exist:

1. Connect Tally from Settings, load forms, select one open published form, and
   confirm mapping with email or phone.
2. Click Test and verify only read-only question/webhook-list requests.
3. Submit one unique test response and verify exactly one lead in the same
   organization with safe metadata only.
4. Verify identical replay is 2xx/idempotent and conflicting replay is 409.
5. Verify invalid signature 401, unknown token 404, and oversized body 413.
6. Repeat the isolation check with Org B.
7. Disconnect and verify local ingestion is disabled and credentials are clear.

## Next Exact Boundary

Start **Phase 14.6F — Google Calendar + Gmail**:

1. Read this handoff plus `PROJECT_STATUS.md` and `ROADMAP.md`.
2. Inspect current provider catalog, OAuth/state helpers, encrypted connection
   lifecycle, and Google integration placeholders without repeating completed
   providers.
3. Write the 14.6F design/spec and implementation plan covering least-privilege
   scopes, one Google identity per organization, token refresh, constrained
   Calendar/Gmail operations, tenant isolation, safe Test/Disconnect, and live
   credential blockers.
4. Create only migration `00035` if the approved design genuinely needs schema
   changes; never modify `00001`-`00034`.
5. Continue locally with independent commits and no push or deployment.
