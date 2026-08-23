# Revora — Production & Deployment Environment Contract

**Status:** PRE-PRODUCTION COMPLETE · DEMO READY · SALES READY  
**Budget Strategy:** $0 Additional Budget until First Paying Client  
**Next Activation Stage:** Phase 14.9 — Production Activation (`READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT`)

---

## 1. Executive Strategy

Revora / AI Growth Platform is architecturally complete, locally verified, and packaged for immediate deployment. To maximize capital efficiency, all systems are prepared for zero-cost operation (demo/sales mode) using local mocks, free tiers, and deterministic contracts.

Items that strictly require financial commitments (custom domains, Supabase Pro with PITR, paid transactional SMTP, live Twilio phone numbers) are cataloged as `READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT`.

---

## 2. Environment Variable Matrix

| Variable | Scope | Classification | Dev / Demo Default | CI Setting | Production ($0 / Free Tier) | Activation after 1st Client |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public | **Required** | `http://localhost:3000` | `https://placeholder.example.com` | `https://your-free-subdomain.vercel.app` | `https://app.customdomain.com` |
| `NEXT_PUBLIC_APP_NAME` | Public | Optional | `Revora` | `Revora` | `Revora` | Custom White-label Name |
| `NEXT_PUBLIC_APP_ENV` | Public | Optional | `development` | `production` | `production` | `production` |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | **Required** | `https://<dev-ref>.supabase.co` | `https://placeholder.supabase.co` | Supabase Free Tier URL | Supabase Pro Tier URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | **Required** | `eyJ...` (Anon Key) | `placeholder-anon-key-for-ci` | Supabase Free Anon Key | Supabase Pro Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | **Required (Runtime)** | `eyJ...` (Service Role) | Not required for static checks | Supabase Free Service Key | Supabase Pro Service Key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public | Optional (Dev) | `1x00000000000000000000AA` | `1x00000000000000000000AA` | Cloudflare Free Site Key | Cloudflare Site Key |
| `NEXT_PUBLIC_OAUTH_PROVIDERS` | Public | Optional | `google` | `google` | `google` | `google,apple,azure` |
| `OPENAI_API_KEY` | Server | **Required for AI** | Sandbox / Eval key | Not required for static tests | OpenAI Usage-capped API Key | Production OpenAI Tier |
| `OPENAI_MODEL` | Server | Optional | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o-mini` | `gpt-4o` |
| `AUTOMATION_RETRY_SECRET` | Server | **Required (Worker)** | 32+ char secret | Not required for static tests | 32+ char secret | 32+ char secret |
| `INTEGRATION_ENCRYPTION_KEY` | Server | Recommended | Unset (SHA-256 fallback) | Not required for static tests | `openssl rand -hex 32` (64 hex) | `openssl rand -hex 32` |
| `ALLOW_INSECURE_INTEGRATION_WEBHOOKS` | Server | Security Guard | `false` (or `true` for local HTTP) | `false` | `false` (enforced) | `false` |
| `RATE_LIMITER` | Server | Optional | `memory` | `memory` | `memory` / Upstash Free | Upstash Redis |
| `REDIS_URL` | Server | Optional | Unset | Unset | Upstash Free Redis URL | Upstash Redis URL |
| `SLACK_*` (OAuth) | Server | Provider-scoped | Dev Slack App | Not required | Free Slack App credentials | Production Slack App |
| `HUBSPOT_*` (OAuth) | Server | Provider-scoped | Free Developer Portal App | Not required | Free Developer App credentials | Production App |
| `GHL_*` (OAuth) | Server | Provider-scoped | Free Marketplace Dev App | Not required | Free Dev App credentials | Production Marketplace App |
| `GOOGLE_WORKSPACE_*` | Server | Provider-scoped | Google Cloud Free Project | Not required | Free OAuth App credentials | Production OAuth Verified App |

---

## 3. Operational Modes

### A. Local Development & Demo Mode ($0)
- Application runs via `npm run dev` or `Dockerfile.dev`.
- Connected to Supabase Free Tier or local development project.
- AI qualification uses `gpt-4o-mini` (fractions of a cent per evaluation).
- Inbound leads testable via `POST /api/leads` using local API keys.
- Demo accounts and workspaces provisioned via database seed scripts.

### B. CI / Quality Gate Mode ($0)
- Executed on GitHub Actions (public/free runner allowance).
- 100% deterministic: uses placeholder public URLs, mock Turnstile keys, and offline structural asserts.
- Zero network calls to external APIs; zero leak potential.

### C. Pre-Production Deployment ($0 / Free Tier)
- Next.js application hosted on Vercel Hobby / Render Free / Self-hosted Docker container.
- Database & Auth on Supabase Free Plan (500MB database, 50,000 MAU, free SSL & RLS).
- Rate limiting uses in-memory or Upstash Redis Free Tier (10,000 commands/day free).
- Turnstile anti-bot on Cloudflare Free Plan.

---

## 4. `READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT` Runbook

The following actions are deferred until contract signing with the first client:

```
[ ] Step 1: Purchase and configure custom domain (e.g. app.revora.com) with DNS records.
[ ] Step 2: Upgrade Supabase project to Pro Plan ($25/mo) for Point-In-Time-Recovery (PITR) & daily backups.
[ ] Step 3: Register production OAuth redirect URIs with HubSpot, GoHighLevel, Slack, and Google Workspace.
[ ] Step 4: Configure transactional email provider (Resend / Brevo) with custom sending domain.
[ ] Step 5: Verify production SSL certificate and enable HTTP Strict Transport Security (HSTS).
[ ] Step 6: Execute live provider mutation regression suite.
```

---

## 5. Security & Isolation Invariants

1. **No Client-Side Secrets**: All `NEXT_PUBLIC_*` variables are strictly audited. They contain only URLs, anon keys gated by Postgres RLS, public branding, and client-side Turnstile site keys.
2. **Server Boundary Protection**: Service role keys, encryption keys, and OAuth client secrets are guarded with `import "server-only"` and will never be bundled into browser client assets.
3. **Multi-Tenant Isolation**: Row Level Security (RLS) is active on 100% of business tables, partitioned strictly by `organization_id`.
