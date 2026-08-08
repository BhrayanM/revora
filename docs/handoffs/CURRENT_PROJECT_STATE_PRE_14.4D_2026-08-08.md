# AI Growth - Current Project State Before Phase 14.4D

**Date:** 2026-08-08
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Branch:** `master`
**Current HEAD:** this documentation checkpoint; resolve with `git log -1 --oneline`
**Latest implementation checkpoint:** `838f2f3 fix(legal): align document effective metadata`
**Documentation status:** This is the authoritative current-state handoff.
Historical handoffs remain historical snapshots.
**Remote status:** local commits only - do not push

## 1. Architecture Overview

AI Growth is a Next.js 16.3 App Router application using React 19, TypeScript
strict mode, Tailwind CSS v4, and custom CVA-based UI primitives. Supabase
provides PostgreSQL, Auth, SSR session support, and Row Level Security. The
application has a public marketing/legal surface and a protected,
organization-scoped dashboard.

There is no Prisma, NextAuth, or Framer Motion in the active application stack.
Docker files remain optional local/container tooling, not a required runtime
for the normal Next.js plus Supabase workflow.

## 2. Current Route and Module Map

### Public and auth routes

- `/`, `/terms`, `/privacy`
- `/login`, `/signup`, `/verify-email`, `/forgot-password`,
  `/reset-password`, `/forgot-email`
- `/auth/mfa`, `/auth/email-change`, `/auth/callback`, `/legal/consent`

### Protected dashboard routes

- `/dashboard`, `/analytics`, `/leads`, `/leads/[id]`, `/pipeline`
- `/automation`, `/settings`, `/profile`, `/notifications`

### API routes

- `/api/leads` - source API-key-authenticated lead-intake path.
- `/api/internal/leads/[id]/qualify` - internal qualification endpoint.

### Key modules

- `src/lib/auth/` resolves the authenticated user, organization, workspace,
  and profile.
- `src/lib/supabase/` contains browser, SSR server, and narrowly scoped
  service-admin clients plus generated database types.
- `src/lib/legal/` loads current legal versions and validates consent.
- `src/lib/ai/`, `src/lib/crm/`, `src/lib/automation/`, and
  `src/lib/webhooks/` contain AI qualification, provider adapters, execution
  support, and event delivery.

## 3. Supabase and Tenant Architecture

- `auth.users` maps 1:1 to `public.profiles` through the existing user trigger.
- `memberships` connects profiles to `organizations`; `workspaces` belong to
  organizations.
- CRM data, automations, integrations, and related queries are
  organization-scoped.
- Supabase RLS is the tenant boundary. Server actions and route handlers derive
  organization context from the authenticated user; UI state is never treated
  as authorization.
- Existing membership roles are `owner`, `admin`, `manager`, and `agent`.
  `viewer` does not exist yet and must be introduced only by a future migration.

## 4. Authentication, OAuth, MFA, and Turnstile

- Supabase SSR auth uses PKCE OAuth and cookie-backed server clients.
- Email/password login and signup, email OTP verification UI, password
  recovery/reset, secure email change, session controls, and Account Security
  Center are implemented.
- Google and Microsoft OAuth are implemented and previously manually tested.
  Apple remains intentionally disabled pending Apple Developer Program setup.
- Login, signup, and password recovery use Cloudflare Turnstile. Missing
  production configuration fails closed rather than allowing submission.
- Supabase TOTP MFA is implemented. The dashboard layout requires AAL2 for a
  user with a verified factor, and MFA unenrollment also requires AAL2.
- The `onboard_user` RPC is service-role-only. The callback and dashboard
  layout use the empty-cookie service-admin client only for onboarding recovery;
  do not broaden service-role use.

## 5. Legal Consent Architecture

- Migration 00017 added `legal_document_versions` and `user_legal_consents`.
  Legal document versions and consent history are append-only under the
  existing trigger/RLS design.
- Terms and Privacy are public current-effective document views. The page
  header reads the database-backed `version` and `effective_at`; dates render
  in UTC to match the stored legal effective date.
- Terms/Privacy consent is required for email signup and OAuth entry, current
  consent is checked before onboarding and dashboard/protected access, and
  stale users are redirected to `/legal/consent`.
- Marketing consent is optional. Consent writes are user-scoped and performed
  with the authenticated Supabase client, not a service-role bypass.

## 6. Theme and Presentation State

- Phase 14.4C Auth Visual Polish is complete.
- Phase 14.4C.1 provides System-default Light/Dark theming with local
  persistence, OS-preference tracking, semantic tokens, Settings Appearance,
  and TopNav quick control.
- Phase 14.4C.1A corrected theme-init placement, workflow layering,
  legal-consent button UX, CTA/branding consistency, responsive auth spacing,
  Turnstile presentation, and dark secondary-text contrast.
- System, Light, and Dark modes were manually checked. The legal required
  checkbox UX and new-user dashboard tenant isolation were also manually
  confirmed.

## 7. CRM, Lead, Dashboard, and Integration Status

- Dashboard, analytics, leads, lead detail, pipeline, automation, settings,
  profile, and a notifications placeholder are implemented.
- OpenAI lead qualification, authenticated lead intake, n8n event delivery,
  automation execution/retry support, HubSpot/GoHighLevel adapters, and Slack
  notification architecture exist in source.
- External providers are not universally production-live merely because an
  adapter or settings panel exists. Live credentials and end-to-end validation
  remain environment-specific.
- The outbound n8n emitter signs serialized event bodies when configured. The
  separately planned inbound webhook body-signing and replay-protection work
  remains deferred.

