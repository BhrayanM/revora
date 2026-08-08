# AI Growth Platform — Codex Local Handoff

> **Date:** 2026-08-08
> **Intended for:** Codex Local running against this same local repository
> **Status:** Phase 14.4B COMPLETE — ready for Phase 14.4B.10 (Terms/Privacy/Legal Consent)

---

## Repository

```
Path:    C:\Users\bhray\ai-growth-platform
Branch:  master
HEAD:    f20ce37
Remote:  NOT PUSHED — all commits are local only
```

### Development Model

- Local Next.js project (Next.js 16.3.0, Turbopack)
- Supabase backend (auth, database, storage)
- Local Git history — commits intentionally NOT pushed
- **Codex must work against this same local repository and must not assume remote GitHub is current.**

### Recent Commits (last 20)

```
f20ce37 feat(auth): collapsible security accordion, profile cleanup, and email OTP verification
cb67e29 fix(auth): restore all 3 social providers with active/coming-soon status and Microsoft email scope
7465dbb feat(auth): gate OAuth providers via NEXT_PUBLIC_OAUTH_PROVIDERS env var
658cd46 feat(auth): add social authentication (Google, Apple, Microsoft)
f200dc1 fix(auth): provision tenant with service_role credential without cookie forwarding
3b65138 docs(checkpoint): save Phase 14.4B stopping point
7cddfbb fix(auth): MFA challenge UX
46f630e fix(security): remove dormant custom MFA recovery code attack surface
5c7f313 fix(security): enforce MFA AAL2 gate at login + layout
8604a81 feat(security): account security center
bbf36f5 fix(auth): handle email confirmation redirect without code param
0e42352 feat(auth): change-email with secure confirmation flow
9c641d4 fix(security): restore 00010 immutability, fail-closed CAPTCHA
d05347e feat(security): remote migration hardening + Turnstile CAPTCHA
90cca6a fix(security): authorization hardening — org checks on lead/stage mutations
1278a39 feat(auth): implement password recovery flow
da17d15 feat(ui): propagate approved visual language
e9b66dd feat(ui): dark graphite sidebar prototype
161c40b feat(ui): final art direction — KPI cards, AI treatment, automation flow
df60a7d fix(ui): correct contrast regression — token semantics, cascade sweep
```

### Local Tags

```
checkpoint-phase-14.4b-2026-08-08  (on 3b65138 — Phase 14.4B stopping point)
```

---

## Project History — Phase 0 to Current (Phase 14.4B.9E)

> Reconstructed from repository evidence: git log, migrations, docs, and DECISIONS.md.
> Detailed phase documents exist in `docs/` and `docs/checkpoints/`. This section provides a chronological index.

### Phase 0 — Project Bootstrap
**Commits:** `d47cfa6` → `8b8b8df`

- Initialized from `create-next-app` (Next.js 16)
- TypeScript strict mode, Tailwind v4, ESLint, Prettier, Husky, Docker
- Documentation scaffolded (ARCHITECTURE.md, ROADMAP.md, DECISIONS.md)
- Key decisions: App Router over Pages Router (DR-001), Tailwind v4 over v3 (DR-002), CVA for component variants (DR-003)

### Phase 1–2 — Design System + Landing Page
**Commits:** `213acde` → `d3097af`

- Complete UI component library: Button, Input, Card, Badge, Alert, Toast, Modal, Table, Loading, EmptyState, Motion primitives
- Premium SaaS landing page: Hero, Features, Benefits, AI Workflow, Integrations, Demo, Testimonials, Pricing, FAQ, CTA, Footer

### Phase 3 — Dashboard UI Shell
**Commits:** `c6cebc4` → `028fe85`

- Dashboard shell with Sidebar, TopNav, and all protected route pages: Dashboard, Analytics, Leads, Pipeline, Settings, Profile, Notifications
- Dark graphite sidebar + light application canvas visual language
- Server Components architecture (removed framer-motion, fixed mobile sidebar)
- Signup page scaffolded, accessibility fixes

### Phase 4.1–4.2 — Supabase Foundation + Multi-Tenant Schema
**Commits:** `7d0f680` → `85690e4`

- Installed `@supabase/ssr` and `@supabase/supabase-js`
- Created browser/server/service clients (`src/lib/supabase/`)
- **Migration 00001**: 10-table multi-tenant schema — profiles, organizations, memberships, workspaces, pipelines, pipeline_stages, leads, conversations, automations, integrations
- `handle_new_user` trigger: auto-creates profile on auth.users INSERT
- TypeScript Database types from schema

