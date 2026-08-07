# PROVISIONING GUIDE — AI Growth Platform

## 1. Prerequisites

| Service | Required? | Purpose |
|---------|-----------|---------|
| GitHub account | Yes | Source code hosting |
| Node.js ≥ 20 | Yes | Local development |
| npm | Yes | Package management |
| Supabase account | Yes | Database, Auth, RLS |
| Vercel account | Yes | Application hosting |
| OpenAI account | Yes | AI lead qualification |
| n8n instance | Yes | Workflow automation |
| HubSpot account | Optional (1 of 2) | CRM sync |
| GoHighLevel account | Optional (1 of 2) | CRM sync |
| Slack workspace | Optional | HOT lead notifications |

**Minimum production setup:** Supabase + Vercel + OpenAI + n8n + one CRM.

---

## 2. Supabase Setup

### 2.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Set project name: `ai-growth-platform`
3. Set database password (save securely)
4. Choose region closest to your users
5. Wait for project creation (~2 minutes)

### 2.2 Get Keys

From Supabase Dashboard → Settings → API:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (SECRET — never expose)

### 2.3 Configure Auth

Supabase Dashboard → Authentication → Settings:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/auth/callback`
- Enable **Email provider** (no additional config needed for dev)

### 2.4 Apply Migrations

Connect Supabase CLI or use SQL Editor:

```sql
-- Run each migration file in order:
-- 00001_initial_schema.sql
-- 00002_rls_policies.sql
-- 00003_rls_hardening.sql
-- 00004_onboarding_function.sql
-- 00005_query_indexes.sql
-- 00006_source_api_keys.sql
-- 00007_lead_source_external_id.sql
-- 00008_automation_executions.sql
-- 00009_executions_policy_fix.sql
```

Verify using CLI:
```bash
supabase db push
```

### 2.5 Verify Tables

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Expected: 11 tables (profiles, organizations, memberships, workspaces, leads, pipelines, pipeline_stages, conversations, automations, integrations, source_api_keys, automation_executions)

### 2.6 Verify RLS

```sql
SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=true;
```

All business tables should be listed.

### 2.7 Verify Functions

```sql
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
```

Expected: `is_org_member`, `handle_new_user`, `update_updated_at`, `onboard_user`

### 2.8 Create First User

1. Visit your app's `/signup` page
2. Fill the signup form
3. Check email for confirmation link
4. Click link → redirected to `/dashboard`

Onboarding auto-creates: profile, organization (owner membership), default workspace.

### 2.9 Verify Onboarding

```sql
SELECT * FROM public.organizations;
SELECT * FROM public.memberships;
SELECT * FROM public.workspaces;
```

Should show one row each, linked to your user.

---

## 3. Vercel Setup

### 3.1 Import Project

1. Go to [vercel.com](https://vercel.com) → Import
2. Select your GitHub repository
3. Framework: Next.js (auto-detected)
4. Build command: `next build` (auto-detected)
5. Output directory: `.next` (auto-detected)

### 3.2 Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

| Variable | Source | Secret? |
|----------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | No (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | No (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | YES |
| `OPENAI_API_KEY` | OpenAI API key | YES |
| `OPENAI_MODEL` | `gpt-4o-mini` | No |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | No |
| `NEXT_PUBLIC_APP_ENV` | `production` | No |
| `N8N_WEBHOOK_URL` | From n8n setup (step 4) | YES |
| `N8N_WEBHOOK_SECRET` | Random string (step 4) | YES |
| `N8N_INTERNAL_SECRET` | Random string (step 4) | YES |
| `RATE_LIMITER` | `memory` | No |

### 3.3 Deploy

Click **Deploy**. After deployment, visit the production URL.

### 3.4 Verify

1. Landing page loads
2. `/signup` works
3. Create test account → redirected to dashboard
4. Dashboard loads with "No leads yet" state

### 3.5 Configure Supabase Auth URLs

Go back to Supabase Auth settings and update:
- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/auth/callback`

---

## 4. OpenAI Setup

### 4.1 Get API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create new secret key
3. Copy the key (shown once)

### 4.2 Configure

Set in Vercel environment variables:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### 4.3 Verify

Test from Lead Detail page → "AI Qualify Lead" button. Should return score 0-100 with summary.

---

## 5. n8n Setup

### 5.1 Deploy n8n

