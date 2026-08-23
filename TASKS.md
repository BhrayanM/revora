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

## Next — Phase 14.8 Production Infrastructure and Release Readiness

### 14.8A — CI/CD Foundation
- [x] Create `.github/workflows/ci.yml` (PR + master gate)
- [x] Create `.github/workflows/security.yml` (weekly dependency audit)
- [x] Create `.github/dependabot.yml` (automated dependency PRs)
- [x] Validate YAML syntax for all three files
- [x] Verify all local gates pass post-creation
- [ ] Commit and push to activate GitHub Actions
- [ ] Verify CI runs on first PR; confirm branch protection enabled

### 14.8B — Environment Blueprint
- [ ] Create/update `.env.example` covering all Phase 14.7 vars
- [ ] Create `docs/SECRETS_INVENTORY.md` classifying every var by level

### 14.8C — Secrets Management
- [ ] Document secrets rotation procedures for all critical keys
- [ ] Add decision record for runtime secrets platform choice

### 14.8D — Observability & Structured Logging
- [ ] Design structured logging interface (no PII, no credentials)
- [ ] Connect to error-tracking service (Sentry or equivalent)

### 14.8E — Backup & Recovery
- [ ] Document RTO/RPO targets
- [ ] Verify Supabase backup schedule (requires production project)

### 14.8F — Distributed Rate Limiting
- [ ] Implement real Redis/Upstash rate limiter (replace null stub)
- [ ] Add `@upstash/redis` and `@upstash/ratelimit`

### 14.8G — Security & Release Hardening
- [ ] Evaluate removing `unsafe-eval` from CSP in production build
- [ ] Update ARCHITECTURE.md to reflect current Phase 14.7 state
- [ ] Add HSTS header (requires production domain)

### 14.8H — Deployment Readiness
- [ ] Decide topology (Vercel vs Docker+VPS)
- [ ] Register domain and configure DNS
- [ ] Create Supabase production project; apply migrations 00001–00035
- [ ] Configure all production secrets and OAuth redirect URLs
- [ ] Fix docker-compose.yml to remove local postgres service

### 14.8I — Production Validation
- [ ] Execute all live provider gates with real credentials
- [ ] Complete PRODUCTION_CHECKLIST.md
- [ ] Run final tenant-isolation regression
- [ ] Make explicit go-live claim

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
