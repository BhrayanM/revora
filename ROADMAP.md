# AI Growth Roadmap

**Current checkpoint:** Pre-Phase 14.4D documentation sync (2026-08-08)

This roadmap reflects the repository's Supabase-based implementation. Earlier
Prisma and NextAuth planning is historical only and is not the current
architecture.

## Completed Foundation and Product Delivery

- **Phases 0-3.5 - Foundation, design system, landing, and dashboard UI**
  - Next.js App Router, TypeScript, Tailwind CSS, reusable UI primitives,
    responsive public landing, and dashboard shell.
- **Phases 4.1-4.6 - Supabase foundation and CRM data layer**
  - Supabase Auth/SSR, PostgreSQL schema, organizations, memberships,
    workspaces, pipelines, leads, server data access, and RLS tenant isolation.
- **Phases 5-6.1 - AI, ingestion, CRM, automation, and hardening**
  - OpenAI qualification architecture, authenticated lead intake, n8n event
    emission, HubSpot/GoHighLevel provider adapters, Slack notifications,
    automation execution/retry support, and security hardening.
- **Phases 7-13 - SaaS UI, validation, deployment preparation, and runbooks**
  - Production UI, validation artifacts, provisioning guidance, and deployment
    documentation. External-service configuration remains a separate follow-up.

## Completed Phase 14.4 Work

### Phase 14.4B - Security, Authentication, and Legal Consent - Complete

- Email/password authentication, email OTP verification UI, secure password
  recovery, secure email change, session management, and Account Security
  Center.
- Google and Microsoft OAuth with PKCE; Apple is intentionally visible as a
  deferred provider.
- Cloudflare Turnstile on login, signup, and password recovery with
  production fail-closed behavior.
- Native Supabase TOTP MFA with AAL2 enforcement for protected dashboard
  access and sensitive MFA unenrollment.
- Service-role-only onboarding RPC, safe redirects, Supabase SSR cookies, and
  organization-scoped RLS hardening.
- Versioned Terms, Privacy, and optional marketing consent. Migration 00017
  is deployed; the current legal renderer reads the authoritative effective
  date from the versioned legal-document record.

### Phase 14.4C - Auth Visual Polish - Complete

- Shared responsive auth shell, form/status patterns, OAuth presentation, and
  accessible focus, loading, and validation states.

### Phase 14.4C.1 - Global Theme System - Complete

- System-default Light/Dark preference with local persistence, OS preference
  tracking, semantic theme tokens, Settings appearance controls, and TopNav
  quick control.

### Phase 14.4C.1A - Final Visual and UX Corrective Pass - Complete

- Corrected theme-init placement, legal-consent disabled state, landing
  timeline layering, CTA/branding consistency, responsive auth presentation,
  Turnstile presentation, and dark-mode secondary-text contrast.

## Next - Phase 14.4D: Team Management + Invitations + RBAC

Implement organization members, invitations, roles, permissions, membership
lifecycle controls, seat-limit-ready structure, and a basic audit trail. This
phase requires a new forward migration and explicit product/security decisions
before implementation. It must preserve current signup, onboarding, consent,
MFA, RLS, and tenant-isolation behavior.

## After 14.4D - Phase 14.5: Core CRM Live Test

Run the planned live CRM validation after Team Management is complete and its
authorization model is verified. Do not start Phase 14.5 before Phase 14.4D.

## Later Planned Phases

- **Phase 14.6 - OpenAI Live Qualification**
- **Phase 14.7 - Production Infrastructure** (Vercel, SMTP, Redis)
- **Phase 14.8 - n8n + Webhook Security Hardening**
- **Phase 14.9 - HubSpot Live**
- **Phase 14.10 - Slack Live**

## Deferred / Enterprise

- SAML SSO, SCIM, IP allowlists, enterprise compliance, and dedicated
  environments.
- Customer portal work remains a separate future application concern.
- Do not reintroduce custom MFA recovery codes without a valid Supabase AAL2
  recovery design.

## Roadmap Guardrails

- Migrations 00001 through 00017 are immutable. New database work must use a
  new migration number.
- Keep Supabase RLS and organization isolation authoritative; UI state is not
  authorization.
- Do not expose service-role credentials or weaken PKCE, MFA/AAL2, Turnstile,
  legal-consent, or onboarding safeguards.
- Do not push local checkpoints without explicit authorization.