### Phase 4.3–4.6 — Auth + RLS + Real Data
**Commits:** `2b68b54` → `e799bf3`

- Supabase Auth with SSR middleware, login/signup pages
- **Migration 00002**: RLS policies on all 10 tables via `is_org_member()` helper
- **Migration 00003**: RLS hardening — WITH CHECK on UPDATE policies, `search_path=''` lockdown
- **Migration 00004**: Atomic `onboard_user()` RPC — creates org + owner membership + workspace
- Auto-provision organization on first signup via `/auth/callback`
- **Migration 00005**: Composite query indexes for analytics
- Connected dashboard to real Supabase data (Server Actions, auth context helpers)
- Lead creation, pipeline stage movement, profile update, settings persistence wired
- **Bug fix** (`3a6a4d7`): `getLeadsByWorkspace` org filter, `PGRST116` handling, parallelized pipeline metrics

### Phase 5 — AI, Lead Ingestion, Automation
**Commits:** `1e4c07c` → `da9ffaf`

- Phase 5.1: OpenAI infrastructure — server-only client, typed errors, retry logic, structured output
- Phase 5.2: AI lead qualification engine — structured scoring, temperature classification, dashboard integration
- Phase 5.3: Lead intake API — `/api/leads` with source_api_keys auth, idempotency via `source_external_id`, n8n webhook emission, rate limiting
- **Migration 00006**: `source_api_keys` table
- **Migration 00007**: `source_external_id` column on leads
- Phase 5.4: n8n automation — versioned event contract, internal qualification endpoint (`/api/internal/leads/[id]/qualify`), HMAC auth, integration tests
- Phase 5.5: CRM provider abstraction — HubSpot sync, Slack HOT lead alerts, credential storage via `integrations` table

### Phase 6–7 — Production Hardening + SaaS Polish
**Commits:** `45aff5b` → `73ce68e`

- **Migration 00008**: `automation_executions` table for observability/retry
- **Migration 00009**: WITH CHECK fix on `automation_executions` UPDATE policy
- Retry processor, idempotent execution wrapper
- GoHighLevel CRM provider, integration management panel
- API key management UI, automation activity page
- Rate limiter abstraction (in-memory + Redis stub)
- Reliable webhook emission
- Dashboard polish: lead search/filter, temperature badges, responsive fixes, analytics HOT/WARM/COLD breakdown (`a5ecb60`)

### Phase 8–12 — Deployment Prep + Live E2E Validation
**Commits:** `d6d9b44` → `82eef3f`

- Production deployment validation — env audit, secrets scan, migration validation
- `docs/LIVE_E2E_TEST.md` — 150-line E2E test checklist
- `docs/DEPLOYMENT.md` — deployment guide
- `docs/PROVISIONING.md` — 472-line provisioning runbook (Supabase, Vercel, OpenAI, n8n, HubSpot, GHL, Slack)
- `docs/PRODUCTION_CHECKLIST.md` — 120-line production checklist
- CRM verification scripts (`scripts/verify-crm.mjs`), n8n workflow JSON validation
- **Fix** (`9a72803`): replaced `uuid_generate_v4()` with `gen_random_uuid()` for Supabase managed PG compatibility

### Phase 13–14.4A — Auth Deep Dive
**Commits:** `df60a7d` → `da17d15`

- UI overhaul: premium visual language, surface layering, KPI accent borders, AI ambient treatment, automation flow visualization
- Dark graphite sidebar redesign, dashboard layout restructure
- Contrast regression fix — token semantics sweep, auth screen upgrade
- Auth pages visual upgrade — login, signup, forgot-password polished
- Password recovery flow implemented

### Phase 14.4B — Auth Infrastructure Complete
**Commits:** `1278a39` → `f20ce37` (current HEAD)

