# Phase 14.5 — Core CRM Live Test and End-to-End Lead Flow Audit

Date: 2026-08-09

## Scope and outcome

Phase 14.5 moved the core CRM from an incomplete architecture state to a
tenant-scoped persisted flow: default pipeline provisioning, lead creation,
stage movement, qualification persistence, live metrics, and authoritative
internal activity events. It also removed synthetic score and trend displays.

The linked database is synchronized through migrations `00001`–`00027`.
Migrations `00001`–`00025` were not modified.

One controlled OpenAI request was made with synthetic input only. It succeeded
with `gpt-4o-mini-2024-07-18`, returned valid structured JSON, and used 254
tokens. The API key was not printed, moved, or committed.

## Migration correction and deployment

`00026_core_crm_live_flow.sql` initially failed before deployment. PostgreSQL
raised `42P10` because an `UPDATE public.leads AS lead ... FROM LATERAL (...)`
subquery referenced the target-table alias from the `FROM` item. PostgreSQL
does not make an `UPDATE` target alias visible inside that lateral `FROM`
relation.

Because `00026` was completely rolled back and had never been deployed, it was
corrected in place. The stage backfill now uses a correlated scalar subquery in
the `SET` expression, where `lead.pipeline_id` is validly visible. The rewrite
also normalizes only null or invalid same-tenant workspace/pipeline/stage
references, preserves valid assignments, and deterministically uses the first
stage by `order_index, created_at`.

`00026` was then deployed successfully. It:

- creates a default `Revenue Pipeline` and seven standard stages for existing
  organizations that lacked them;
- updates `onboard_user` so future organizations receive the same defaults;
- backfills only incomplete/invalid lead references within the lead's own
  organization; and
- adds an after-insert/update lead trigger that writes authoritative
  `lead.created`, `lead.updated`, `lead.stage_changed`, and `lead.qualified`
  notes to the existing `conversations` timeline.

Remote verification after deployment found 11 organizations, 11 default
pipelines, 77 stages, zero incomplete leads, zero cross-organization pipeline
references, and zero invalid lead-stage references.

The Phase 14.5 RLS audit identified a separate direct client mutation issue:
an authenticated Agent could submit an arbitrary `score` value through
PostgREST. The test was rolled back. Migration
`00027_protect_ai_qualification_fields.sql` fixes it by revoking broad
authenticated/anon `INSERT` and `UPDATE` on `leads`, then granting only
user-managed lead and tenant-reference columns to `authenticated`. Scores,
tags, metadata, source external IDs, and timestamps are now server/system
fields. AI persistence is performed only after server-side permission and
tenant checks.

After `00027`, the identical Agent score-injection test failed with database
permission error `42501`; a valid Agent stage move still persisted.

## Before-state audit: real vs. mock

| Feature | Main source | Database source | Before Phase 14.5 | Final state |
| --- | --- | --- | --- | --- |
| Manual lead creation | `src/app/(dashboard)/leads/actions.ts` | `leads` | Partial: persisted but no pipeline/stage and synthetic score `50` | Live: server validation, active-org workspace, default pipeline/stage, default score `0` |
| Lead detail | `src/app/(dashboard)/leads/[id]/page.tsx` | `leads`, `conversations` | Partial: tenant check existed; AI breakdown was fabricated | Live persisted fields and events; fabricated breakdown removed |
| Pipeline movement | `src/app/(dashboard)/pipeline/actions.ts` | `leads`, `pipelines`, `pipeline_stages` | Partial: server validation existed, but no default pipelines were provisioned | Live persisted stage movement with tenant validation and analytics revalidation |
| Dashboard KPIs | dashboard page and `queries/analytics.ts` | `leads`, `conversations` | Partial: real rows, but synthetic average scores and derived activity | Live organization-scoped totals, qualified count, conversion, qualified-only average score, real event timeline |
| Analytics | analytics page and `queries/analytics.ts` | `leads`, `pipelines`, `pipeline_stages` | Partial: real aggregations plus fake `+0%` trends | Live persisted counts/distributions; unavailable trends omitted |
| AI qualification | `lib/ai/*`, lead qualification modules | `leads.metadata`, `automation_executions` | Partial: OpenAI client existed, metadata could be overwritten, no durable duplicate guard | Implemented server-only structured qualification, metadata merge, safe errors, one-minute durable idempotency key, persisted model metadata |
| Internal lead activity | none authoritative | `conversations` | UI-derived/mocked from timestamps | Live database-triggered events |
| Source ingestion API | `src/app/api/leads/route.ts` | `source_api_keys`, `leads` | Partial: persisted unassigned lead at score `50` | Updated to resolve workspace/default pipeline/first stage and use score default `0` |
| CRM verification script | `scripts/verify-crm.mjs` | none | Mock-only | Still mock-only; not used as live evidence |

## Lead and pipeline architecture

`leads` already contained the required identifiers and state: `id`,
`organization_id`, `workspace_id`, `pipeline_id`, `pipeline_stage_id`,
contact fields, `source`, `status`, `score`, `tags`, `metadata`, and
timestamps. No duplicate qualification fields were added. Qualification data
continues to live under `metadata.qualification`, including `qualifiedAt`,
summary, signals, risks, action, model, and token count.

`00026` guarantees a default pipeline and deterministic first stage for each
organization, and `onboard_user` now provisions those records atomically with
the organization and workspace. The existing RLS function
`has_valid_lead_tenant_references` remains authoritative for workspace,
pipeline, and stage tenancy.

## AI qualification architecture

- Server-only key access: `OPENAI_API_KEY` is read only by
  `src/lib/ai/client.ts`; no `NEXT_PUBLIC_` key exists.
- Configured model: `OPENAI_MODEL` when set, otherwise `gpt-4o-mini`.
- Provider interface: OpenAI Chat Completions JSON mode with a supplied JSON
  schema, followed by application validation.
