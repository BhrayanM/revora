# Phase 14.6G Integration E2E Audit

**Date:** 2026-08-21  
**Scope:** Phase 14.6A-14.6F integration system  
**Local result:** PASS; final closure gate is recorded in the Phase 14.6G handoff  
**External result:** Mixed prior evidence and blocked current gates; no live
mutation was performed during 14.6G

## Executive Result

The deterministic audit covers all ten current provider IDs, shared OAuth,
credential storage, organization boundaries, provider HTTP transports,
webhook verification, retry/idempotency, client-safe DTOs, immutable migrations,
and build/dependency checks.

All confirmed local findings were remediated without a schema change. Migrations
`00001` through `00035` remain identical to the completed 14.6F checkpoint.
The current environment cannot support a new linked-database or live-provider
gate: it has no Supabase project ref, no running local Supabase database, and no
complete current credential set for any pending provider. Historical live PASS
evidence is retained, never relabeled as a fresh 14.6G live run.

## Provider Matrix

| Provider | Local 14.6G evidence | Live status at 14.6G close |
| --- | --- | --- |
| hubspot | OAuth/PKCE, encrypted credentials, bounded transport, CRM search/create/update, persistence and tenant contracts pass | `PRIOR_LIVE_PASS_14.6B`; current recheck `BLOCKED_ENVIRONMENT` because redirect and Supabase context are incomplete |
| gohighlevel | OAuth, bounded transport, location-scoped CRM sync, safe errors, refresh persistence and tenant contracts pass | `PRIOR_LIVE_PASS_14.6B`; current recheck `BLOCKED_CREDENTIALS` |
| n8n | SSRF controls, header authentication, durable delivery and bounded retry contracts pass | `PRIOR_LIVE_PASS_14.6C`; no new live mutation |
| zapier | Host restriction, durable delivery and retry/idempotency contracts pass | `PRIOR_LIVE_PASS_14.6C`; no new live mutation |
| make | Host/API-key validation, durable delivery and retry/idempotency contracts pass | `PRIOR_LIVE_PASS_14.6C`; no new live mutation |
| slack | Exact OAuth scope/origin, bounded transport, test/disconnect and exact-HOT post-persistence alert contracts pass | `BLOCKED_CREDENTIALS` |
| twilio | Account and optional source-number validation are bounded read-only GET operations; no messaging route exists | `BLOCKED_CREDENTIALS`; paid/mutating work remains deferred |
| tally | Automatic form/mapping lifecycle, signed bounded inbound route, tenant replay ledger and lead idempotency pass | `BLOCKED_CREDENTIALS_AND_PUBLIC_HTTPS` |
| google-calendar | Shared OAuth, exact scope, coordinated refresh, read-only Test and one-attempt bounded event creation pass | `BLOCKED_CREDENTIALS_AND_LINKED_MIGRATION` |
| gmail | Shared OAuth, exact send-only scope, non-mutating identity Test and one-attempt plain-text send pass | `BLOCKED_CREDENTIALS_AND_LINKED_MIGRATION` |

## Confirmed Findings and Remediations

### G-01 — OAuth state and PKCE lifecycle (`HIGH`, fixed)

The PKCE verifier was stored and returned as plaintext despite the encrypted
column contract. OAuth state creation and PKCE updates ignored persistence
errors, while state consumption used a read followed by an unchecked update;
two concurrent callbacks could pass the initial unused check.

Remediation:

- encrypt PKCE before persistence and decrypt only after successful state
  consumption;
- make state creation and PKCE storage fail closed on database errors;
- consume state with a compare-and-set constrained by row, organization,
  provider, unconsumed state, and unexpired timestamp;
- require the decrypted verifier in the HubSpot callback.

Existing pre-fix state rows require no migration and expire within ten minutes.

### G-02 — Specialized lifecycle bypass and catalog drift (`MEDIUM`, fixed)

Generic Settings actions could save or disconnect providers that have
specialized verified/OAuth cleanup flows. The catalog also described HubSpot
and GoHighLevel as supporting API-key setup although the product routes both
through OAuth.

Remediation: generic actions now reject all specialized CRM, Slack, Twilio,
Tally, and Google Workspace paths; HubSpot and GoHighLevel catalog metadata now
matches their OAuth UI and adapters.

### G-03 — CRM transport and fail-open behavior (`HIGH`, fixed)

The active CRM sync actions used direct provider fetches without response-size
limits or redirect rejection. A failed HubSpot search could continue to contact
creation, and arbitrary provider messages could reach UI or audit metadata.

Remediation:

- route active CRM operations through fixed-origin adapter transports;
- reject redirects, enforce 15-second timeouts and 64 KiB response limits;
- stop immediately on failed lookups/searches;
- validate returned contact IDs;
- replace arbitrary provider text with normalized messages;
- add executable mocked-transport regressions for HubSpot and GoHighLevel.

### G-04 — CRM persistence continuity (`MEDIUM`, fixed)

HubSpot connect/refresh/disconnect and GoHighLevel refresh/disconnect could
report success after a failed integration-row write. GoHighLevel refresh also
dropped a previously stored `company_id`.

Remediation: all implicated writes check their result and fail closed with safe
errors; GoHighLevel preserves `company_id` during refresh.

### G-05 — Clean-checkout type verification (`LOW`, fixed)

`tsc --noEmit` depended on Next-generated global route/layout types already
being present in `.next`. A clean worktree failed before a build.

Remediation: `npm run typecheck` now runs `next typegen` first, making the gate
reproducible from a clean checkout.

## Deterministic Evidence

The aggregate command is:

```powershell
npm.cmd run test:integration-e2e
```

It runs, in order:

1. CRM bounded-transport regressions;
2. n8n/Zapier/Make delivery regressions;
3. Slack/Twilio communication regressions;
4. Tally contract/ingestion regressions;
5. Google Workspace OAuth/operation regressions;
6. cross-provider static tenant, credential, action, migration, and client
   boundary assertions.

The closure gate additionally runs lint, self-contained strict typecheck,
default Next production build, `npm audit`, whitespace/format checks, secret
and control-character scans, and route inspection. Exact outputs and commit IDs
are recorded in the completion handoff.

The final default Next 16.3 Turbopack build passed on local `master` and
generated 37 routes after the isolated worktree was removed.

## Migration and Environment Evidence

- Immutable baseline: commit `a3b4f95`, migrations `00001`-`00035`.
- Local migration listing: `BLOCKED_LOCAL_DATABASE` at
  `127.0.0.1:54322`; no service was started automatically.
- Linked migration listing: `BLOCKED_NOT_LINKED`; no project ref exists.
- Git remotes: none configured; push is unavailable and was not attempted.
- Process environment: only a partial HubSpot pair was present; its redirect,
  Supabase context, and all other pending provider sets were incomplete.
- No credential value was printed, copied into documentation, or used for a
  live mutation.

## Residual External Gates

1. Apply/read back migrations `00034` and `00035` in an explicitly authorized
   linked non-production Supabase project.
2. Repeat Org A/Org B live tenant isolation with authorized credentials.
3. Complete Slack, Twilio read-only, Tally, and Google Workspace live gates.
4. Re-run current HubSpot/GHL/n8n/Zapier/Make evidence after deployment if a
   release candidate needs fresh external timestamps.
5. Keep Twilio SMS, WhatsApp, voice, phone purchase, and callbacks deferred
   until separately authorized.

## Decision

Phase 14.6G is locally complete when its final gate and clean-master readback
are recorded. No external PASS is inferred from missing credentials or
infrastructure. The next product boundary is Phase 14.7 Product UX Completion.
