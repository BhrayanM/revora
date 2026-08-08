# AI Growth - Phase 14.4D.1 RBAC Foundation Completion Handoff

**Date:** 2026-08-08
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Branch:** `master`
**Base checkpoint:** `7abc09e docs: sync project state before team management`
**Remote status:** migration `00018` is intentionally not deployed; do not push

## Status

Phase **14.4D.1 - RBAC Foundation + Membership Model** is locally complete and
validated. It establishes organization-scoped roles, membership lifecycle
states, centralized permissions, RLS enforcement, and server-side guards for
existing sensitive mutations.

**Invitations, Team Management UI, organization switching, and ownership
transfer are not implemented in this phase.** Do not start Phase 14.4D.2 until
`00018` is deployed and the post-deployment role matrix has been exercised.

## Membership Architecture Before This Change

- `public.memberships` already related `profiles` to `organizations` with
  `unique(profile_id, organization_id)`. This remains the authorization source
  for organization roles; `profiles.role` remains legacy display data and is
  not used for RBAC.
- The table supported `owner`, `admin`, `manager`, and `agent` only. It had no
  status or lifecycle timestamps.
- `public.is_org_member(org_id)` treated any membership row as authorization.
  Consequently, the pre-00018 design had no representation for suspended or
  removed access.
- The existing onboarding RPC inserts the initial organization membership as
  `owner`. This behavior is preserved.

## Migration 00018

**New local migration:**
`supabase/migrations/00018_team_rbac_foundation.sql`

The migration is additive to the applied immutable migrations `00001` through
`00017` and includes:

- `viewer` in the membership role constraint.
- `status` (`active`, `suspended`, `removed`), `joined_at`, `suspended_at`, and
  `removed_at` on `memberships`. Existing rows retain `created_at` as their
  join time and default to `active`.
- Partial active-membership indexes for user lookup and organization/role
  checks.
- A lifecycle timestamp trigger and an owner-protection trigger. The latter
  prevents deleting, suspending, removing, downgrading, or reassigning an owner
  membership through an ordinary update/delete operation.
- Active-membership RLS helpers, role helpers, shared-active-profile helper,
  and lead-reference integrity helper. All `SECURITY DEFINER` helpers use
  `search_path = ''`, revoke `PUBLIC`/`anon` execution, and grant only the
  authenticated role where policy evaluation requires it.
- A redefinition of the legacy `is_org_member` helper to mean **active** member
  so existing policies that use it immediately exclude suspended and removed
  memberships.
- Role-aware RLS updates for organization settings, workspaces, pipelines,
  stages, leads, conversations, automations, integrations, source API keys,
  and automation-execution visibility. Lead insert/update `WITH CHECK` clauses
  also verify workspace/pipeline/stage tenant consistency.
- Removal of direct authenticated membership INSERT and DELETE policies. Future
  invitation and team operations must use dedicated, server-authorized flows;
  no generic client-side `setRole(anyRole)` path exists.
- Removal of authenticated automation-execution INSERT/UPDATE policies. Those
  rows are system-generated through existing server-only automation paths.

### Deployment status

`npx supabase migration list --linked` confirmed remote migrations `00001`
through `00017` match local and **only `00018` is pending**.

**00018 ready to deploy** after the required live RLS test matrix is prepared.
The deployment command is:

```powershell
npx supabase db push --linked
```

Do not use `db reset`, migration repair, or a destructive command. Deployment
was intentionally not performed in this phase.

## Final Role and Permission Model

Roles are scoped to each organization membership. A future multi-organization
user can therefore be a manager in one organization, an admin in another, and
a viewer in a third.