| Subphase | Commit | What |
|----------|--------|------|
| 14.4B.1 | `1278a39` | Password recovery flow (`/forgot-password`, `/reset-password`) |
| 14.4B.2 | `90cca6a` | Authorization hardening — org checks for `removeLead` + `moveLeadStage` |
| 14.4B.3 | `d05347e` | **Migration 00010–00012**: RPC grant revocations, service_role onboarding grant, `is_org_member` anon lockdown. Turnstile CAPTCHA integrated on login/signup/forgot-password. CSP updated (OpenAI removed from browser). |
| 14.4B.4 | `9c641d4` | Security fix: 00010 immutability restored, CAPTCHA fail-closed in production, captcha reset on auth errors |
| 14.4B.5 | `0e42352` | Email change with secure confirmation flow, `/forgot-email` safe recovery page, settings security panel |
| 14.4B.6 | `bbf36f5` | **Critical bug fix**: email confirmation redirect (no `code` param) skipped `onboard_user` → orphaned user without org. Fixed both OAuth and email flows. Added dashboard layout recovery path. |
| 14.4B.7A | `8604a81` | Account Security Center — MFA TOTP enrollment/unenrollment, backup codes schema (00013), change password, session management |
| 14.4B.7B | `5c7f313` | MFA AAL2 gate enforcement at login + layout, validate `current_password` on change, disable misleading backup codes |
| 14.4B.7C | `46f630e` | **Migration 00014–00016**: Removed dormant custom MFA recovery code attack surface — 3 SECURITY DEFINER RPCs dropped, `mfa_recovery_codes` table dropped |
| 14.4B.7D | `7cddfbb` | MFA challenge UX: back-to-login escape path with local signOut, multiple verified authenticator support |
| 14.4B.8 | `3b65138` → `f200dc1` | **Signup E2E failed then passed.** Root cause: `@supabase/ssr` cookie forwarding caused `onboard_user` RPC to run as `authenticated` (permission denied). Fix: `createServiceAdminClient()` with empty cookies sends service_role key directly. E2E: fresh signup → 1 profile, 1 org, 1 owner membership, 1 workspace. All 7 protected routes passed. |
| 14.4B.9A | `658cd46` | Social auth: Google, Apple, Microsoft buttons with `signInWithOAuth`. Icons, SocialAuth component, login/signup integration. |
| 14.4B.9B | — | Google OAuth manual E2E: PASS (fresh user + identity linking + MFA) |
| 14.4B.9C | `7465dbb` → `cb67e29` | Provider gating via `NEXT_PUBLIC_OAUTH_PROVIDERS` env var. Apple deferred as "Soon". Microsoft active with `scopes: "email"`. |
| 14.4B.9D | — | Microsoft OAuth manual E2E: PASS (fresh user + identity linking with existing Google+email user + MFA) |
| 14.4B.9E | `f20ce37` (HEAD) | Auth UX cleanup: collapsible security accordion, email change removed from Profile, email OTP verification page (`/verify-email`), signup navigates to OTP instead of link message. |

### Key Architectural Decisions by Phase

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Next.js App Router | 0 | React Server Components, nested layouts, streaming |
| Tailwind v4 | 0 | CSS-first config, better performance |
| CVA for variants | 0 | Type-safe, shadcn/ui pattern |
| Supabase over custom auth | 4.1 | Managed auth + DB + RLS, reduces infrastructure |
| Multi-tenant via `organization_id` + RLS | 4.2 | Tenant isolation at database level |
| Atomic onboarding RPC | 4.3 | Single transaction prevents orphan records |
| Service-role-only RPC execution | 14.4B.8 | `createServiceAdminClient()` bypasses cookie-forwarding JWT issue |
| PKCE OAuth flow | 14.4B.9 | Supabase default, no client secret needed |
| Auto-linking by verified email | 14.4B.9 | GoTrue server-side — no custom `linkIdentity()` needed |
| Backup codes removed | 14.4B.7C | Could not establish valid AAL2 session; use second authenticator instead |

### Migration Timeline

| Range | Phase | Purpose |
|-------|-------|---------|
| 00001 | 4.2 | Core 10-table multi-tenant schema + `handle_new_user` trigger |
| 00002 | 4.3 | RLS policies on all tables + `is_org_member` helper |
| 00003 | 4.3 | RLS hardening — WITH CHECK, `search_path=''` |
| 00004 | 4.3 | `onboard_user()` RPC — atomic provisioning |
| 00005 | 4.4 | Composite query indexes |
| 00006 | 5.3 | `source_api_keys` table |
| 00007 | 5.3 | `source_external_id` on leads |
| 00008 | 6 | `automation_executions` table |
| 00009 | 6 | WITH CHECK fix on executions UPDATE |
| 00010 | 14.4B.3 | RPC grants revoked from public/anon/authenticated |
| 00011 | 14.4B.3 | `onboard_user` grant to service_role |
| 00012 | 14.4B.3 | `is_org_member` lockdown — anon denied, authenticated granted |
| 00013 | 14.4B.7A | MFA recovery codes schema (later removed) |
| 00014 | 14.4B.7C | Drop 3 custom recovery RPCs |
| 00015 | 14.4B.7C | Drop `mfa_recovery_codes` table |
| 00016 | 14.4B.7C | Force-drop `mfa_recovery_codes` table with CASCADE |

