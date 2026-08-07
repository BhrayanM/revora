# DEPLOYMENT GUIDE — AI Growth Platform

## Architecture

```
┌─────────────────────────────────────────────┐
│  Vercel / Docker                             │
│  ┌───────────────────────────────────────┐   │
│  │  Next.js 16 App Router                │   │
│  │  ├─ Server Components (RSC)           │   │
│  │  ├─ Server Actions                    │   │
│  │  ├─ API Routes (/api/leads, /internal)│   │
│  │  ├─ Proxy (auth middleware)           │   │
│  │  └─ UI (React 19 + Tailwind v4)       │   │
│  └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  Supabase    │    │  n8n         │
│  ├─ Auth     │    │  ├─ Webhook  │
│  ├─ DB (PG)  │    │  ├─ HMAC     │
│  ├─ RLS      │    │  ├─ HTTP     │
│  └─ Realtime │    │  └─ Slack    │
└──────────────┘    └──────────────┘
        │                    │
        ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  OpenAI      │    │  CRM         │
│  gpt-4o-mini │    │  ├─ HubSpot  │
└──────────────┘    │  └─ GHL      │
                    └──────────────┘
```

## Environment Variables

### Application (public)
```
NEXT_PUBLIC_APP_URL=https://app.example.com
NEXT_PUBLIC_APP_NAME=AI Growth Platform
NEXT_PUBLIC_APP_ENV=production
```

### Supabase (1 public + 1 secret)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...       # SERVER-ONLY
```

### OpenAI (server-only)
```
OPENAI_API_KEY=sk-...                  # SERVER-ONLY
OPENAI_MODEL=gpt-4o-mini
```

### n8n (server-only)
```
N8N_WEBHOOK_URL=https://n8n.example.com/webhook/lead-automation
N8N_WEBHOOK_SECRET=<random-string>    # HMAC signing secret
N8N_INTERNAL_SECRET=<random-string>   # Internal API auth
```

### Rate Limiter (optional)
```
RATE_LIMITER=memory                   # memory | redis
REDIS_URL=redis://...                 # Only if RATE_LIMITER=redis
```

## Database Setup

1. Create Supabase project
2. Run all 9 migrations in order (00001–00009):
   ```bash
   supabase db push
   ```
3. Verify RLS is enabled:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;
   ```
4. Verify auth settings:
   - Email auth enabled
   - Site URL set
   - Redirect URLs configured

## n8n Setup

1. Import `docs/n8n/lead-automation-workflow.json`
2. Configure environment variables in n8n:
   - `APP_URL` — your Next.js deployment URL
   - `N8N_WEBHOOK_SECRET` — shared HMAC secret
   - `N8N_INTERNAL_SECRET` — shared internal secret
   - `HUBSPOT_ACCESS_TOKEN` — optional
   - `SLACK_WEBHOOK_URL` — optional
3. Activate workflow
4. Configure `N8N_WEBHOOK_URL` in your app's `.env`

## CRM Setup

### HubSpot
1. Create private app with `contacts` scope
2. Create custom properties: `ai_score__c` (number), `lead_temperature__c` (text)
3. Store access token in `integrations` table per organization

### GoHighLevel
1. Get API key and Location ID from GHL dashboard
2. Store in `integrations` table per organization

### Slack
1. Create incoming webhook
2. Store webhook URL in `integrations` table per organization

## Deployment (Vercel)

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard.

## Deployment (Docker)

```bash
docker build -t ai-growth-platform .
docker run -p 3000:3000 --env-file .env ai-growth-platform
```

## Smoke Tests

After deployment:

1. Visit landing page `/`
2. Sign up via `/signup`
3. Confirm email → auto-onboarding
4. Dashboard loads with empty state
5. Create API key in Settings → API Keys
6. POST lead to `/api/leads` with API key
7. Lead appears in dashboard
8. AI qualify lead from detail page
9. Integration connect/test works

## Known Production Limitations

1. **Retry processor** requires external scheduling (cron/Vercel Cron/n8n scheduler)
2. **Rate limiter** is in-memory — single-instance only. Use Redis/Upstash for multi-instance
3. **Slack notifications** may produce duplicates on n8n retry (not idempotent at Slack level)
4. **GoHighLevel API** uses `rest.gohighlevel.com/v1` — verify against current GHL API docs
