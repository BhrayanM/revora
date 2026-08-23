# Phase 14.8H - Deployment Readiness

## Overview
This document serves as the master checklist to take Revora from **PRE-PRODUCTION COMPLETE** to **PRODUCTION ACTIVE** when the first client is acquired. Following these steps converts a local repository into a highly available, robustly configured production application.

## Minimum Cost Architecture Recommendation
- **Hosting:** Vercel (Hobby to start, Pro when traffic dictates) or Docker Compose on a $5/mo VPS.
- **Database / Auth:** Supabase (Pro Plan for point-in-time recovery and larger limits).
- **Automation:** n8n (Self-hosted on same VPS or n8n Cloud Starter).
- **Domain:** Namecheap / Cloudflare.
- **CDN / DNS:** Cloudflare (Free tier).

## READY_FOR_ACTIVATION_AFTER_FIRST_CLIENT Checklist

### 1. Infrastructure Provisioning
- [ ] Purchase domain.
- [ ] Connect domain to Cloudflare (enable strict SSL).
- [ ] Provision Vercel project linked to GitHub repository.
- [ ] Provision Supabase Pro project.

### 2. Environment Configuration
- [ ] Run `npm run verify:env` locally (with `.env.local` populated with production values) to generate a validation report.
- [ ] Inject all required environment variables (from `docs/PRODUCTION_ENVIRONMENT.md`) into Vercel Project Settings.
- [ ] Ensure `ALLOW_INSECURE_INTEGRATION_WEBHOOKS` is not set or set to `false`.

### 3. Database Activation
- [ ] Obtain the Supabase connection string.
- [ ] Run `npm run supabase migration up` pointing to the production database to apply schemas `00001` through `00035+`.
- [ ] Validate Row Level Security (RLS) is active on all public tables via Supabase Studio.
- [ ] Verify `source_api_keys` have been properly seeded for the first client.

### 4. Background Jobs & Automation (n8n)
- [ ] Deploy n8n via Docker Compose (using provided `docker-compose.yml`) or provision n8n Cloud.
- [ ] Import workflows from `docs/workflows/` (if any are stored as JSON).
- [ ] Set up n8n webhook URLs in Vercel environment variables.

### 5. DNS & SSL Requirements
- [ ] Add Vercel CNAME records in Cloudflare.
- [ ] Add SPF, DKIM, and DMARC records for transactional emails (via Resend/Supabase Auth).

### 6. OAuth Callback Checklist
- [ ] Register Google Workspace App and set callback to `https://<domain>/api/integrations/google-workspace/callback`.
- [ ] Register Slack App and set callback to `https://<domain>/api/integrations/slack/callback`.
- [ ] Register HubSpot App and set callback to `https://<domain>/api/integrations/hubspot/callback`.
- [ ] Update these Client IDs and Secrets in Vercel Environment Variables.

### 7. Observability & Rate Limiting Activation
- [ ] Verify stdout JSON structured logging is parsing correctly in Vercel Logs.
- [ ] Provision an Upstash Redis database (Free tier).
- [ ] Inject `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to Vercel to activate distributed rate limiting.
- [ ] Verify rate limiter fallback logic triggers if Upstash is temporarily unreachable.

### 8. Backup Activation
- [ ] Verify Supabase Point-in-Time Recovery (PITR) is enabled.
- [ ] Schedule `scripts/backup-db.mjs` on a GitHub Actions cron job using a service role key.

### 9. Startup Contract & Healthcheck
- [ ] Trigger Vercel Deployment.
- [ ] Verify `output: standalone` builds successfully.
- [ ] Ping `/` and verify `<title>Revora</title>` (or equivalent) loads.
- [ ] Attempt a signup flow to verify Supabase Auth connectivity.

## Rollback Procedure
If the initial deployment fails:
1. Revert the Vercel deployment to the previous commit (N/A for first deploy).
2. If database migrations failed, DO NOT migrate down. Create a new migration forward or restore from the blank state since there is no production data yet.
3. Review `logger.error` output in Vercel Logs.
