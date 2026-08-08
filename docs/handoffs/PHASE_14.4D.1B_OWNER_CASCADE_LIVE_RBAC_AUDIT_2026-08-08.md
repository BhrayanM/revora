# AI Growth - Phase 14.4D.1B Owner Cascade and Live RBAC Audit

**Date:** 2026-08-08  
**Repository:** `C:\Users\bhray\ai-growth-platform`  
**Branch:** `master`  
**RBAC foundation checkpoints:** `32dcc51`, `217b0e4`  
**Owner cascade correction:** `6fa313f`  
**Linked Supabase project:** `fnkzqrnsfnqxbodxdjgq`

## Status

**Phase 14.4D.1 - RBAC Foundation + Membership Model is formally complete.**

Migration history is synchronized locally and remotely through `00019`. The
live SQL RBAC/RLS matrix passed with `ROLE authenticated` and per-user JWT
claims. Turnstile was not disabled, bypassed, or changed.

**Invitations, Team Management UI, organization switching, and ownership
transfer remain unimplemented. Do not start Phase 14.4D.2 without explicit
approval.**

## Defect Found and Root Cause

Migration `00018` introduced `trg_memberships_protect_owner`, which rejected
every `DELETE` of an owner membership. The schema has both of these cascading
relationships:

```text
organizations.id -- ON DELETE CASCADE --> memberships.organization_id
auth.users.id -- ON DELETE CASCADE --> profiles.id -- ON DELETE CASCADE --> memberships.profile_id
```

Therefore, deleting an organization invoked the membership `BEFORE DELETE`
trigger for its owner and was incorrectly rejected. This also correctly—but
too broadly—blocked deleting an owner auth/profile while the organization
remained.

## Migration 00019

**File:** `supabase/migrations/00019_owner_protection_cascade_fix.sql`

`00019` replaces only `public.protect_owner_membership()` and reasserts that
the trigger function has no `PUBLIC`, `anon`, or `authenticated` EXECUTE
grant.

For an owner membership delete, the function now checks whether its parent
organization still exists:

- Parent organization exists: reject the delete. This protects direct
  membership removal and auth/profile cascades that would orphan a live org.
- Parent organization no longer exists: permit the delete. This is the narrow
  `organizations.id ON DELETE CASCADE` path.

The function is now `SECURITY DEFINER` with `search_path = ''` so the parent
existence check cannot be distorted by RLS visibility. Owner profile/org
reassignment, role downgrade, suspension, and removal status changes remain
blocked.

### Deployment

`npx supabase db push --linked` deployed only `00019` successfully.

```text
Local migrations:  00001–00019
Remote migrations: 00001–00019
Status: exact match
```

Migrations `00001` through `00018` were not changed. `00019` is now applied
and must be treated as immutable.

## Live Owner-Safety Results

Verified against disposable live records:

| Scenario | Result |
| --- | --- |
| Direct owner membership delete while organization exists | Denied |
| Owner role downgrade | Denied |
| Owner suspension | Denied |
| Owner auth-user deletion while organization exists | Denied |
| Delete parent organization | Allowed |
| Parent organization cascade removes owner membership | Allowed and verified |

The two residual fixtures from the prior interrupted audit were removed only
after `00019` was deployed. Their dependent memberships, workspaces,
pipelines, stages, leads, and execution records were removed by intended
cascades. No real organization or user was targeted.

## Live SQL RLS Methodology

Password sign-in was intentionally not used: the linked Supabase project
correctly rejects unattended password sign-in without a valid Turnstile token.
Instead, the audit used the supported database test context:

```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<temporary-auth-user-uuid>', true);
```

The harness first asserted that `auth.uid()` resolved to the temporary user,
then issued real SQL reads/writes under that role. It did not test RLS as
`postgres` or `service_role`. Fixture setup and final cleanup used the
restricted server-only administrative path; authorization assertions did not.

## Live RLS Results