| Role | Allowed scope | Explicit restrictions |
| --- | --- | --- |
| `owner` | Full organization access, including future admin management and ownership-transfer permission | Generic membership operations cannot change the owner; dedicated transfer workflow is deferred. |
| `admin` | Leads, AI qualification, pipelines, automation, integrations, API keys, team read/invite/manage, workspaces | Cannot manage an owner, grant/manage admins, grant owner, or transfer ownership. |
| `manager` | Dashboard/analytics, leads, AI qualification, pipeline configuration and movement, automation, team read | Cannot manage integrations, API keys, organization settings, admins, or ownership. |
| `agent` | Dashboard, lead read/write, AI qualification, pipeline movement/read | Cannot manage automation configuration, integrations, API keys, teams, or organization settings. |
| `viewer` | Read-only dashboard, analytics, leads, pipelines, and future team visibility | Cannot perform lead, pipeline, AI, automation, integration, API-key, membership, or organization mutations. |

`src/lib/auth/permissions.ts` centralizes the semantic permission matrix:

- dashboard/analytics, leads, AI qualification, pipeline, automation,
  integration, API key, team, organization settings, and workspace permissions.
- `canManageMembershipRole` establishes future role-transition limits: only an
  owner can manage an admin; no generic path can target or grant `owner`; an
  admin may only manage manager/agent/viewer roles.

## Server Authorization Changes

`src/lib/auth/index.ts` now provides:

- `getActiveMembership(organizationId?)`
- `requireOrganizationPermission(organizationId, permission)`
- `requireCurrentOrganizationPermission(permission)`

Each helper obtains the Supabase session server-side, requires current legal
consent, verifies an **active** membership for the requested organization, and
checks the centralized role matrix. Client-supplied role, permission, and
organization values are not trusted.

The following user-triggered server paths now enforce the helper before doing
work:

- lead create/delete;
- lead pipeline-stage move and AI qualification;
- organization settings update;
- source API-key list/create/revoke;
- integration list/read/save/delete/test;
- automation-execution activity read.

User-triggered API-key and integration actions now use the authenticated
Supabase client rather than service role. The retained service-role calls are
limited to existing onboarding recovery, authenticated inbound API-key lead
ingestion, HMAC-protected internal automation work, automation execution
workers, and server-only credential consumers.

The pipeline action additionally verifies that a stage belongs to the selected
organization pipeline. Migration `00018` enforces the same relation for direct
lead INSERT/UPDATE calls, closing the UUID-tampering path at both boundaries.

## RLS and Membership-Status Results

- Active memberships retain only their role-appropriate access.
- Suspended and removed memberships fail `is_org_member`, all new active-role
  checks, and server authorization. The dashboard layout does not provision a
  replacement organization for a user who has only inactive memberships; it
  redirects that account away from the dashboard.
- A membership user can still read their own historical membership row, but
  cannot read organization data or other organization membership details.
- Viewer RLS is read-only for leads/pipelines and is denied all operational or
  administrative mutation policies.
- Admin/API-key/integration access is restricted to active owners/admins;
  manager/agent/viewer direct calls are denied by both the server helper and
  RLS.
- Organization settings remain owner-only, preserving the previous
  organization-update security boundary.

## Onboarding and Multi-Organization Readiness

Normal signup remains unchanged:

```text
user -> profile -> new organization -> active owner membership -> workspace
```

The onboarding RPC continues to insert `role = 'owner'`; the new membership
defaults make it active and set `joined_at` automatically.

The unique pair `(profile_id, organization_id)` remains unchanged. No
user-only uniqueness constraint was introduced, so multi-organization
membership is supported by the data model. The current resolver intentionally
keeps the prior first-active-membership behavior because no organization
switcher exists yet. Phase 14.4D.3 must introduce explicit organization
selection and remove that temporary current-organization assumption.

## Security Audit

### Static audit conclusions

- **Cross-tenant data access:** denied by active-membership RLS predicates,
  organization-scoped server authorization, lead ownership checks, and
  lead-reference tenant validation.
- **Suspended/removed member:** denied organization reads and mutations because
  both legacy and new helpers require `status = 'active'`.
