# Revora Roadmap

**Current checkpoint:** Phase 14.6F Google Workspace complete and locally
validated; live credential and linked-migration gates remain (2026-08-21)

## Completed

- Phases 0-14.4C: application foundation, dashboard, Supabase data/auth/RLS,
  security, legal consent, and visual system.
- Phase 14.4D: organization RBAC, invitations, team management, switching, and
  ownership transfer.
- Phase 14.4E: Revora branding and UX corrective passes.
- Phase 14.5: Core CRM live test and final closure.
- Phase 14.6A: integration foundation and encrypted organization-scoped
  provider connections.
- Phase 14.6B: HubSpot and GoHighLevel.
- Phase 14.6C: n8n, Zapier, and Make.
- Phase 14.6D: Slack OAuth plus exact-HOT alerts; Twilio infrastructure limited
  to read-only account and source-number validation.
- Phase 14.6E: Tally automatic form discovery/mapping, signed inbound lead
  capture, tenant-scoped replay protection, and safe Connect/Test/Disconnect.
- Phase 14.6F: one Google Workspace OAuth bundle, exact least-privilege scopes,
  coordinated token lifecycle, read-only Tests, and bounded Calendar/Gmail
  mutations.

## Next — Phase 14.6G: Complete Integration E2E Audit

Audit every provider regression, tenant boundary, retry/idempotency contract,
credential exposure path, build/audit result, and live-vs-blocked gate before
product completion work begins.

## Product Completion

- **14.7 — Product UX Completion:** provider logos, consistent responsive
  polish, accessibility and interaction-state review, validated language and
  timezone selectors, and explicit scoping of Notifications, Global Search,
  Calendar, AI Insights, and Chat before removing any `Soon` placeholder.
- **14.8 — Production Infrastructure and Release Readiness:** production
  environment, deployment, SMTP, distributed rate limiting, monitoring,
  backups, security headers/WAF decisions, credential rotation, legal review,
  and final global regression before a go-live claim.

The older provisional 14.7-14.10 sequence is superseded. Its n8n, HubSpot, and
Slack work was completed inside Phases 14.6B-14.6D; it must not be repeated.

## Deferred

- Twilio SMS, WhatsApp, voice calls, phone-number purchase, and callbacks.
- Apple OAuth pending Apple Developer Program configuration.
- Enterprise SAML/SCIM, IP allowlists, and customer portal work.

## Guardrails

- Migrations `00001` through `00035` are immutable.
- RLS and organization authorization remain the tenant boundary.
- Secrets remain server-only and encrypted at rest.
- Do not push, deploy, purchase, or perform paid provider actions without
  explicit authorization.
