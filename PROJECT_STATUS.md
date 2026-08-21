# Revora Project Status

**Last updated:** 2026-08-21

**Working branch:** `master` after the authorized local Phase 14.6F merge

**Latest implementation checkpoint:** `2758924 feat(integrations): wire google workspace settings`

**Current status:** Phase 14.6F is implemented and locally validated. Google
Workspace live OAuth/mutation gates are `BLOCKED_CREDENTIALS`; migration
`00035` is local and has not been applied or verified against a linked Supabase
project.

## Current Architecture

- Next.js 16.3 App Router, React 19, strict TypeScript, and Tailwind CSS v4.
- Supabase Auth and PostgreSQL with generated types and organization-scoped RLS.
- Server actions and route handlers re-authorize organization permissions;
  provider credentials stay encrypted and server-only.
- Immutable migrations `00001` through `00034`; Phase 14.6F adds only `00035`.
  The current worktree is not linked to Supabase, so linked history through
  `00034` remains pending rather than assumed.

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

## Provider Status

| Provider | Status | Notes |
| --- | --- | --- |
| HubSpot | Complete and validated | Organization-scoped connection and CRM sync |
| GoHighLevel | Complete and validated | OAuth/location-scoped CRM sync |
| n8n | Complete and validated | Signed organization-scoped automation delivery |
| Zapier | Complete and validated | Secure outbound webhook delivery |
| Make | Complete and validated | Secure outbound webhook delivery and retry gate |
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

## Remaining Integration Plan

1. **14.6G — Complete E2E audit:** cross-provider, tenant-isolation, error,
   retry, and production-readiness gates.

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
- Do not modify migrations `00001` through `00034`; add only a new consecutive
  migration when a later approved phase requires schema changes.
- External live status must be reported separately from local implementation.