| Principal | Result |
| --- | --- |
| Owner A | Own-org reads and lead writes allowed; Org B hidden and immutable. |
| Admin A | Integration/API-key writes allowed; membership promotions, owner targeting, and second-owner creation denied. |
| Manager A | Lead and pipeline operations plus automation creation allowed; integrations and API keys denied. |
| Agent A | Lead creation/update allowed; integrations and automations denied. |
| Viewer A | Lead/pipeline reads allowed; lead, pipeline, integration, API-key, automation, and org-setting mutations denied. |
| Suspended A | Organization reads and writes denied. |
| Removed A | Organization reads and writes denied. |
| Owner B | Org B read allowed; Org A hidden. |

Cross-tenant lead reference tampering was denied for a foreign
`organization_id`, `workspace_id`, and `pipeline_id`/stage pair. This confirms
the live `has_valid_lead_tenant_references` boundary.

`is_org_member` returned true only for active membership in the requested
organization; it returned false for foreign, suspended, and removed contexts.
No RLS recursion error occurred.

## Live Security Configuration Review

- RLS is enabled on organizations, memberships, workspaces, pipelines,
  pipeline stages, leads, automations, integrations, source API keys, and
  automation executions.
- RBAC helper functions are `SECURITY DEFINER`, use `search_path = ''`, revoke
  `PUBLIC` and `anon` execution, and grant only `authenticated` where required
  for policies.
- `protect_owner_membership()` is `SECURITY DEFINER`, has the same fixed
  search path, and is not executable by `anon`, `authenticated`, or `PUBLIC`.
- The live policy definitions retain role-specific `USING` and `WITH CHECK`
  predicates. There is no direct client membership INSERT, UPDATE, or DELETE
  policy.
- `service_role` remains limited to server-only onboarding recovery, protected
  inbound ingestion/automation work, and test fixture setup/cleanup. It is not
  exposed to the browser.

## Server Authorization Review

Static review reconfirmed that user-triggered mutations derive identity and
organization from the server-side Supabase session and the centralized
permission helper:

- leads and pipeline stage movement: `leads.write`;
- AI qualification: `leads.qualify` plus ownership lookup;
- organization settings: `organization.settings.manage`;
- API keys: `apiKeys.read` / `apiKeys.manage`;
- integrations: `integrations.read` / `integrations.manage`;
- automation activity: `automation.read`.

The project has no configured TypeScript test runner or pre-existing app test
suite to extend. The live SQL RLS matrix is the executed automated RBAC test
coverage. Manual browser E2E remains separate from the database audit.

## Onboarding Regression

The existing `onboard_user` RPC was executed with a disposable user and
verified to create:

```text
profile -> organization -> active owner membership -> workspace
```

The disposable onboarding organization and user were removed during cleanup.

## Fixture Cleanup

Two fixture sets were created and fully removed:

1. The prior `rbac-live-*` residual organizations and their two remaining
   owner users, after the cascade correction.
2. A new `rbac-sql-*` matrix with nine temporary users, Org A/Org B, active,
   suspended, and removed memberships, and representative CRM/configuration
   rows.

Final prefix queries confirmed zero temporary organizations, memberships,
leads, workspaces, pipelines, and auth users.

## Remaining Manual Browser E2E

- Valid Turnstile login/session flow for each role before the future Team UI
  exists.
- Visual dashboard redirect/empty-state behavior for suspended and removed
  users.
- User-facing error presentation when a direct server action is denied.

These are E2E/UI checks only; Turnstile must remain fail-closed and was not
changed for this audit.

## Validation

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run build` — pass (25 routes)
- `npm audit` — pass (`0 vulnerabilities`)
- `git diff --check` — pass
- `npx supabase migration list --linked` — local and remote match through
  `00019`

## Next Step

The next roadmap item remains **Phase 14.4D.2 — Invitations**. It must use the
membership lifecycle/RBAC foundation without weakening RLS, creating a generic
role mutation endpoint, or changing migrations `00001` through `00019`.

## Explicit Do Not Rules

- Do not modify migrations `00001` through `00019`.
- Do not weaken RLS, tenant isolation, MFA, legal consent, PKCE OAuth, or
  Turnstile fail-closed behavior.
- Do not expose service-role credentials or use service role for ordinary user
  actions.
- Do not implement invitations, Team Management UI, organization switching, or
  ownership transfer in this completed checkpoint.
- Do not push without explicit authorization.
