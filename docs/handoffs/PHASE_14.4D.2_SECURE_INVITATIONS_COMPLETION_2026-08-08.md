# AI Growth — Phase 14.4D.2 Secure Organization Invitations

**Date:** 2026-08-08
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Branch:** `master`
**Linked Supabase project:** `fnkzqrnsfnqxbodxdjgq`

## Status

**Phase 14.4D.2 — Secure Organization Invitations is complete.**

The remote and local migration histories are synchronized through `00021`.
Migrations `00001` through `00021` are now applied and immutable. No Git
changes were pushed.

This phase implements invitation persistence, secure lifecycle RPCs, token
rotation/revocation/expiration, secure acceptance, invite-aware auth and
onboarding protection, and the minimal acceptance UI. It deliberately does
not implement the Team Management table/modal, member actions, organization
switcher, or ownership transfer UI.

## Migrations

### `00020_secure_organization_invitations.sql`

Adds `public.organization_invitations` with:

- organization-scoped invitee email normalization (`lower(trim(email))`);
- allowed target roles only: `admin`, `manager`, `agent`, `viewer`;
- a unique SHA-256 `token_hash` — raw secrets are never stored;
- invitation creator, timestamps, expiry, acceptance, revocation, and resend
  lifecycle fields;
- an open-invitation unique partial index on `(organization_id,
  email_normalized)` where an invitation is neither accepted nor revoked;
- indexes for organization lifecycle queries and expiry operations;
- RLS enabled with **no direct client table policies**, so invitee email lists
  and hashes cannot be enumerated through PostgREST.

It provides authenticated, `SECURITY DEFINER`, fixed-`search_path` RPCs:

- `create_organization_invitation(...)`
- `rotate_organization_invitation(...)`
- `revoke_organization_invitation(...)`
- `accept_organization_invitation(...)`

All lifecycle RPCs revoke `PUBLIC` and `anon` execution. Only the public
entry-point RPCs grant `authenticated` execution; internal role/MFA helpers
remain non-executable by `authenticated` users.

Acceptance is atomic inside one database function: it validates the
authenticated and verified email, current legal consent, current AAL2 when an
MFA factor is verified, token status/expiry, organization existence, target
role, and existing membership state before creating/reactivating membership
and consuming the invitation in the same transaction.

### `00021_invitation_role_guard_null_fix.sql`

During the live RLS matrix, an actual cross-tenant create attempt revealed a
SQL three-valued-logic defect. The initial helper returned `NULL` when an
actor had no membership; `IF NOT NULL` did not enter the denial branch.

`00021` makes `can_manage_organization_invitation_role(...)` strictly boolean
by coalescing every missing/unknown role result to `false`. The migration is a
narrow function replacement only. It was deployed immediately, and the full
authenticated matrix was rerun successfully after deployment.

## Invitation Lifecycle and Authorization

- Tokens are generated server-side with `crypto.randomBytes(32)` and encoded
  as base64url (256 bits of entropy).
- Only `SHA-256(rawToken)` is persisted or sent to the acceptance RPC.
- Tokens expire after seven days. RPC inputs reject invalid expiration windows.
- Resend atomically replaces the stored hash and expiry, invalidating the old
  token immediately.
- Revoke is idempotent. Accepted invitations remain accepted and cannot be
  made unaccepted.
- A second create for the same organization/email rotates the one structurally
  open invitation instead of creating unbounded pending rows. Expiration is
  evaluated in lifecycle logic rather than an invalid non-immutable index
  predicate.

Role rules are enforced in both application code and the database:

| Actor | Can invite/manage target roles |
| --- | --- |
| Owner | admin, manager, agent, viewer |
| Admin | manager, agent, viewer |
| Manager / Agent / Viewer | none |

No actor can invite `owner`. An admin cannot create, rotate, or revoke an
admin-level invitation created by an owner. Direct membership insertion was
not reopened.

## Acceptance and Membership Semantics

- Correct-email, valid invitation: creates one active membership and consumes
  the token.
- Existing active membership: consumes the matching invitation idempotently;
  it never changes the existing role or creates a duplicate row.
- Removed membership: is reactivated as `active` with the invited role and
  cleared removal/suspension timestamps.
- Suspended membership: remains suspended; the invitation is not consumed and
  cannot bypass the administrative suspension decision.
- Wrong authenticated email, expired/revoked/consumed token, deleted
  organization, missing profile, unverified email, stale legal consent, and
  insufficient MFA all fail safely with non-sensitive terminal/status states.
- The model supports multiple memberships: the live matrix verified one user
  retaining `owner` in Org A and accepting `manager` in Org B without a
  duplicate profile or auth user.

## Auth, Onboarding, and UI Integration

`/invite?token=...` is the only initial token-capture endpoint. It validates
token shape and current database state on the server, places only a valid raw
token in a two-hour, `HttpOnly`, `SameSite=Lax`, production-`Secure` cookie,
then immediately redirects to the clean `/invite/accept` URL. Client
JavaScript never receives the cookie value.

The `/invite/accept` flow uses the existing themed auth components and has
valid, logged-out, expired, revoked, already-used, unavailable, wrong-account,
suspended-membership, email-verification, legal, and MFA states.

