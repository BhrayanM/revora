# AI Growth - Current State Before Phase 14.4D.5

**Date:** 2026-08-08  
**Repository:** `C:\Users\bhray\ai-growth-platform`  
**Branch:** `master`  
**Current HEAD:** `7c82865 feat(orgs): add secure organization switching`  
**Linked Supabase project:** `fnkzqrnsfnqxbodxdjgq`

## Repository and Migration State

- Git working tree was clean when this checkpoint was created.
- Local and remote Supabase migration histories match exactly through
  `00023`.
- Migrations `00001` through `00023` are deployed and immutable.
- No migration is pending. Any future schema work must start at `00024`.
- This checkpoint is documentation only; it does not implement ownership
  transfer, create a migration, or change application code.

## Completed Phases

### Phase 14.4B - Security, Authentication, and Versioned Legal Consent

Completed versioned Terms and Privacy documents and immutable user-consent
history. Current legal consent is enforced before protected application access
and privileged team operations. The platform uses Supabase Auth with email
password/OTP, PKCE Google and Microsoft OAuth, Turnstile fail-closed gating,
password recovery, secure email change, MFA TOTP/AAL2 enforcement, and the
existing onboarding RPC/recovery flow. Normal signup creates a profile, a new
organization, an active owner membership, and a workspace.

Security decisions to preserve:

- Do not bypass versioned legal-consent checks, Turnstile, PKCE, or AAL2.
- Do not expose service-role credentials; normal user operations run through
  the authenticated Supabase session, RLS, and narrow server/RPC boundaries.
- Do not modify migrations `00001` through `00017`.

### Phase 14.4C - Auth Visual Polish and Theme System

Completed the shared premium AuthShell visual system and System/Light/Dark
theme architecture. Theme selection defaults to System, follows OS preference
dynamically, persists explicit choices, and uses semantic design tokens. The
theme implementation avoids invalid root-layout script placement and theme
hydration/flash regressions.

Security decisions to preserve:

- Visual work must not alter authentication, MFA, Turnstile, legal-consent,
  onboarding, RLS, or database behavior.
- Preserve accessible controls, focus states, reduced-motion behavior, and
  semantic token usage.

### Phase 14.4D.1 - RBAC Foundation

Completed organization-scoped membership roles:

- `owner`
- `admin`
- `manager`
- `agent`
- `viewer`

Membership lifecycle statuses are `active`, `suspended`, and `removed`. Roles
belong to memberships, not global profiles, allowing different roles in
different organizations. Centralized server-side permissions and database RLS
helpers enforce active-membership tenant access. Suspended and removed
memberships no longer satisfy `is_org_member`.

Security decisions to preserve:

- Never use client-provided organization IDs, roles, or permissions as an
  authorization fact.
- RLS remains the final tenant-isolation boundary.
- Generic member role/status operations must not create, downgrade, suspend,
  or remove an owner.
- Owner-protection logic permits membership cascade deletion only when the
  parent organization itself is legitimately deleted.

### Phase 14.4D.2 - Secure Organization Invitations

Completed invitations with server-generated high-entropy tokens, SHA-256
token hashes only in the database, expiration, single use, revocation, and
resend token rotation. Invitations cannot assign the owner role. Acceptance
is a narrow atomic database operation that validates the authenticated,
email-matching user and safely creates, reuses, or reactivates a membership;
it never reactivates a suspended membership. Invitation-aware onboarding
prevents an invited new user from creating an unnecessary organization.

Security decisions to preserve:

- Raw invitation tokens are never persisted, logged, or broadly exposed.
- Do not reopen generic authenticated membership mutation.
- Invitation role restrictions, cross-tenant checks, legal consent, MFA, and
  Turnstile protections remain in force.
- Production invitation delivery requires configured transactional email; the
  development-safe copy-link path is not production delivery.

### Phase 14.4D.3 - Team Management

Completed Settings > Team member administration, pending-invitation management,
safe role/status operations, confirmation UX, and the Team audit-event
foundation. The UI consumes existing server/RPC authorization; UI visibility
is not an authorization boundary.

Security decisions to preserve:

- Owner and admin management capabilities are constrained by the centralized
  permission model and server/database role-transition checks.
- Team audit records are derived from trusted database/server state and are
  not client-authored text.
- Invitation rows and audit records remain protected from broad direct client
  enumeration.