### Key Bugs Discovered and Fixed

| Bug | Phase | Fix |
|-----|-------|-----|
| `getLeadsByWorkspace` missing org filter | 4.4.1 | Added org filter, parallelized pipeline metrics |
| Email confirmation without `code` param skipped `onboard_user` | 14.4B.6 | Handle both code-based and code-less callback flows |
| `onboard_user` permission denied — SSR cookie forwarding | 14.4B.8 | `createServiceAdminClient()` with empty cookies |
| Social auth only showed Google — env var gate too aggressive | 14.4B.9C | Restored all 3 providers, active/coming-soon distinction |

---

## Product Definition

**AI Growth Platform** is a B2B multi-tenant SaaS.

### User Roles (organizational RBAC)

- **owner** — full organization control, can transfer ownership
- **admin** — can manage settings, integrations, members
- **manager** — can manage leads, pipeline, automations
- **agent** — sales agent, works leads assigned to them
- **viewer** — read-only access (planned)

The authoritative role field is **`memberships.role`**.

### Signup = New Company

Public signup represents **"Create a new company/account"**. The provisioning chain:

```
signup → user → profile → organization (owner membership) → Default Workspace
```

### Leads/Contacts Are NOT Users

Leads and contacts are customers/prospects managed by the business. They are NOT application users and do not have auth accounts.

### Future: Customer Portal

A separate `/portal`-style application may later be created for end customers of businesses using the platform. It must remain architecturally separate from the internal B2B staff dashboard. **DO NOT implement now.**

---

## Multi-Tenant Architecture

### Data Model

```
auth.users (Supabase-managed)
  └── public.profiles (1:1, auto-created via handle_new_user trigger)
        └── public.memberships (1:N, profile_id → profiles.id)
              ├── role: 'owner' | 'admin' | 'manager' | 'agent'
              └── public.organizations (N:1, organization_id → organizations.id)
                    └── public.workspaces (1:N, organization_id → organizations.id)
```

### Key Relationships

| Table | Key Constraint | Notes |
|-------|---------------|-------|
| `profiles` | `id` refs `auth.users(id)` ONDELETE CASCADE | Auto-created by `handle_new_user()` trigger |
| `memberships` | `UNIQUE(profile_id, organization_id)` | One membership per user per org |
| `memberships` | `role` CHECK in ('owner','admin','manager','agent') | RBAC source of truth |
| `workspaces` | `organization_id` refs `organizations(id)` | Default workspace = "Default Workspace" |
| `leads` | `organization_id` refs `organizations(id)` | Scoped to org; `assigned_to` → profiles |

### Tenant Isolation (RLS)

All 12+ business tables have Row-Level Security enabled. The `is_org_member(org_id)` SECURITY DEFINER function is the central RLS helper — it checks membership for the current authenticated user. RLS policies use `is_org_member(organization_id)` for SELECT/INSERT/UPDATE/DELETE, with role-specific policies for admin-only operations.

### Key RPC: `onboard_user`

Defined in migration `00004_onboarding_function.sql`. Atomically creates:
1. `organizations` row (with unique slug)
2. `memberships` row (role='owner')
3. `workspaces` row ("Default Workspace")

Called from:
- `/auth/callback` route (primary path)
- DashboardLayout safety net (fallback for partially-provisioned users)

Execution is **service_role only** — revoked from `public`, `anon`, and `authenticated` in migration 00010, re-granted to `service_role` in 00011.

### Why `createServiceAdminClient()` Exists

The `@supabase/ssr` `createServerClient` with cookies configured forwards the authenticated user's JWT as the `Authorization` header, even when the API key is the `SUPABASE_SERVICE_ROLE_KEY`. PostgREST determines the effective role from the JWT (`authenticated`), not the key.

`createServiceAdminClient()` in `src/lib/supabase/server.ts` uses empty cookie implementations (`getAll: () => []`, `setAll: () => {}`) so that no user session is loaded. The library falls back to using the service_role key as the `Authorization` header, making RPC calls execute as `service_role`.

