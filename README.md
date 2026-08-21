# AI Growth

AI Growth is a multi-tenant SaaS application for AI-assisted lead management,
qualification, CRM workflows, and automation. It combines a public product
site with a protected organization dashboard.

## Implemented Stack

| Area | Current implementation |
| --- | --- |
| Framework | Next.js 16.3 App Router, React 19, TypeScript strict mode |
| Styling | Tailwind CSS v4, semantic design tokens, custom CVA components |
| Auth | Supabase Auth with SSR cookies, email/password, PKCE OAuth, TOTP MFA |
| Data | Supabase PostgreSQL, generated types, RLS, SQL migrations 00001-00033 |
| Tenancy | Organizations, memberships, workspaces, organization-scoped data |
| Security | Turnstile, MFA AAL2 enforcement, safe redirects, RLS, legal-consent gates |
| Integrations | HubSpot, GoHighLevel, n8n, Zapier, Make, Slack OAuth/HOT alerts, Twilio read-only validation |

The application does not use Prisma, NextAuth, or Framer Motion. Docker files
remain available for optional local/container workflows; Docker is not required
for the normal Next.js plus Supabase development path.

## Implemented Product Capabilities

- Public landing, Terms, and Privacy pages.
- Dashboard, analytics, leads, lead detail, pipeline, automation, settings,
  profile, and notifications placeholder.
- Organization/workspace/membership data model with Supabase RLS isolation.
- Email/password authentication, Google and Microsoft OAuth, password reset,
  secure email change, Turnstile, and Supabase TOTP MFA with AAL2 enforcement.
- Versioned Terms/Privacy consent, optional marketing consent, authenticated
  re-consent, and server-side consent enforcement before provisioning and
  protected access.
- System, Light, and Dark appearance preferences with local persistence and
  OS preference tracking.

## Integration Status

| Status | Integrations |
| --- | --- |
| Completed and provider-validated | HubSpot, GoHighLevel, n8n, Zapier, Make |
| Implemented and locally validated | Slack OAuth + HOT alerts; Twilio account/source-number validation (read-only) |
| Next | Tally inbound capture (14.6E), Google Calendar + Gmail (14.6F), full E2E audit (14.6G) |
| Deferred | Twilio messaging/calls, Apple OAuth, enterprise SSO/SCIM, customer portal |

Do not treat an adapter or UI panel as proof that an external provider is live.

## Architecture

- `src/app/` - App Router routes, route handlers, and server-rendered dashboard
  pages.
- `src/components/` - UI primitives, public landing, dashboard, auth, theme,
  and legal presentation components.
- `src/lib/auth/` - authenticated user, organization, workspace, and profile
  resolution.
- `src/lib/supabase/` - browser, SSR server, and narrowly scoped service-admin
  clients plus generated database types.
- `src/lib/legal/` - current-document lookup and consent enforcement helpers.
- `src/lib/ai/`, `src/lib/crm/`, `src/lib/automation/`, and
  `src/lib/integrations/` - AI, provider adapters, execution support, and
  organization-scoped event delivery.
- `supabase/migrations/` - immutable sequential migration history.

## Routes

- Public: `/`, `/terms`, `/privacy`.
- Auth: `/login`, `/signup`, `/verify-email`, `/forgot-password`,
  `/reset-password`, `/forgot-email`, `/auth/mfa`, `/auth/email-change`, and
  `/legal/consent`.
- Dashboard: `/dashboard`, `/analytics`, `/leads`, `/pipeline`, `/automation`,
  `/settings`, `/profile`, and `/notifications`.
- API: `/api/leads`, the authenticated automation retry worker at
  `/api/internal/integrations/retries`, and server-side OAuth callbacks for
  HubSpot, GoHighLevel, and Slack.

## Getting Started

1. Install dependencies with `npm install`.
2. Configure local environment variables from `.env.example` without
   committing credentials.
3. Run `npm run dev` and open `http://localhost:3000`.

The linked Supabase project is the source of database and authentication state.
Do not edit applied migration files; create a new migration for future schema
work.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm run format` | Format repository files with Prettier |
| `npm run test:integrations` | Verify automation webhook contracts |
| `npm run test:communications` | Verify Slack and Twilio contracts |

## Current Roadmap Position

Phases 14.4D, 14.5, and 14.6A-14.6D are complete in local history. The next
boundary is **Phase 14.6E - Tally inbound lead capture, signature verification,
and replay-safe deduplication**.

See [PROJECT_STATUS.md](./PROJECT_STATUS.md), [ROADMAP.md](./ROADMAP.md), and
[the Phase 14.6D handoff](./docs/handoffs/PHASE_14.6D_COMPLETION_HANDOFF_2026-08-20.md).

## Security and Change Rules

- Do not weaken Supabase RLS, tenant isolation, PKCE, Turnstile, MFA/AAL2,
  legal-consent enforcement, or service-role boundaries.
- Do not modify migrations 00001 through 00033.
- Never commit secrets, tokens, service-role credentials, webhook secrets, or
  provider credentials.
- Do not push local commits without explicit authorization.

## License

Private - All rights reserved.