### Phase 14.4D.4 - Multi-Organization Switching

Completed secure selected-organization context and dashboard switcher. The
server-only `getActiveOrganizationContext()` validates the authenticated user,
current legal consent, active membership, and selected organization on every
resolution. The `ai_growth_active_organization` HttpOnly cookie is only a
selection hint: it is `SameSite=Lax`, path-scoped to `/`, secure in production,
and cannot authorize a foreign, suspended, removed, stale, or deleted
organization. Invalid selections fall back to another active membership or a
safe no-access state.

Invitation acceptance selects the newly joined organization after a successful
acceptance, while preserving multi-organization memberships. Dashboard reads
and actions use centralized active context; direct detail routes additionally
verify the selected organization to avoid cross-context displays.

Security decisions to preserve:

- Keep the active-organization cookie server-written and revalidate it on
  every request.
- Do not globally revert to "first membership" tenant resolution.
- Preserve RLS and active-membership checks for every organization-scoped
  operation.

## Next Phase: Phase 14.4D.5 - Secure Organization Ownership Transfer

**Status: Not started.**

The intended flow is owner-only and scoped to the current active organization:

```text
current active owner -> eligible active same-organization member
target role          -> owner
previous owner role  -> admin
```

It must be atomic and database-authorized. It must never transiently or
persistently create zero owners, two owners, or a cross-organization owner
escalation. It also needs a trusted Team audit event, serious confirmation UX,
and immediate active-context/UI revalidation after transfer.

## Blocking Data-Integrity Finding

The pre-implementation ownership audit found:

- **Two existing organizations have zero active owner memberships.**
- **No organization has more than one active owner membership.**

Ownership transfer requires exactly one active owner per organization. The
application must not automatically select or assign an owner for the two
ownerless organizations because that would be an unauthorized ownership and
access-control decision.

This finding must be resolved or explicitly scoped before Phase 14.4D.5 can
be represented as a globally complete exactly-one-owner implementation.

## Required Decision Before Implementation

Choose one of these paths explicitly:

### Option A - Manually Designate Owners

For each of the two ownerless organizations, designate an authorized existing
active member as its owner through an approved, auditable remediation. Then
implement the ownership-transfer flow with a database invariant that enforces
exactly one active owner per organization.

### Option B - Prospective Ownership Transfer

Implement the ownership-transfer system prospectively:

- enforce at-most-one active owner for present and future data;
- ensure every transfer from a valid current owner atomically ends with
  exactly one active owner;
- prevent new invalid states through narrow RPC/trigger/invariant controls;
- document the two pre-existing ownerless organizations as a manual data
  remediation requirement.

This option does not silently repair or assign ownership for historical data.

## Architecture Rules for the Next Session

- **Read this handoff before doing any work.**
- Inspect the two ownerless organizations and confirm the selected decision if
  it remains unresolved. Do not expose organization/user details unnecessarily.
- Do not modify migrations `00001` through `00023`; new database work starts
  at `00024`.
- Preserve RLS, active-membership tenant isolation, and the established
  `SECURITY DEFINER` conventions: minimal scope, `search_path = ''`, and
  explicit grants/revokes with no unintended `PUBLIC` or `anon` execution.
- Preserve MFA/AAL2 and current legal-consent checks for privileged actions.
- Never use client-only authorization or trust a client-supplied target user,
  organization, role, or permission.
- Do not expose service-role credentials or use them to bypass normal user
  authorization.
- Preserve PKCE OAuth, Turnstile fail-closed behavior, invitation security,
  onboarding behavior, RBAC, and active-organization selection validation.
- Do not push Git changes without explicit authorization.
- Do not start Phase 14.5 during ownership-transfer work.

## Recommended Continuation Sequence

1. Read this handoff and re-check repository, migration, and live owner-count
   state.
2. Ask for the ownership-remediation decision if neither option above has been
   authorized.
3. Audit the existing owner-protection trigger, membership RPCs, Team audit
   architecture, MFA/legal-consent guard functions, and active-organization
   context.
4. Only after the decision, design the narrowest `00024+` migration and atomic
   ownership-transfer RPC.
5. Add owner-only Team UI with deliberate two-step confirmation, run live
   authenticated SQL/RLS tests, clean fixtures, document, commit locally, and
   do not push.

