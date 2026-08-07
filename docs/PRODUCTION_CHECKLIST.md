# PRODUCTION CHECKLIST — AI Growth Platform

**Last Verified:** 2026-08-07
**Status:** DEMO READY — PRODUCTION CANDIDATE (requires external service configuration)

## Pre-Deployment Verification (Local)

- [x] `npm run build` — 17 routes, zero errors
- [x] `npm run lint` — zero errors
- [x] `npm run typecheck` — zero errors (strict mode)
- [x] `node scripts/verify-crm.mjs` — 5/5 PASS
- [x] Migrations valid (9 files, sequential)
- [x] No `NEXT_PUBLIC_` secrets in source code
- [x] No hardcoded credentials in source
- [x] Zero mock data in active dashboard components
- [x] n8n workflow JSON validates
- [x] `.env` not tracked by git

## Environment Variables

- [ ] `NEXT_PUBLIC_APP_URL` — Application URL
- [ ] `NEXT_PUBLIC_APP_NAME` — Application name
- [ ] `NEXT_PUBLIC_APP_ENV` — Set to `production`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (secret, server-only)
- [ ] `OPENAI_API_KEY` — OpenAI API key (secret, server-only)
- [ ] `OPENAI_MODEL` — Model (default: gpt-4o-mini)
- [ ] `N8N_WEBHOOK_URL` — n8n webhook endpoint URL
- [ ] `N8N_WEBHOOK_SECRET` — Shared secret for HMAC signing
- [ ] `N8N_INTERNAL_SECRET` — Shared secret for internal API auth
- [ ] `HUBSPOT_ACCESS_TOKEN` — HubSpot private app token (stored per org in integrations table)
- [ ] `SLACK_WEBHOOK_URL` — Slack incoming webhook URL (stored per org in integrations table)

## Supabase

- [ ] All 8 migrations applied in order (00001–00008)
- [ ] RLS enabled on all business tables
- [ ] `is_org_member()` function exists with `search_path = ''`
- [ ] `onboard_user()` function exists
- [ ] `handle_new_user()` trigger active
- [ ] `update_updated_at()` trigger active on all mutable tables
- [ ] Service role key stored securely, never in client code

## Authentication

- [ ] Email confirmation enabled in Supabase Auth settings
- [ ] Site URL configured in Supabase Auth settings
- [ ] Redirect URLs configured for callback
- [ ] Rate limiting configured in Supabase Auth settings
- [ ] Proxy/middleware protecting dashboard routes

## API Keys

- [ ] Generate API keys via settings dashboard or SQL
- [ ] Keys follow `ag_live_<random>` format
- [ ] Only SHA-256 hash stored in `source_api_keys`
- [ ] Keys scoped to organization
- [ ] Inactive keys rejected

## n8n Configuration

- [ ] Import workflow from `docs/n8n/lead-automation-workflow.json`
- [ ] Configure environment variables in n8n
- [ ] HMAC secret matches `N8N_WEBHOOK_SECRET`
- [ ] Internal secret matches `N8N_INTERNAL_SECRET`
- [ ] HubSpot access token configured
- [ ] Slack webhook URL configured
- [ ] Test workflow with a sample lead

## CRM Integration

- [ ] HubSpot: Private app created with contacts scope
- [ ] HubSpot: Custom properties created (`ai_score__c`, `lead_temperature__c`)
- [ ] GoHighLevel: API key and location ID configured
- [ ] Credentials stored per organization in `integrations` table
- [ ] Credentials never exposed to browser

## Rate Limiting

- [ ] Production: Redis/Upstash configured for distributed rate limiting
- [ ] Development: In-memory rate limiter active (30 req/min)
- [ ] API rate limiting active on `POST /api/leads`

## Webhook Reliability

- [ ] n8n webhook URL configured
- [ ] HMAC verification active
- [ ] Execution logging enabled (`automation_executions` table)
- [ ] Retry behavior: 5 attempts with exponential backoff
- [ ] Lead creation never blocked by webhook failure

## Monitoring

- [ ] Error logging configured (console.error for now, Sentry recommended)
- [ ] OpenAI token usage tracked in lead metadata
- [ ] Execution failures logged with error messages
- [ ] No secrets in logs

## Deployment

- [ ] Next.js build successful (`npm run build`)
- [ ] TypeScript strict mode — zero errors
- [ ] ESLint — zero errors
- [ ] Prettier — consistent formatting
- [ ] Docker image built and tested
- [ ] Database backups configured in Supabase

## Verification

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] All dashboard pages load without errors
- [ ] Lead creation via API works with valid key
- [ ] Idempotency works (duplicate source_external_id)
- [ ] AI qualification triggers from dashboard
- [ ] Internal qualification endpoint accessible
- [ ] Rate limiting returns 429
- [ ] Invalid API keys return 401
