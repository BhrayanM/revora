# Revora Tasks

**Current checkpoint:** Phase 14.7 complete locally on 2026-08-21. No push or
production deployment has been performed.

## Completed — Phase 14.7 Product UX Completion

- [x] Validate workspace language and IANA timezone preferences server-side.
- [x] Add reviewed package-local identities for all ten integration providers.
- [x] Deliver organization-scoped Global Lead Search with `Ctrl/Cmd+K`.
- [x] Deliver the read-only organization Activity Center.
- [x] Deliver bounded Google Calendar upcoming-event and appointment UI.
- [x] Deliver standalone AI Insights from persisted qualification metadata.
- [x] Remove protected-product `Soon` markers, dead controls, and Chat navigation.
- [x] Complete responsive, accessibility, loading/error/success, and reduced-
  motion polish across all protected routes.
- [x] Add deterministic `test:product-ux` coverage and preserve the complete
  `test:integration-e2e` gate.
- [x] Validate 375px, 768px, and 1440px layouts in light/dark themes with
  authenticated keyboard and state checks.
- [x] Preserve migrations `00001`-`00035` byte-for-byte; add no migration.

## Active — Phase 14.8 Pre-Production & Sales Readiness ($0 Budget Strategy)

### 14.8A — CI/CD Foundation [CLOSED]
- [x] Create `.github/workflows/ci.yml` (PR + master gate)
- [x] Create `.github/workflows/security.yml` (weekly dependency audit)
- [x] Create `.github/dependabot.yml` (automated dependency PRs)
- [x] Validate YAML syntax for all three files
- [x] Verify all local gates pass post-creation
- [x] Commit locally (`333523d`)

### 14.8B — Environment & Production Configuration [IMPLEMENTED]
- [x] Audit all `process.env` usages across codebase
- [x] Create centralized safe validation in `src/lib/config/env.ts`
- [x] Update `.env.example` with full $0/demo/prod classification and safe placeholders
- [x] Audit `NEXT_PUBLIC_*` variables to confirm zero secret leakage
- [x] Decouple `docker-compose.yml` from local raw PostgreSQL
- [x] Configure `next.config.ts` (`poweredByHeader: false`, CSP connect-src)
- [x] Create `docs/PRODUCTION_ENVIRONMENT.md` contract
- [x] Add verification script `scripts/verify-env-config.mjs`

### 14.8C — Secrets Management & Inventory
- [ ] Create `docs/SECRETS_INVENTORY.md` classifying all variables by tier
- [ ] Document secrets rotation procedures and emergency runbooks
- [ ] Document runtime secrets model ($0 / free tier)

### 14.8D — Observability & Structured Safe Logging
- [ ] Design structured logging interface (zero PII, zero credentials)
- [ ] Prepare error-tracking integration adapter (Sentry/Axiom free tier)

### 14.8E — Backup & Recovery Design
- [ ] Document RTO/RPO targets and backup strategy
- [ ] Create zero-cost manual backup / dump script

### 14.8F — Distributed Rate Limiting & Abuse Protection
- [ ] Implement real Redis/Upstash rate limiter (replace null stub)
- [ ] Retain in-memory fallback for local dev / demo

### 14.8G — Security Hardening & Architecture Documentation
- [ ] Evaluate CSP directives and track `unsafe-eval` debt
- [ ] Update `ARCHITECTURE.md` to reflect complete v0.14 state

### 14.8H — Pre-Production Deployment Readiness
- [ ] Document free-tier hosting options (Vercel / Render / Docker)
- [ ] Package standalone container and verify production build assets

### 14.8I — Sales & Demo Verification
- [ ] Validate end-to-end demo flows with mock data
- [ ] Complete `PRODUCTION_CHECKLIST.md` in Sales-Ready status
- [ ] Declare Revora PRE-PRODUCTION & SALES READY

---

## Future — Phase 14.9 Production Activation (`READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT`)

- [ ] Purchase production domain & configure DNS / SSL.
- [ ] Provision Supabase Pro project ($25/mo) with PITR.
- [ ] Configure production transactional SMTP (Resend / Brevo).
- [ ] Register live OAuth app redirect URIs (HubSpot, GHL, Slack, Google).
- [ ] Execute live provider mutation regression suite with production credentials.

## Explicitly Deferred

- Twilio SMS, WhatsApp, voice, callbacks, and phone-number purchase.
- Two-way Chat and its consent, opt-out, sender, retention, and persistence
  model.
- Apple OAuth until Apple Developer Program configuration is available.
- Enterprise SAML/SCIM, IP allowlists, and customer portal work.

## Guardrails

- Do not push, deploy, purchase, or perform paid/mutating provider actions
  without explicit authorization.
- Do not modify migrations `00001` through `00035`; create only a new
  consecutive migration when a later approved phase strictly requires one.
- Keep credentials server-only and preserve organization-scoped authorization
  plus RLS at every boundary.