## 8. Migration History and Remote Synchronization

All migration files 00001 through 00017 are immutable.

| Range | Purpose |
| --- | --- |
| 00001-00005 | Core multi-tenant schema, RLS, onboarding RPC, query indexes |
| 00006-00009 | Lead API keys/source idempotency and automation execution hardening |
| 00010-00012 | RPC grant hardening, service-role onboarding grant, RLS helper lockdown |
| 00013-00016 | Removed custom MFA recovery-code infrastructure |
| 00017 | Versioned legal documents and immutable user consent history |

**Synchronization:** local 00001-00017 and linked Supabase project
`fnkzqrnsfnqxbodxdjgq` remote 00001-00017 are synchronized. Migration 00017
was successfully applied remotely. Do not edit any applied migration.

## 9. Security Hardening Already Complete

- Organization-scoped RLS and mutation checks.
- PKCE OAuth, safe internal redirect validation, and SSR authentication gates.
- Service-role-only onboarding RPC execution.
- Turnstile production fail-closed behavior.
- Supabase TOTP MFA/AAL2 dashboard and sensitive-operation enforcement.
- Server-side legal-consent enforcement before provisioning and protected data.
- Security headers, error sanitization, integration credential boundaries,
  Slack URL validation/format escaping, and tenant-isolation checks.

## 10. Deferred Security Work and Production Blockers

### Deferred security work

- Inbound webhook HMAC body signing and replay protection.
- Distributed rate limiting / Redis implementation.
- Production security-event logging.
- Production HSTS/WAF decisions, secret rotation, environment separation, and
  final production security review.

### Production blockers and manual configuration

- Custom SMTP / transactional email and verified sending domain.
- Production redirect URLs for Supabase Auth and OAuth providers.
- Live credential and end-to-end checks for OpenAI, n8n, HubSpot,
  GoHighLevel, Slack, and any email provider.
- Apple OAuth requires Apple Developer Program configuration.
- Future legal-copy review must publish new immutable rows; never edit the
  seeded legal-document history.

## 11. Manual Verification Record

### Confirmed in current history/context

- System, Light, and Dark theme behavior was visually checked.
- Required legal checkbox disabled/enabled UX was checked; marketing remains
  optional.
- New-user dashboard tenant isolation was visually confirmed.
- Turnstile positive/negative behavior, password recovery, TOTP MFA/AAL2,
  Google OAuth, and Microsoft OAuth were previously manually tested.

### Still pending or environment-dependent

- Full email OTP flow after custom SMTP configuration.
- Email-change confirmation under production-domain/rate-limit conditions.
- Apple OAuth activation and test.
- Live production integration tests and production security configuration.

## 12. Latest Completed Phase and Exact Next Phase

**Latest completed product phase:** Phase 14.4C.1A - Final Visual and UX
Corrective Pass. The follow-up legal effective-date correction is complete in
`838f2f3`.

**Exact next phase:** Phase 14.4D - Team Management + Invitations + RBAC.

**After 14.4D:** Phase 14.5 - Core CRM Live Test.

Do not start Phase 14.5 before Phase 14.4D is complete.

## 13. Phase 14.4D Preparation - Decisions Required Before Implementation

### Required outcome

```
Organization
  -> members
  -> roles
  -> permissions
```

Target roles: `owner`, `admin`, `manager`, `agent`, and `viewer`.

Normal signup creates a new organization. An invitation acceptance path must
join the invitee to an existing organization and must not call the normal
new-organization onboarding path.

### Required protections

- Tenant isolation, server-side permission enforcement, and RLS role
  enforcement; never UI-only authorization.
- No privilege escalation or cross-organization invitation acceptance.
- High-entropy invitation tokens stored hashed, with expiration, single use,
  revoke/resend lifecycle, and replay protection.
- Email-enumeration resistance and safe invitation redirects.
- Final-owner removal prevention, ownership-transfer confirmation safeguards,
  and an audit trail for security-relevant membership events.

### Unresolved design questions

- How existing-user invitations differ from new-user invitations.
- Whether one user may belong to multiple organizations, and whether that
  requires an organization switcher before or within this phase.
- Suspended-member semantics and data-access effect.
- Ownership-transfer confirmation and recovery rules.
- Seat-limit-ready data model and whether limits are enforced now or later.
- Invitation email delivery mechanism: Supabase Auth flow, custom SMTP, or a
  transactional provider such as Resend.

Do not silently decide irreversible invitation, membership, or role semantics.

## 14. Explicit Do Not Rules

- **DO NOT** modify migrations 00001 through 00017.
- **DO NOT** weaken RLS, expose service-role credentials, or bypass tenant
  isolation.
- **DO NOT** weaken PKCE, MFA/AAL2, Turnstile, legal consent, safe redirects,
  or onboarding safeguards.
- **DO NOT** push without explicit authorization.
- **DO NOT** start Phase 14.5 before Phase 14.4D is completed.
- **DO NOT** implement Team Management, invitations, or RBAC until an explicit
  Phase 14.4D implementation approval is given.

## 15. Historical Documentation Notes

- `CODEX_HANDOFF_2026-08-08.md`, Phase 14.4B checkpoints, and the original
  Phase 14.4B.10 handoff are preserved historical snapshots. Some correctly
  describe the state at their creation time but predate migration 00017
  deployment and Phase 14.4C completion.
- This file, `PROJECT_STATUS.md`, and `ROADMAP.md` are the current planning
  references for the next agent/session.