Option A — n8n Cloud: [app.n8n.cloud](https://app.n8n.cloud)
Option B — Self-hosted: [docs.n8n.io/hosting](https://docs.n8n.io/hosting/)

### 5.2 Generate Secrets

```bash
# Generate random secrets (run once, save securely)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run twice — you need:
- `N8N_WEBHOOK_SECRET` — HMAC signing between app → n8n
- `N8N_INTERNAL_SECRET` — HMAC signing between n8n → app

### 5.3 Configure App Env Vars

Set in Vercel:
```
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook/lead-automation
N8N_WEBHOOK_SECRET=<first-generated-secret>
N8N_INTERNAL_SECRET=<second-generated-secret>
```

### 5.4 Import Workflow

1. In n8n, go to Workflows → Import from File
2. Select `docs/n8n/lead-automation-workflow.json`
3. Set environment variables in n8n:
   - `APP_URL` = `https://your-app.vercel.app`
   - `N8N_WEBHOOK_SECRET` = same as above
   - `N8N_INTERNAL_SECRET` = same as above

### 5.5 Configure CRM Credentials (in n8n)

In the imported workflow, set n8n environment variables:
- `HUBSPOT_ACCESS_TOKEN` — if using HubSpot
- `SLACK_WEBHOOK_URL` — if using Slack

### 5.6 Activate

Click **Active** toggle in n8n workflow editor.

### 5.7 Find Webhook URL

In the activated workflow, click the Webhook node → Production URL.

This is your `N8N_WEBHOOK_URL` for the app's environment variables.

### 5.8 HMAC Flow

```
App sends lead.created event
  → X-Signature = HMAC-SHA256(body, N8N_WEBHOOK_SECRET)
  → n8n verifies X-Signature matches

n8n calls internal qualify endpoint
  → X-Internal-Signature = HMAC-SHA256(request_url, N8N_INTERNAL_SECRET)
  → App verifies signature with timing-safe comparison
```

---

## 6. HubSpot Setup

### 6.1 Create Private App

1. HubSpot → Settings → Integrations → Private Apps
2. Create private app
3. Scopes: `crm.objects.contacts.write`, `crm.objects.contacts.read`
4. Copy access token

### 6.2 Create Custom Properties

HubSpot → Settings → Properties → Contacts → Create:
- `ai_score__c` (Number)
- `lead_temperature__c` (Single-line text)

### 6.3 Connect

1. Your app → Settings → Integrations → HubSpot → Connect
2. Paste access token
3. Click **Test Connection**
4. Should show "Connection successful"

### 6.4 Verify

Create a test lead via the API. Check HubSpot for the contact.

---

## 7. GoHighLevel Setup (Optional)

### 7.1 Get Credentials

1. GHL → Settings → API Key
2. Copy API key and Location ID

### 7.2 Connect

1. Your app → Settings → Integrations → GoHighLevel → Connect
2. Enter API key + Location ID
3. Click **Test Connection**

**⚠️ API Version Note:** The provider uses `rest.gohighlevel.com/v1`. Verify against current GHL API docs before production.

---

## 8. Slack Setup (Optional)

### 8.1 Create Webhook

1. Slack → Apps → Incoming Webhooks
2. Add to workspace → select channel
3. Copy webhook URL

### 8.2 Connect

1. Your app → Settings → Integrations → Slack → Connect
2. Paste webhook URL
3. Click **Test Connection**

### 8.3 Verify

Create a HOT lead (score ≥ 80). Check Slack channel for notification.

---

## 9. Production API Key

### 9.1 Create

1. Your app → Settings → API Keys → Create Key
2. Label: `Production Lead Intake`
3. Source: `website` (or `tally`/`n8n`/`api`)
4. Click **Generate Key**

### 9.2 Save Raw Key

The raw key (`ag_live_...`) is shown **exactly once**. Copy it to a secure location. It will not be shown again.

### 9.3 Test

```bash
# NEVER hardcode the key in scripts. Use env vars.
export LEAD_API_KEY="ag_live_..."

curl -X POST "https://your-app.vercel.app/api/leads" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $LEAD_API_KEY" \
  -d '{
    "name": "E2E Test Lead",
    "email": "test@example.com",
    "company": "Production Test",
    "message": "Production E2E validation",
    "source_id": "unique-001"
  }'
```

Expected: `201 Created` with `{"success": true, "lead": {...}, "qualification": {"status": "not_started"}}`

---

## 10. First Live E2E Test

1. Open production URL → `/signup` → create account
2. Confirm email → redirected to dashboard
3. Settings → Integrations → HubSpot → Connect → Test
4. Settings → Integrations → Slack → Connect → Test
5. Settings → API Keys → Create → copy raw key
6. Run curl command from step 9.3
7. Check dashboard `/leads` — lead should appear
8. Click lead → "AI Qualify Lead" — should return score + summary
9. Check n8n execution history — workflow should show success
10. Check HubSpot — contact should exist
11. If HOT (score ≥ 80), check Slack — notification should exist
12. Check `/automation` — execution records should show all steps
13. Run same curl again — should return 200 (idempotent)
14. Check HubSpot — no duplicate contact
15. Check `/analytics` — metrics should reflect the data

---

## 11. Failure Test

1. Settings → Integrations → HubSpot → Disconnect
2. Send a test lead
3. Lead should still be created (201)
4. `/automation` should show failed HubSpot sync
5. Settings → Integrations → HubSpot → Reconnect
6. Retry processor should recover the execution
7. HubSpot contact should now exist

---

## 12. Tenant Isolation Test

1. Create two separate user accounts (Org A and Org B)
2. In Org A: Settings → API Keys → create key A
3. In Org B: Settings → API Keys → create key B
4. Send lead with key A → verify only visible in Org A dashboard
5. Send lead with key B → verify only visible in Org B dashboard
6. Verify Org A cannot see Org B's integrations, automations, or API keys

---

## 13. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Signup fails | Supabase Auth not configured | Check Site URL + Redirect URLs in Supabase Auth settings |
| 401 on /api/leads | Invalid or revoked API key | Settings → API Keys → verify key is active |
| Lead created but no n8n execution | N8N_WEBHOOK_URL incorrect | Verify env var + check n8n workflow is active |
| AI qualification fails | OPENAI_API_KEY missing/invalid | Check Vercel env vars + OpenAI dashboard |
| HubSpot sync fails | Token expired or wrong scopes | Re-create HubSpot private app with contacts scope |
| Slack notification not received | Wrong webhook URL or channel | Re-create Slack webhook |
| Retry processor doesn't run | No scheduler configured | Set up Vercel Cron or n8n schedule |
| Cross-org data visible | RLS not enabled | Run migration 00002 + verify with `SELECT tablename FROM pg_tables WHERE rowsecurity=true` |

---

## 14. Environment Matrix

| Variable | Local | Vercel | n8n | Secret |
|----------|-------|--------|-----|--------|
| NEXT_PUBLIC_SUPABASE_URL | .env | ✓ | — | No |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | .env | ✓ | — | No |
| SUPABASE_SERVICE_ROLE_KEY | .env | ✓ | — | YES |
| OPENAI_API_KEY | .env | ✓ | — | YES |
| OPENAI_MODEL | .env | ✓ | — | No |
| NEXT_PUBLIC_APP_URL | .env | ✓ | — | No |
| NEXT_PUBLIC_APP_ENV | .env | ✓ | — | No |
| N8N_WEBHOOK_URL | .env | ✓ | — | YES |
| N8N_WEBHOOK_SECRET | .env | ✓ | ✓ | YES |
| N8N_INTERNAL_SECRET | .env | ✓ | ✓ | YES |
| RATE_LIMITER | .env | ✓ | — | No |
| REDIS_URL | .env | ✓ | — | YES |

---

## 15. Production Go-Live Checklist

### Infrastructure
- [ ] Supabase project created
- [ ] All 9 migrations applied
- [ ] Auth configured (Site URL + Redirect URLs)
- [ ] Vercel deployed
- [ ] All 12 env vars configured

### AI
- [ ] OpenAI key configured
- [ ] Model set to gpt-4o-mini
- [ ] Qualification tested via dashboard button

### Automation
- [ ] n8n deployed
- [ ] Workflow imported and activated
- [ ] Webhook URL configured in app env
- [ ] HMAC secrets match on both sides

### CRM
- [ ] HubSpot (or GHL) connected via Settings UI
- [ ] Connection test passed
- [ ] Contact sync verified
- [ ] Duplicate prevention verified

### Notifications
- [ ] Slack connected (optional)
- [ ] HOT lead notification verified

### Security
- [ ] API key created, raw key stored securely
- [ ] RLS verified on all tables
- [ ] Tenant isolation verified (2 orgs)
- [ ] No secrets in git or browser

### Reliability
- [ ] Retry scheduler configured
- [ ] Failure test passed
- [ ] Rate limiter decision documented

### Final
- [ ] Complete E2E flow succeeded (lead → n8n → AI → CRM → Slack)
- [ ] Idempotency verified (duplicate source_id → 200)
- [ ] Dashboard displays real data
- [ ] Automation Activity page shows execution history