Invite context is revalidated against the database on each security-sensitive
request and is preserved through login, signup, OAuth callback, email OTP,
legal consent, and MFA. It cannot be forged merely by setting a cookie value.

The auth callback and dashboard recovery provisioning now check only a
**valid, database-revalidated** invitation before invoking `onboard_user`.

```text
Normal new user
  profile → onboard_user → new organization → active owner membership → workspace

Invited new user
  profile → legal/MFA/auth checks → accept existing organization invitation
  → active invited membership
  → no new organization
```

An existing user who joins a second organization receives an interim success
state and can return to the current dashboard. Explicit organization selection
and switching remain Phase 14.4D.3 work.

`src/app/invite/management-actions.ts` is a server-action boundary prepared
for the future Team Management UI. It uses
`requireCurrentOrganizationPermission("team.invite")`, validates the requested role, and then calls the DB RPCs,
which independently re-authorize the actor and tenant. UI visibility is not an
authorization boundary.

## Delivery Abstraction

`src/lib/invitations/delivery.ts` separates delivery from persistence.

- Development only: an authorized creation/resend call may return a copyable
  invite URL.
- Production: without configured transactional email, the operation fails
  closed before the invite is persisted or rotated. It does not claim an email
  was sent.

A verified sending domain and transactional email adapter (SMTP/Resend or
equivalent) remain required before production invitation delivery.

## Live Security Audit

Temporary fixtures used the `inv-audit-20260808-*` marker only. Password
automation was not used; Turnstile remained enabled and fail-closed. The SQL
matrix used the real database boundary:

```sql
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<temporary-user-uuid>', true);
```

The operation itself then ran as `authenticated`, with `auth.uid()` resolving
to the temporary user. Fixture creation/cleanup alone used the administrative
database path.

Passed live assertions:

- owner may create every permitted role but never owner;
- admin may create manager/agent/viewer but cannot create/manage admin or
  owner invitations;
- manager, agent, viewer, suspended, and removed users cannot invite;
- Org A actor cannot create, resend, or revoke Org B invitations;
- direct invitation-table enumeration is denied;
- one open invitation per organization/email is retained;
- valid acceptance, replay prevention, wrong-email denial, expiry, revocation,
  removed-member reactivation, suspended-member denial, active-member
  idempotency, token rotation, and deleted-organization invalidation all pass;
- the direct RPC itself rejects missing current legal consent;
- a temporary verified MFA factor requires AAL2 for direct acceptance; a
  simulated AAL2 JWT then succeeds;
- normal `onboard_user` still creates an active owner membership and workspace
  for a normal user with no invitation;
- the existing owner-cascade behavior remains usable when a disposable
  organization is deleted.

The live function review confirmed `SECURITY DEFINER` with `search_path = ''`
on the public RPCs, no `PUBLIC`/`anon` execution, and no direct invitation RLS
policies. Internal helpers have no authenticated execution grant.

## Fixture Cleanup

Created and removed:

- 16 temporary `auth.users`/profiles;
- Org A and Org B fixtures;
- their memberships and expired invitation fixture;
- a transactional temporary MFA factor;
- all transaction-scoped invites, onboarding records, and deleted-org records.

Final zero-residual query confirmed no prefixed organizations, invitations,
memberships, leads, auth users, or MFA factors remained.

## Validation

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run build` — pass (27 routes, including `/invite` and `/invite/accept`)
- `npm audit` — pass (`0 vulnerabilities`)
- `git diff --check` — pass
- live Supabase SQL/RLS matrix — pass after `00021`
- migration list — local and remote synchronized through `00021`

## Remaining Manual Browser E2E

Browser automation was unavailable in this environment, so these need manual
confirmation in a configured browser:

1. Invite link capture removes the token from the address bar and retains the
   clean acceptance context through password login, Google OAuth, Microsoft
   OAuth, email verification, legal consent, and MFA.
2. Normal email signup with Turnstile creates a new owner organization; invited
   email signup with the same Turnstile behavior creates no extra organization.
3. The themed acceptance states render correctly in System, Light, and Dark
   modes at desktop and mobile widths.
4. Development copy-link visibility is limited to authorized users, and a
   production deployment without a delivery adapter fails closed with the
   expected configuration message.

## Next Phase Prerequisites

**Phase 14.4D.3 — Team Management UI + Organization Switcher** may now consume
the invitation server actions and lifecycle RPCs. It must not bypass those
boundaries or expose invitation records directly. It still needs to decide and
implement the user-facing member list, pending invitation list, invite modal,
resend/revoke controls, current-organization selection, and multi-org switcher
experience.

## Do Not Rules

- Do not modify migrations `00001` through `00021`.
- Do not weaken RLS, tenant isolation, legal-consent enforcement, MFA/AAL2,
  PKCE OAuth, or Turnstile fail-closed behavior.
- Do not expose service-role credentials or use service role for ordinary
  invitation lifecycle actions.
- Do not create a generic membership insert/update/delete API.
- Do not start Phase 14.5 before the remaining Phase 14.4D work is completed.
- Do not push without explicit authorization.