- Input minimization: qualification excludes raw email and phone values, using
  availability indicators instead. It includes only necessary company/source/
  status data and up to five 200-character conversation excerpts.
- Prompt safety: the system prompt labels lead context as untrusted data and
  explicitly prohibits following instructions embedded in it.
- Score validation: integer `0`–`100` is enforced. Classification is derived
  server-side, never trusted from the model: `80`–`100` HOT, `50`–`79` WARM,
  `0`–`49` COLD.
- Failure behavior: missing configuration, provider failure, timeout, rate
  limit, malformed JSON, and schema errors return safe user-facing text. Raw
  provider error text is not returned to the UI.
- Persistence: a successful server qualification writes score, tags, merged
  `metadata.qualification`, model, token count, and timestamp in one lead
  update. The database trigger writes `lead.qualified` in the same database
  transaction.
- Cost guard: `automation_executions` uses its existing durable unique index
  `(organization_id, event_id, provider, action)`. The qualification code uses
  a lead/minute event key before contacting OpenAI, rejecting rapid duplicate
  requests. OpenAI retries are limited to one retry for qualifying transient
  provider failures.

## Live verification

A disposable test tenant with `.invalid` addresses was created and then fully
deleted. It contained two organizations, six synthetic users, five
memberships, five synthetic leads, and their activity records. Post-cleanup
verification found zero synthetic organizations, users, and leads.

| Check | Result |
| --- | --- |
| Owner creates a fully assigned lead | Passed: persisted org, workspace, pipeline, stage, and score `0` |
| Admin creates a lead | Passed |
| Manager creates a lead | Passed |
| Agent creates and moves a lead | Passed |
| Viewer reads organization leads | Passed |
| Viewer stage update | Denied; zero rows changed |
| Viewer lead creation | Denied by RLS (`42501`) |
| Org A owner reads known Org B lead ID | Denied; zero rows visible |
| Org A lead with Org B pipeline/stage IDs | Denied by RLS (`42501`) |
| Suspended Agent tenant read | Denied; zero rows visible |
| Removed Agent tenant read | Denied; zero rows visible |
| Direct Agent score injection before `00027` | Allowed in a rolled-back test; security defect confirmed |
| Direct Agent score injection after `00027` | Denied by column privilege (`42501`) |
| Lead created/stage changed activity | Persisted exactly once for each event |
| Synthetic qualified fixture | Score `86`, HOT metadata, `lead.qualified` event, and metrics source data persisted |
| Dashboard/analytics source values | Verified from persisted tenant data: 4 leads, 1 qualified, average AI score 86, 1 contacted lead, 1 qualification event |
| Controlled OpenAI request | Passed once; structured schema valid, model `gpt-4o-mini-2024-07-18`, 254 tokens |

The OpenAI request used synthetic context only. It verified the configured
provider, JSON response mode, and schema contract. The local shell does not
have `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, or
`SUPABASE_SERVICE_ROLE_KEY`, so the authenticated Next server-action/API
route could not be invoked locally end-to-end. Its source path compiled and
was covered by the database/RLS, provider, and persistence tests above.

## RBAC and security findings

Current role permissions allow Owner, Admin, Manager, and Agent to create and
update leads; Viewer remains read-only. The qualification server action checks
`leads.qualify` before any provider request, so Viewer direct action calls are
denied by the existing authorization gate. Internal n8n qualification remains
HMAC-gated and organization-scoped; PKCE, OAuth, MFA, Turnstile, invitations,
ownership transfer, RLS policies, and legal consent logic were not modified.

The formal Codex security-scan runner could not run because Python is not
installed in the execution environment. A focused source, RLS, grant, prompt
safety, service-role, foreign-ID, and SQL/JWT review was completed instead.

## External integration status

| Integration | Status | Evidence |
| --- | --- | --- |
| HubSpot | Partial / untested | Provider adapter exists; no integration rows were configured and no call was made |
| GoHighLevel | Partial / untested | Provider adapter exists; no integration rows were configured and no call was made |
| n8n | Partial / untested | Reliable emitter and HMAC internal route exist; no external delivery was performed and no execution rows pre-existed |
| Slack | Partial / untested | Adapter exists; no integration rows were configured and no call was made |

No production/customer data was sent to any integration.

## Validation

- `npm run lint` — passed
- `npm run typecheck` — passed
- `npm run build` — passed with Next.js 16.3.0
- `npm audit` — 0 vulnerabilities
- `git diff --check` — passed
- `supabase migration list --linked` — local and remote synchronized through
  `00027`

## Remaining manual checks and production blockers

1. Supply the standard Supabase runtime variables to the local/deployed app
   environment and perform one authenticated browser/server-action
   qualification test with a synthetic tenant. Confirm the one-minute guard
   creates a visible `automation_executions` record and the lead detail updates
   without refresh issues.
2. Run browser QA at desktop/tablet/mobile in Light, Dark, and System themes:
   lead creation, stage movement, qualification states/errors, dashboard,
   analytics, automation, keyboard navigation, and focus states.
3. Before production usage, confirm that the OpenAI key is a dedicated Revora
   project key. The available configuration did not indicate personal/shared
   ownership, but provenance cannot be proven from environment variable
   presence alone.
4. The minute-bucket idempotency guard stops obvious duplicates but is not a
   full organization-wide quota/rate-limit system. Add distributed usage and
   budget controls before broad rollout.
5. Configure and test external integrations one at a time with explicit
   approval before sending customer data.

## Recommended next phase

**Phase 14.5B — Authenticated Browser E2E and Operational Guardrails:**
validate the real Next server action with runtime configuration, add durable
organization-level AI quotas/observability, and separately approve each
external integration activation.