---

## Authentication Status

### Email/Password

| Component | Status | Notes |
|-----------|--------|-------|
| Signup | PASS | Turnstile integrated |
| Login | PASS | Turnstile on form |
| Password reset | PASS | Forgot-password → email → reset |
| Email change | PASS | Settings → Security → Email Address accordion |
| Signup tenant provisioning E2E | PASS | Verified before OTP UX change |
| Email OTP verification (new UX) | **BLOCKED** | See Email OTP section below |

### OAuth / Social Auth

| Provider | Status | E2E | Identity Linking | MFA |
|----------|--------|-----|-----------------|-----|
| **Google** | Active | PASS | PASS — auto-link by verified email | PASS |
| **Microsoft (Azure)** | Active | PASS | PASS — linked with existing Google+email user | PASS |
| **Apple** | Deferred (Soon) | N/A | N/A | N/A |

Apple is visible as disabled "Soon" button. Activation requires paid Apple Developer Program membership ($99/year).

### OAuth Architecture

- Uses `supabase.auth.signInWithOAuth()` with PKCE flow
- All providers redirect to `/auth/callback?next=/dashboard`
- Callback handles `exchangeCodeForSession` + membership check + provisioning
- `NEXT_PUBLIC_OAUTH_PROVIDERS` env var (default: `"google"`) controls active providers
- Providers not in the env var list are shown as disabled "Soon" buttons
- Microsoft Azure includes `scopes: "email"` in signInWithOAuth options

### Identity Auto-Linking

Supabase GoTrue server automatically links OAuth identities to existing accounts by matching verified email. Successfully tested:

- Existing email+password account → Google OAuth (same email) → same `auth.users.id`, same tenant
- Existing account with email+Google → Microsoft OAuth (same email) → all three identities linked, same tenant

No custom `linkIdentity()` logic is used or needed. "Enable Manual Linking" in Supabase Dashboard is NOT required for auto-linking during OAuth sign-in — that setting only controls the `linkIdentity()`/`unlinkIdentity()` client methods.

---

## Email OTP — Current State

### Implemented

New signup flow replaces email-confirmation-link UX with 6-digit OTP:

```
/signup → signUp() → sessionStorage("pendingSignupEmail") → /verify-email
  → 6-digit input → verifyOtp({ type: "signup" }) → /auth/callback → provisioning → /dashboard
```

- `/verify-email` page: numeric input, autoFocus, masked email display, inputMode="numeric"
- `verifyOtp({ email, token, type: "signup" })` — confirms email + establishes session
- `resend({ type: "signup", email })` — 30s cooldown timer
- Signup page navigates to `/verify-email` instead of showing old "Check your email" message

### BLOCKED — Manual Supabase Configuration Required

**Email OTP final E2E has NOT been validated.** The Supabase hosted "Confirm signup" email template must be edited to include `{{ .Token }}` instead of (or in addition to) `{{ .ConfirmationURL }}`. Currently, the template cannot be edited without Custom SMTP.

**Future sequence to unblock:**
1. Buy/finalize domain
2. Configure DNS
3. Verify domain in Resend
4. Create Resend API key
5. Configure Supabase Custom SMTP
6. Edit Confirm Signup template to include `{{ .Token }}`
7. Run fresh Email OTP E2E
8. Verify no org/membership/workspace exists before email verification
9. Verify provisioning only after successful OTP

**Supabase OTP config:**
- OTP expiration: 3600 seconds
- Desired OTP length: 6 digits

**DO NOT remove the current OTP implementation.**

---

## MFA / Account Security

### TOTP Authenticator

- Enroll: QR code + manual secret + 6-digit verify
- Challenge: `/auth/mfa` page with code input
- Unenroll: requires AAL2 verification
- Multiple verified TOTP factors supported (second authenticator as backup)

### AAL2 Enforcement

- **Login**: After `signInWithPassword` or OAuth, checks `mfa.getAuthenticatorAssuranceLevel()`. If `nextLevel === "aal2"`, redirects to `/auth/mfa`.
- **DashboardLayout SSR gate** (`src/app/(dashboard)/layout.tsx:60-80`): If user has verified factors but session is AAL1, redirects to `/auth/mfa`.
- **Sensitive operations**: MFA unenrollment requires AAL2.

### Security Settings UI

