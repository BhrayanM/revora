# Revora Project Status

**Last updated:** 2026-08-21

**Working branch:** local Phase 14.6G closure; no push or deployment

**Latest implementation checkpoint:** Phase 14.6G complete integration E2E audit

**Current status:** Phases 14.6A-14.6G are implemented and locally validated.
The complete deterministic integration gate passes. Current external gates are
blocked by incomplete credentials, public HTTPS/Supabase context, or explicit
mutation authorization; no new live mutation was performed in 14.6G.

## Current Architecture

- Next.js 16.3 App Router, React 19, strict TypeScript, and Tailwind CSS v4.
- Supabase Auth and PostgreSQL with generated types and organization-scoped RLS.
- Server actions and route handlers re-authorize organization permissions;
  provider credentials stay encrypted and server-only.
- Immutable migrations `00001` through `00035`; 14.6G adds no migration. The
  current worktree is not linked to Supabase and its local database is stopped,
  so applied history remains an explicit external gate.

## Completed Roadmap

- Phase 14.4D: team RBAC, invitations, management, multi-organization switching,
  and ownership transfer.
- Phase 14.5: Core CRM live validation and closure.
- Phase 14.6A: integration foundation.
- Phase 14.6B: HubSpot and GoHighLevel.
- Phase 14.6C: n8n, Zapier, and Make automation webhooks.
- Phase 14.6D: Slack OAuth/HOT alerts and Twilio read-only infrastructure.
- Phase 14.6E: Tally automatic connection, signed inbound lead capture,
  tenant-scoped replay protection, and local phase gate.
- Phase 14.6F: shared Google Workspace OAuth, coordinated refresh/revocation,
  read-only Tests, and bounded Calendar/Gmail operations.
- Phase 14.6G: aggregate provider gate, OAuth/PKCE and CRM transport hardening,
  migration immutability, environment/live matrix, and full local regression.

## Provider Status

| Provider | Status | Notes |
| --- | --- | --- |
| HubSpot | Local PASS; prior live PASS 14.6B | Atomic encrypted PKCE and bounded organization-scoped CRM sync |
| GoHighLevel | Local PASS; prior live PASS 14.6B | OAuth/location-scoped bounded CRM sync |
| n8n | Local PASS; prior live PASS 14.6C | Signed organization-scoped automation delivery |
| Zapier | Local PASS; prior live PASS 14.6C | Secure outbound webhook delivery |
| Make | Local PASS; prior live PASS 14.6C | Secure outbound webhook delivery and retry gate |
| Slack | Implemented; live gate blocked by credentials | OAuth `incoming-webhook`, test/disconnect, exact-HOT alert |
| Twilio | Implemented; live gate blocked by credentials | Account and optional number ownership validation; GET only |
| Tally | Implemented; live gate blocked by credentials | Automatic form/mapping setup, signed webhook, replay-safe lead capture |
| Google Calendar | Implemented; live gate blocked by credentials | Shared OAuth, primary-calendar read-only Test, bounded appointment creation |
| Gmail | Implemented; live gate blocked by credentials | Shared OAuth, OIDC/scope Test, one-recipient plain-text send |

No usable Tally API key or encrypted Tally test connection is available in the
current local context, and `NEXT_PUBLIC_APP_URL` is not an externally reachable
HTTPS origin. No live Tally gate is claimed. Twilio SMS, WhatsApp, voice, number
purchase, and public callbacks remain out of scope.

## Phase 14.6D Security Properties

- Slack OAuth state is single-use, expiring, provider-bound, and
  organization-bound.
- Slack accepts only the exact `https://hooks.slack.com/services/...` origin,
  blocks redirects, and bounds time and response size.
- Only an exact `HOT` qualification sends a Slack alert; WARM and COLD skip it.
- Slack failure never rolls back a persisted AI qualification.
- Twilio makes only read-only `GET` requests with HTTP Basic authentication.
- Credentials and webhook URLs are excluded from client-safe connection DTOs,
  logs, and audit metadata.
- Every save, test, disconnect, and provider read is scoped to the authenticated
  organization.

## Phase 14.6E Security Properties

- Tally API keys and independent webhook signing secrets are encrypted and
  server-only; raw routing tokens are never stored.
- Webhooks require an exact raw-body HMAC-SHA256 signature and reject bodies
  above 1 MiB.
- Event uniqueness is scoped to organization, provider, and external event ID;
  lead source uniqueness is a second idempotency boundary.
- Only confirmed mapped scalar values become lead fields. Raw payloads, file
  URLs, previews, PDFs, signatures, unmapped answers, and secrets are not stored.
- Connect, Test, and Disconnect re-authorize `integrations.manage`; Test is
  read-only and Disconnect disables local ingestion even if cleanup fails.

## Phase 14.6F Security Properties

- One verified Google subject is shared by Calendar and Gmail for each
  organization; both encrypted credential rows are written and refreshed
  atomically.
- OAuth requests exactly `openid`, `email`, `calendar.events.owned`, and
  `gmail.send`; broad Calendar and all Gmail read scopes are absent.
- Calendar Test lists at most one `primary` event. Gmail Test validates OIDC
  identity/scope and sends nothing.
- Mutations allow one bounded primary-calendar appointment or one-recipient
  plain-text email, with no automatic retry of ambiguous failures.
- Disconnect from either card revokes the shared grant when possible and always
  clears both local credential rows.
- Message/event contents and recipient addresses never enter audit metadata.

## Phase 14.6G Audit Properties

- OAuth state persistence fails closed; single-use consumption is atomic and
  PKCE is encrypted at rest.
- Active CRM transports use fixed origins, reject redirects, time out at 15
  seconds, bound responses to 64 KiB, and do not expose provider bodies.
- Generic server actions cannot bypass specialized connect/disconnect flows.
- `npm run test:integration-e2e` covers all ten provider IDs plus shared
  authorization, retry/idempotency, migration, and client-boundary contracts.
- No integration implementation phase remains. External live gates remain
  distinct from deterministic local completion.

## Remaining Global Product Plan

1. **14.7 — Product UX Completion:** visual polish, provider logos, validated
   settings selectors, and explicit delivery decisions for remaining `Soon`
   modules.
2. **14.8 — Production Infrastructure and Release Readiness:** production
   environment, deployment, SMTP, distributed rate limiting, monitoring,
   backups, security controls, credential rotation, legal review, and final
   global regression.

## Operational Boundaries

- No push or production deployment has been performed.
- No Twilio paid or mutating action is authorized.
- Do not modify migrations `00001` through `00035`; add only a new consecutive
  migration when a later approved phase requires schema changes.
- External live status must be reported separately from local implementation.
