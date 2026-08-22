# Product UX Completion Backlog

**Date:** 2026-08-10
**Reviewed:** 2026-08-21
**Repository:** `C:\Users\bhray\proyectos\01_Activos\Plataformas\ai-growth-platform`
**Status:** Phase 14.7 complete locally

Identified during Phase 14.6B HubSpot E2E testing and completed during Phase
14.7 without a schema migration.

## Completed Visual Polish

1. **Integration provider identities — COMPLETE**
   - HubSpot, n8n, Zapier, Make, Slack, Tally, Google Calendar, and Gmail use
     reviewed package-local assets.
   - GoHighLevel and Twilio use neutral Revora-owned marks because the reviewed
     public brand terms do not authorize repackaging their marks for this use.
   - All ten provider IDs retain consistent sizing, accessible text identity,
     responsive action layout, and local-only runtime assets.

## Completed Settings UX

2. **Language selector — COMPLETE**
   - Uses canonical `en-US` and `es-419` options.
   - Legacy labels normalize safely and forged values fail server validation.

3. **Default timezone selector — COMPLETE**
   - Uses supported IANA timezones with a deterministic fallback list.
   - The server revalidates every saved timezone.

## Functional Module Decisions

4. **Notifications — DELIVERED AS ACTIVITY CENTER**
   - `/notifications` now shows bounded organization-scoped CRM, automation,
     and safe integration events.
   - It intentionally makes no unread-count or notification-preference claim.

5. **Global Search — DELIVERED**
   - `Ctrl/Cmd+K` opens an accessible organization-scoped lead search.
   - Queries are normalized, separately scoped by field, capped, ranked, and
     projected to safe result DTOs.

6. **Calendar — DELIVERED**
   - `/calendar` shows a bounded 30-day primary-calendar agenda and an explicit
     one-shot appointment form using the validated workspace timezone.
   - Disconnected and provider-error states route safely to Integrations.

7. **AI Insights — DELIVERED**
   - `/insights` derives metrics and a priority queue from persisted
     organization-scoped qualification metadata only.
   - It performs no automatic model call.

8. **Chat — EXPLICITLY DEFERRED**
   - Removed from primary navigation instead of retaining a non-functional
     promise.
   - Requires a separately approved channel, consent/opt-out model, sender
     identity, retention policy, and persistence design.

## Closure

Phase 14.7 passed deterministic product/integration gates plus authenticated
visual QA at 375px, 768px, and 1440px in light and dark themes. The exact next
global boundary is **Phase 14.8 — Production Infrastructure and Release
Readiness**. Twilio messaging and other paid/mutating communication operations
remain separately deferred.