- **Viewer:** can read permitted tenant data but cannot mutate leads, stages,
  AI qualification, automations, integrations, API keys, or organization
  settings.
- **Agent:** can perform normal lead/pipeline work and qualification but cannot
  access automation configuration, integrations, API keys, or team management.
- **Manager:** can run operational automation and CRM work but cannot manage
  integration/API-key/security settings.
- **Admin:** can manage product administration but cannot grant admin/owner,
  target an owner, or transfer ownership through the centralized transition
  model.
- **Owner:** retains organization administration; direct owner lifecycle/role
  mutation is intentionally blocked pending the atomic ownership-transfer
  design.
- **Client tampering:** every changed server action derives organization and
  membership from the session; RLS additionally checks the final row values.
- **SQL hardening:** all new `SECURITY DEFINER` helpers use an empty
  `search_path`; `PUBLIC` and `anon` execution is revoked; updated policies
  include `WITH CHECK` on update paths; no membership-RLS recursive lookup is
  used by the helper functions.

### Executed checks

- `npm run lint` - pass
- `npx tsc --noEmit` - pass
- `npm run build` - pass (all 25 routes)
- `npm audit` - pass (`found 0 vulnerabilities`)
- `git diff --check` - pass
- A Node TypeScript runtime check exercised 17 role-permission and
  role-transition assertions, including the viewer read-only and admin
  escalation cases - pass.
- Linked migration list - pass; only `00018` is pending.

The repository has no installed test runner or Supabase integration-test
harness. The formal Codex Security diff-scan workflow could not run because
this environment has no usable Python interpreter for its mandatory preflight.
The static audit above was performed manually against the migration, current
RLS policies, server actions, and service-role call sites.

## Required Post-Deployment SQL/Live Test Matrix

Before considering Phase 14.4D.1 fully live, create test accounts in two
organizations and verify with authenticated user sessions:

| Principal | Expected result |
| --- | --- |
| `ownerA` in Org A | Org A read/write yes; Org B no. |
| `adminA` in Org A | Product administration yes; grant/admin/owner escalation no. |
| `managerA` in Org A | Lead/pipeline/automation operations yes; integrations/API keys no. |
| `agentA` in Org A | Normal lead + stage operations and AI qualification yes; admin configuration no. |
| `viewerA` in Org A | Allowed reads yes; every operational/admin write no. |
| `suspendedA` / `removedA` in Org A | No organization read, dashboard data, or mutation access. |
| `ownerB` in Org B | Org B access yes; Org A data/actions no. |

Also attempt direct Data API and server-action calls with a substituted
organization UUID, role, permission, pipeline UUID, and stage UUID. All must
fail unless the authenticated membership and final tenant references match.

## Known Limitations and Phase 14.4D.2 Prerequisites

- No invitation data model, token, email, acceptance flow, resend/revoke flow,
  or invitation UI exists yet.
- No team-management UI, membership listing, member lifecycle action, role
  mutation action, organization switcher, seat limit, or audit log exists yet.
- Ownership transfer is intentionally blocked at the database trigger level.
  Phase 14.4D.4 needs a separate atomic, confirmed workflow that protects the
  final owner and records an audit event.
- Invitation design still requires explicit decisions for existing versus new
  users, email delivery/SMTP or Resend, token hashing/expiration/single use,
  cross-organization acceptance, and suspended-member reactivation semantics.
- Apply `00018` and complete the live matrix before adding invitation paths.

## Explicit Do Not Rules

- Do not modify migrations `00001` through `00017`.
- Do not deploy `00018` without explicit authorization.
- Do not bypass active-membership RLS or use UI visibility as authorization.
- Do not reintroduce service-role database access in user-triggered settings
  actions.
- Do not implement invitations, Team Management UI, organization switching,
  ownership transfer, Phase 14.4D.2, or Phase 14.5 in this checkpoint.
- Do not push without explicit authorization.
