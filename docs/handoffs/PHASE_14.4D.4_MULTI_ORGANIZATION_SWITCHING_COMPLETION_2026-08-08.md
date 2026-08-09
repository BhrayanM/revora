# AI Growth — Phase 14.4D.4 Multi-Organization Switching Completion

**Date:** 2026-08-08
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Branch:** `master`
**Linked Supabase project:** `fnkzqrnsfnqxbodxdjgq`

## Status

**Phase 14.4D.4 — Multi-Organization Switching + Active Organization Context is complete.**

No database change was required. Local and remote Supabase migration histories
remain synchronized through `00023`; migrations `00001` through `00023` are
deployed and immutable. No Git changes were pushed.

This phase deliberately does not implement ownership transfer or Phase 14.5.

## Audit Before the Change

The former single-organization behavior was centralized in
`src/lib/auth/index.ts`: `getActiveMembership()` filtered active memberships,
ordered them by `created_at`, and selected the first result. These callers all
depended on that default behavior:

- dashboard, analytics, leads, pipeline, settings, profile, and workspace
  resolution;
- dashboard Server Actions for leads, pipeline movement, settings,
  integrations, API keys, automation, Team Management, invitations, and AI
  lead qualification;
- the Team Management page and existing invitation management actions.

`src/app/(dashboard)/layout.tsx` independently listed memberships only to
choose onboarding/no-access behavior. `src/app/auth/callback/route.ts` still
uses `limit(1)` only to decide whether normal first-user provisioning is
needed; it does not resolve an active organization. The internal HMAC-protected
lead qualification and source-ingestion APIs continue to receive an explicit
trusted organization from their non-user integration boundary and are not
dashboard active-context flows.

A direct `/leads/[id]` route was the one material multi-org display gap: RLS
could legitimately return a lead from either of a user's memberships. It is
now explicitly compared with the selected organization before it is rendered.

The audit also found a route-level RBAC mismatch: the analytics page did not
enforce the existing `analytics.read` permission even though agents are not
granted it by the centralized matrix. This did not cross a tenant boundary
(agents already have permitted lead reads), but it violated the declared page
authorization model. The page now uses
`requireCurrentOrganizationPermission("analytics.read")` and safely redirects
an unauthorized user to the dashboard.

## Active Organization Architecture

`src/lib/auth/index.ts` now exposes the server-only
`getActiveOrganizationContext()` helper. It returns the active organization,
active membership, role, and whether the selection came from a valid cookie or
a safe fallback.

```text
authenticated user with current legal consent
  → read HttpOnly selection hint
  → fetch that user's active memberships only
  → accept the hint only when it matches an active membership
  → resolve the organization through the caller's RLS session
  → otherwise choose the first remaining active membership deterministically
  → no valid membership/organization: return no context
```

The selection cookie is named `ai_growth_active_organization` and has these
properties:

- `HttpOnly`, `SameSite=Lax`, `path=/`, and `Secure` in production;
- a 30-day preference lifetime;
- written only by a Server Action/server-side invitation acceptance path;
- stores only an organization UUID, never a credential or authorization fact;
- is validated again against the authenticated user's **active** membership on
  every context resolution.

It is intentionally a selection hint, not an authorization mechanism. A
malformed, foreign, suspended, removed, deleted, or stale UUID is ignored. If
another active membership exists, the resolver uses it; otherwise dashboard
access exits safely. A stale cookie may remain as an inert preference until a
later valid switch overwrites it, but it can never restore tenant access.

`getCurrentOrganization()`, default `getActiveMembership()`,
`requireCurrentOrganizationPermission()`, and `getCurrentWorkspace()` now use
this centralized context. Existing organization-scoped pages and Server
Actions therefore inherit the selected tenant without client-supplied role or
organization parameters. Explicit `requireOrganizationPermission(id, ...)`
remains an active-membership validation helper for deliberately explicit
server-side cases; no dashboard action accepts an arbitrary organization ID.

## Switcher Experience

The dashboard layout resolves the context on the server and passes a minimal,
safe organization list (ID, name, trusted membership role) to the sidebar.
`OrganizationSwitcher`:

- displays the active organization and current membership role;
- is compact and non-interactive for users with one active membership;
- exposes an accessible keyboard-operable listbox for multiple organizations;
- uses visible focus states, selected state, pending state, Escape/outside
  dismissal, and theme-aware sidebar tokens;
- invokes `selectActiveOrganizationAction()` rather than trusting browser
  state;
- validates UUID shape plus current legal-consented active membership before
  writing the HttpOnly cookie;
- returns to `/dashboard` after a successful switch so an organization-specific
  detail URL cannot render stale tenant data during the transition.

The switcher works with the existing System, Light, and Dark theme tokens; no
new theme state was added.

## Invitation and Onboarding Interaction

After the existing atomic `accept_organization_invitation` RPC reports
`accepted`, `membership_exists`, or `reactivated`, the server action now runs
the same active-membership check and selects the invited organization before
clearing invitation context. This makes the accepted organization the active
tenant, including for an existing user who keeps another membership.

The invitation RPC, hashed token model, email matching, legal consent, MFA,
and Turnstile behavior are unchanged.

Normal onboarding remains:

```text
new user without a valid invitation
  → profile → new organization → active owner membership → workspace
```

A valid invitation still takes precedence over normal recovery provisioning,
so an invited user does not create a second organization. Cookie tampering
cannot suppress onboarding because invitation context remains database
revalidated.

