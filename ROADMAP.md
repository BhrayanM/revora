# Revora Roadmap

**Current checkpoint:** Phase 14.6D communication integrations (2026-08-20)

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

## Next — Phase 14.6E: Tally

Implement inbound Tally lead capture with signature verification,
organization routing, replay-safe deduplication, bounded payload handling, and
tenant-isolation tests. Preserve all Slack and Twilio contracts from 14.6D.

## Then

- **14.6F — Google Calendar + Gmail:** secure OAuth, least-privilege scopes,
  organization-scoped tokens, test/disconnect flows, and constrained actions.
- **14.6G — Complete integration E2E audit:** provider regression, tenant
  isolation, retry/idempotency, credential exposure, build/audit, and live-vs-
  blocked evidence.

## Deferred

- Twilio SMS, WhatsApp, voice calls, phone-number purchase, and callbacks.
- Apple OAuth pending Apple Developer Program configuration.
- Enterprise SAML/SCIM, IP allowlists, and customer portal work.

## Guardrails

- Migrations `00001` through `00033` are immutable.
- RLS and organization authorization remain the tenant boundary.
- Secrets remain server-only and encrypted at rest.
- Do not push, deploy, purchase, or perform paid provider actions without
  explicit authorization.
