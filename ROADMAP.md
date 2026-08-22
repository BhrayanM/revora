# Revora Roadmap

**Current checkpoint:** Phase 14.7 Product UX Completion locally implemented
and validated; no push or deployment performed (2026-08-21)

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
- Phase 14.6G: cross-provider deterministic E2E gate, OAuth/PKCE replay and
  persistence hardening, bounded CRM transports, and honest live-status audit.
- Phase 14.7: trusted provider branding, validated workspace preferences,
  organization-scoped lead search and activity, bounded Calendar workspace,
  persisted AI Insights, truthful navigation, and responsive/accessibility QA.

## Next — Phase 14.8: Production Infrastructure and Release Readiness

Prepare an explicitly authorized production environment: deployment, SMTP,
distributed rate limiting, monitoring, backups, security controls, credential
rotation, legal review, and a final global regression before any go-live claim.

## Product Completion

- **14.7 — Product UX Completion — COMPLETE LOCALLY:** provider branding,
  responsive/accessibility polish, validated preferences, real Activity Center,
  Global Search, Calendar, and AI Insights. Chat is explicitly deferred and
  absent from primary navigation.
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