`Settings → Security` uses a single-open accordion:
- **Account Protection** (always visible — status overview with Protection Level badge)
- Password (collapsible)
- Email Address (collapsible — only email change location)
- Multi-Factor Authentication (collapsible, status badge on header)
- Recovery Methods (collapsible — codes + recovery email)
- Phone Verification (collapsible)
- Sessions (collapsible — sign out others/global)

### Custom Backup Codes — REMOVED

Custom backup codes were **intentionally removed** via migrations 00014–00016. Reason: custom codes could not establish a valid native Supabase AAL2 session and would create false confidence.

Current backup strategy: **multiple verified TOTP authenticator factors**.

**DO NOT reintroduce custom backup codes** without a complete secure AAL2-compatible recovery architecture.

---

## Profile Page Cleanup

Email change was **removed** from `/profile`. Profile now contains only:
- Avatar / name / role / join date sidebar
- Personal Information (name, email read-only, phone)
- Preferences (placeholder — notification prefs coming soon)

Email changes exist ONLY in **Settings → Security → Email Address** accordion section.

---

## Migrations (00001–00016)

All 16 migrations are synchronized (Local = Remote). **IMMUTABLE — do not modify any of 00001–00016.**

| Range | Purpose |
|-------|---------|
| 00001–00004 | Core schema (profiles, orgs, memberships, workspaces, pipelines, leads, conversations, automations, integrations) + RLS + onboarding function |
| 00005–00009 | Query indexes, source_api_keys, lead source_external_id, automation_executions, execution policy fix |
| 00010–00012 | RPC grant hardening — revoked from public/anon, granted to service_role (00011), is_org_member locked to authenticated only (00012) |
| 00013 | MFA recovery codes schema (originally created) |
| 00014–00016 | Removal of dormant custom recovery-code infrastructure (RPCs + table dropped) |

---

## Security Hardening Status

### Completed

- Supabase SSR auth with PKCE flow
- Row-Level Security on all 12+ business tables via `is_org_member()`
- Service-role-only onboarding (`onboard_user` RPC locked to service_role)
- Cloudflare Turnstile CAPTCHA on login, signup, and forgot-password forms
- Security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- OpenAI removed from browser CSP (server-only)
- Slack webhook URL validated against allowlist (SSRF mitigation)
- Slack mrkdwn injection escaped
- Error sanitization — real errors logged, generic messages returned
- MFA AAL2 enforcement at login + layout
- OAuth provider gating via env var
- No secrets tracked in Git
- npm audit: 0 vulnerabilities

### Deferred Security

- Webhook HMAC must sign request BODY (currently signs URL)
- Timestamp/replay protection for webhooks
- AI qualification rate limiting
- Redis/distributed rate limiting (currently in-memory)
- Structured security event logging
- Production HSTS
- WAF production configuration
- Secret rotation before deployment
- Production environment separation
- Custom SMTP
- Final production security review

---

## Current UI / UX State

### Dashboard
- Dark graphite sidebar with navigation
- Light application canvas
- KPI cards with accent border colors
- Empty states on Analytics/Leads/Pipeline/Automation
- Dashboard page shows lead metrics + pipeline donut + recent activity + AI insights

### Auth Pages
- Google button: active
- Microsoft button: active
- Apple button: visible as disabled "Soon"
- Email/password forms with Turnstile
- New `/verify-email` OTP verification page
- Auth visual polish still pending

### Protected Routes
- `/dashboard` — KPI overview
- `/analytics` — lead metrics, source breakdown, pipeline distribution, conversion funnel
- `/leads` — lead table with add/delete
- `/pipeline` — kanban board by stage with move buttons
- `/automation` — execution log table
- `/settings` — tabs: General, Integrations, API Keys, Notifications, Security
- `/profile` — personal info (email change removed)
- `/notifications` — placeholder

---

## Lead / Contact UI — Future Enhancement Ideas

The lead detail page (`/leads/[id]`) can evolve to tabbed sections:

**Contact**: name, email, phone, company, title, location
**Acquisition**: source, campaign, UTM params, landing page, form
**Sales**: pipeline stage, assigned agent, value, service interest, budget, urgency, purchase date
**AI**: overall score, intent, urgency, fit, engagement, risks, summary, recommended action
**Activity**: emails, calls, SMS, meetings, status changes, notes, automation executions

Plus tags, custom fields, marketing consent, DNC, preferred channel.

