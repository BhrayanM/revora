# Phase 14.5B — Authenticated Browser E2E + Operational Guardrails

**Date:** 2026-08-09
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Status:** **COMPLETE** — Authenticated browser E2E executed; operational guardrail verified; bug fixed.

## Scope and outcome

Phase 14.5 database, RLS, and provider work was retained without redesign. This pass deployed a durable organization-level AI qualification guardrail, completed static validation, executed the full authenticated browser E2E flow, discovered and fixed a service-role client bug, and corrected the Pipeline Kanban layout for full-viewport usage.

## Authenticated browser E2E — EXECUTED

A real signed-in browser session completed the full flow on 2026-08-09 without bypassing Turnstile, MFA, OAuth/PKCE, legal consent, or session state.

## CRM E2E results

| Check | Result |
| --- | --- |
| UI lead creation | PASS — Revora BrowserE2E persisted with org, workspace, pipeline, stage, `lead.created` |
| Lead detail and refresh persistence | PASS — all fields rendered, refresh persistent |
| Pipeline movement | PASS — Contacted persisted, `lead.stage_changed` events |
| OpenAI server route | PASS — one real `gpt-4o-mini-2024-07-18` call, 926 tokens, 2692ms |
| Qualification persistence | PASS — score 30, COLD, metadata, `lead.qualified` event |
| Dashboard | PASS — 2 leads, 1 qualified, avg 30, pipeline distribution correct |
| Analytics | PASS — all aggregates, temperature, pipeline, sources verified |
| Duplicate rejection (browser) | Not repeated — minute bucket expired; DB-level guard already validated |
| Fixture cleanup | PASS — lead, 7 conversations, 1 execution deleted; zero orphans; TenantA preserved |

## Bug discovered during E2E

**Root cause:** `createServiceClient()` used service-role API credentials while also injecting the authenticated browser session through SSR cookie handlers. PostgREST evaluated the authenticated user JWT for RLS. `automation_executions` had no authenticated INSERT policy. Result: `42501` permission denied before any OpenAI call.

**Fix:** Replaced `createServiceClient` with `createServiceAdminClient` (empty cookie handlers, pure service-role) in:

- `src/lib/automation/executions.ts` — `startExecution`, `startLeadQualificationExecution`, `completeExecution`
- `src/lib/ai/lead-qualification.ts` — qualification persistence path

Security invariant preserved: authenticated user → active org → RBAC → tenant validation → privileged internal persistence.

## Pipeline Kanban corrective layout

Three incremental fixes collapsed into final working state:

1. Removed `max-w-[320px]` column cap
2. Established flex height chain (DashboardShell `<main>` flex column, Container `flex-1`)
3. Replaced percentage heights (`h-full`, `min-h-full`) with pure flex resolution; removed inner track wrapper; added `overflow-y-hidden` on board to permit `align-items: stretch`

Final behavior: full-height Kanban lanes, cards at top, empty lanes fill space, horizontal scrollbar at board bottom, `min-w-[240px]`.

## Operational AI guardrail

Migration `00028` deployed and verified:

- `organization_ai_qualification_windows` — per-org, per-UTC-hour reservations
- Atomic `reserve_organization_ai_qualification_slot()` — security definer, service-role only
- 20 qualification slots per org per UTC hour (development safety ceiling)
- 1 slot consumed during E2E qualification (UTC 21:00 hour)

## OpenAI result

| Field | Value |
| --- | --- |
| Model | `gpt-4o-mini-2024-07-18` |
| Tokens | 926 |
| Duration | 2,692ms |
| Score | 30/100 |
| Classification | COLD |
| Confidence | 50% |

## Migration state

| Scope | State |
| --- | --- |
| Local/remote | Synchronized: `00001`–`00028` |
| Earlier migrations | `00001`–`00027` unchanged |

## Validation

| Command | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | 32 routes, passed |
| `npm audit` | 0 vulnerabilities |
| `git diff --check` | Passed |
| `npx supabase migration list --linked` | Local = remote through `00028` |

## Production blockers and recommendation

1. Dedicated Revora OpenAI project key before production use.
2. Approved production AI quota/budget policy beyond the 20/hour development ceiling.
3. Custom SMTP and verified sending domain.
4. Secret rotation and environment separation.
5. Production OAuth redirect URLs and provider-specific scope review.
6. Webhook replay/body-signing hardening where applicable.
7. Production security logging and integration-specific E2E verification.

**Next approved phase:** Phase 14.6A — Integration Foundation.
