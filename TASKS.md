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

- [ ] Approve the production hosting, Supabase, and domain topology.
- [ ] Configure production secrets and rotate any credentials used for testing.
- [ ] Configure SMTP/transactional delivery for invitations and ownership
  transfers.
- [ ] Add distributed rate limiting and production abuse controls.
- [ ] Configure monitoring, alerting, structured safe logs, and backups.
- [ ] Decide and configure security headers, CSP, edge/WAF controls, and
  production callback origins.
- [ ] Complete legal/copy review and production environment documentation.
- [ ] Execute live provider gates only with explicit credentials and mutation
  authorization.
- [ ] Run the final global security, migration, integration, UX, and deployment
  regression before making any go-live claim.

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