**DO NOT implement during checkpoint.**

---

## Roadmap from This Point

### NEXT: Phase 14.4B.10 — Terms + Privacy + Legal Consent
- `/terms` and `/privacy` pages
- Required signup consent (versioned acceptance records)
- Optional marketing consent
- OAuth consent gate
- Existing-user re-consent architecture
- Server-side enforcement

### Phase 14.4C — Auth Visual Polish

### Phase 14.4D — Team Management + Invitations + RBAC
- Roles: owner, admin, manager, agent, viewer
- Invitations, suspend/remove, ownership transfer
- Seat-limit-ready architecture, basic audit log
- Server-side permission enforcement

### Phase 14.5 — Core CRM Live Test
### Phase 14.6 — OpenAI Live Qualification
### Phase 14.7 — Production Infrastructure (Vercel, SMTP, Redis)
### Phase 14.8 — n8n + Webhook Security Hardening
### Phase 14.9 — HubSpot Live
### Phase 14.10 — Slack Live

### Deferred (Enterprise)
- SAML SSO, SCIM, IP allowlists, enterprise compliance, dedicated environments

---

## Known Deferred Items

- Final product/brand name not chosen
- Domain not purchased
- Resend SMTP not configured
- Email OTP E2E blocked until SMTP
- Apple OAuth deferred (Apple Developer Program $99/yr required)
- Final legal entity/company details unknown
- Terms/Privacy legal review required before production
- Customer Portal — future separate application
- Advanced Enterprise layer deferred

---

## Manual Test History

### PASS
- Turnstile positive (enables submit) + negative (disabled without token)
- Password recovery (forgot-password → email → reset)
- Signup tenant provisioning (email confirmation → org + workspace created)
- MFA TOTP enrollment + verification
- AAL1 → AAL2 enforcement (login redirect + layout gate)
- Google fresh OAuth (new user → provisioning → dashboard)
- Google same-email linking (email user → OAuth → same tenant)
- Google OAuth + MFA (AAL2 challenge after OAuth login)
- Microsoft fresh OAuth (new user → provisioning → dashboard)
- Microsoft same-email linking (existing Google+email user → Azure identity linked → same tenant)
- Microsoft OAuth + MFA
- Tenant isolation (separate accounts cannot see each other's data)
- Security accordion rendering
- Profile email-change removal (not visible on /profile)

### BLOCKED
- Email OTP E2E — requires Custom SMTP + template edit (see Email OTP section above)

### NOT TESTED
- Email change end-to-end (limited by Supabase dev email rate limits)
- Apple OAuth

### DEFERRED
- Team Management invitations
- Recovery codes (intentionally removed)
- Phone verification
- SMS provider

---

## Verified Project Health (2026-08-08)

```
npm run lint       — PASS (0 errors, 0 warnings)
npx tsc --noEmit   — PASS
npm run build      — PASS (22 routes, 0 errors)
npm audit          — 0 vulnerabilities
```

---

## Secret Hygiene

- `.env` files are gitignored (`.env`, `.env.local`, `.env.production`)
- `SUPABASE_SERVICE_ROLE_KEY` is in `.env` only (gitignored) — not tracked
- OAuth secrets (Google Client ID/Secret, Azure Client ID/Secret) are in Supabase Dashboard only
- Turnstile secret is in Supabase Dashboard only
- OpenAI API key is in `.env` (gitignored)
- No secrets tracked in any committed file
- `.env.example` is tracked but contains only placeholder names (no real values)

---

## Agent Instructions File

The repository has `AGENTS.md` at root with Next.js-specific rules. Codex should read it automatically on startup.

---

## Key Source Files to Read First

| File | Purpose |
|------|---------|
| `AGENTS.md` | Next.js agent rules |
| `ARCHITECTURE.md` | High-level architecture |
| `src/lib/supabase/server.ts` | Three Supabase clients |
| `src/lib/supabase/client.ts` | Browser client |
| `src/lib/auth/index.ts` | `getCurrentUser/Organization/Workspace/Profile` |
| `src/app/auth/callback/route.ts` | Central auth callback + provisioning |
| `src/app/(dashboard)/layout.tsx` | Dashboard auth gate + MFA enforcement |
| `src/components/auth/social-auth.tsx` | OAuth buttons with env-gating |
| `src/app/verify-email/page.tsx` | Email OTP verification |
| `supabase/migrations/` | All 16 migrations (immutable) |