## Files Changed

- `src/lib/auth/index.ts`
- `src/lib/organizations/types.ts`
- `src/app/(dashboard)/organization-actions.ts`
- `src/components/dashboard/organization-switcher.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/sidebar.tsx`
- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/analytics/page.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/app/invite/accept/actions.ts`
- `src/app/invite/accept/accept-invitation-form.tsx`

## Database and Security Boundaries

No migration was created or applied. Existing RLS and the Phase 14.4D.1–D.3
database security model remain unchanged:

- active membership is still the RLS tenant boundary;
- suspended and removed memberships do not pass `is_org_member`;
- owner protection, Team RPC role transition controls, invitation token
  security, and direct invitation/audit-table restrictions are unchanged;
- no service-role credential is exposed or used by the switcher;
- the selection action derives user identity, legal-consent state, role, and
  membership solely from the server-side Supabase session and database.

The linked database review reconfirmed RLS on organizations, memberships,
workspaces, pipelines, pipeline stages, leads, invitations, and Team audit
records. `organization_invitations` and `team_audit_events` retain zero direct
client policies. The active-membership helpers remain `SECURITY DEFINER` with
`search_path = ''`, no `PUBLIC` or `anon` execution, and authenticated-only
execution where RLS policies require them.

## Live Tenant-Isolation Audit

The audit used a disposable transaction with `SET LOCAL ROLE authenticated`
and `request.jwt.claim.sub`; password sign-in was not automated, so Turnstile
remained enabled and fail-closed. The transaction contained:

```text
User X: Org A owner, Org B manager, suspended Org S, removed Org R
User Y: Org B viewer
User Z: no membership
Foreign Org F: no membership for any test user
```

Assertions passed:

| Scenario | Result |
| --- | --- |
| User X active Org A / Org B membership lookup | Allowed for both, as required for multi-org membership |
| User X suspended / removed / foreign membership lookup | Denied |
| User X own-org lead read and write | Allowed |
| User X foreign lead read, update, and insert | Denied/hidden |
| User Y viewer own-org read | Allowed |
| User Y viewer lead update and insert | Denied |
| User Y access to Org A | Hidden |
| User Z with no membership reads or writes tenant data | Denied |
| `is_org_member` active/foreign/suspended/removed semantics | Correct; no recursion error |

RLS correctly permits User X to access both organizations because that user
has active memberships in both. The new server-validated application context
is what narrows every dashboard page/action to the explicitly selected one;
the direct lead-detail route now performs that comparison before rendering.

The audit transaction was rolled back. A post-audit query confirmed **zero**
residual fixture organizations, memberships, leads, and temporary auth users.

## Validation

- `npx supabase migration list --linked` — local and remote match through
  `00023`
- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run build` — pass (28 routes)
- `npm audit` — pass (`0 vulnerabilities`)
- `git diff --check` — pass before checkpoint
- live authenticated SQL/RLS audit — pass

## Manual Browser E2E Remaining

No browser connection was available in this environment, so these need manual
verification with genuine authenticated sessions. Do not bypass Turnstile,
MFA, or legal consent to perform them.

1. A user with Org A/Org B selects A → B and B → A from the sidebar in System,
   Light, and Dark themes; all dashboard, analytics, leads, pipeline,
   automation, Team, settings, integrations, and API-key data refresh to the
   selected tenant.
2. Switch from a lead-detail URL and verify navigation returns to the safe
   dashboard without stale lead data.
3. Attempt a foreign UUID through the switch action and verify the generic
   rejection state without a cookie change.
4. Suspend/remove the selected membership in another session, refresh, and
   verify fallback to another active organization or safe exit when none
   remains.
5. Accept an invitation to Org B while signed in as an Org A member; verify
   both memberships persist, Org B becomes active, and appears in the
   switcher.
6. Recheck normal signup, invited signup, Google/Microsoft PKCE, email OTP,
   MFA/AAL2, current legal-consent routing, and Turnstile positive/negative
   behavior.
7. Verify switcher keyboard navigation, focus visibility, narrow/mobile
   sidebar behavior, and one-organization presentation.

## Known Limitations

- The selected organization is an application context. RLS intentionally
  permits all of a user's active memberships; it remains the final protection
  against organizations the user does not belong to.
- Stale cookie hints are ignored rather than mutated from a Server Component;
  a later successful selection overwrites them.
- There is still one implicit workspace choice per selected organization
  (`getCurrentWorkspace()` returns the first workspace). Workspace switching
  is outside this phase.
- Transactional invitation email remains a production configuration blocker;
  development copy links remain subject to the existing safe delivery layer.
- Ownership transfer is deliberately not implemented.

## Next Recommended Step

**Phase 14.4D.5 — Ownership Transfer** may be planned as the next dedicated
security phase. It must use a new migration if database changes are needed,
preserve the owner-protection invariant, and not begin without explicit
approval. Do not start Phase 14.5 until remaining Phase 14.4D work is complete
and production blockers are addressed.

## Do Not Rules

- Do not modify migrations `00001` through `00023`.
- Do not weaken RLS, tenant isolation, MFA/AAL2, legal consent, PKCE OAuth,
  Turnstile, invitation security, or owner protection.
- Do not expose service-role credentials or use service role for normal user
  selection/actions.
- Do not implement ownership transfer in this completed phase.
- Do not start Phase 14.5 before the remaining Phase 14.4D work is completed.
- Do not push without explicit authorization.
