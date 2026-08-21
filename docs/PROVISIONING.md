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
| Twilio account | Optional | Read-only account/source-number validation |

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

Apply every immutable migration in `supabase/migrations` in numeric order,
currently `00001` through `00034`. Never edit a migration already applied to a
linked environment.

Verify using CLI:
```bash
supabase db push
```

### 2.5 Verify Tables

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

Confirm the expected CRM, organization, automation, integration, invitation,
ownership-transfer, and legal-consent tables are present.

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
| `NEXT_PUBLIC_APP_URL` | Externally reachable `https://your-app.vercel.app` origin | No |
| `NEXT_PUBLIC_APP_ENV` | `production` | No |
| `AUTOMATION_RETRY_SECRET` | Random value, at least 32 characters | YES |
| `INTEGRATION_ENCRYPTION_KEY` | 32 random bytes encoded as 64 hex characters | YES |
| `ALLOW_INSECURE_INTEGRATION_WEBHOOKS` | `false` | No |
| `RATE_LIMITER` | `memory` | No |
| `SLACK_CLIENT_ID` | Slack app client ID | No |
| `SLACK_CLIENT_SECRET` | Slack app client secret | YES |
| `SLACK_REDIRECT_URI` | `https://your-app.vercel.app/api/integrations/slack/callback` | No |

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

### 5.2 Generate the Header Auth Secret

```bash
# Generate one organization-specific secret and save it securely
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This value is entered only in n8n's Header Auth credential and the matching
organization's Revora integration form. It is encrypted before Revora stores
it and is not an application environment variable.

### 5.3 Configure the Retry Worker

Set a separate random value in Vercel:
```
AUTOMATION_RETRY_SECRET=<random-value-at-least-32-characters>
```

Configure the scheduler to POST to `/api/internal/integrations/retries` with
`Authorization: Bearer <AUTOMATION_RETRY_SECRET>`. Never reuse the n8n Header
Auth secret for the worker.

### 5.4 Import Workflow

1. In n8n, go to Workflows → Import from File
2. Select `docs/n8n/lead-automation-workflow.json`
3. Create a Header Auth credential:
   - Header name: `X-Revora-Webhook-Secret`
   - Header value: the organization-specific secret from step 5.2
4. Attach it to the **Revora Webhook** node.

### 5.5 Preserve Provider Boundaries

Do not add HubSpot, GoHighLevel, Slack, or other Revora provider credentials to
n8n. Revora owns CRM synchronization; the imported workflow validates and
acknowledges Revora events only.

### 5.6 Activate

Click **Active** toggle in n8n workflow editor.

### 5.7 Find Webhook URL

In the activated workflow, click the Webhook node → Production URL.

In Revora, open **Settings → Integrations → n8n** and enter this production
URL plus the same Header Auth secret. Use **Test** after connecting.

### 5.8 Authentication Flow

```
Revora sends integration.test, lead.created, or lead.updated
  → X-Revora-Webhook-Secret = organization-specific secret
  → n8n Header Auth performs exact credential validation before workflow code
  → workflow validates the versioned event and acknowledges it
```

---

## 6. HubSpot Setup

### 6.1 Create OAuth App

1. HubSpot Developer Account → Apps → Create app.
2. Add scopes `crm.objects.contacts.read` and
   `crm.objects.contacts.write`.
3. Register redirect URL
   `https://your-app.vercel.app/api/integrations/hubspot/callback`.
4. Configure `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, and
   `HUBSPOT_REDIRECT_URI` as server variables.

### 6.2 Create Custom Properties

HubSpot → Settings → Properties → Contacts → Create:
- `ai_score__c` (Number)
- `lead_temperature__c` (Single-line text)

### 6.3 Connect

1. Your app → Settings → Integrations → HubSpot → Connect
2. Approve the OAuth consent screen.
3. Click **Test**.
4. Confirm "Connection successful".

### 6.4 Verify

Create a test lead via the API. Check HubSpot for the contact.

---

## 7. GoHighLevel Setup (Optional)

### 7.1 Create Marketplace OAuth App

1. GoHighLevel Marketplace → Apps → create or reuse the Revora app.
2. Configure `contacts.readonly`, `contacts.write`, and `locations.readonly`.
3. Register redirect URL
   `https://your-app.vercel.app/api/integrations/crm/callback`.
4. Configure `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`, and the
   test-only `GHL_APP_VERSION_ID` when using a draft version.

### 7.2 Connect

1. Your app → Settings → Integrations → GoHighLevel → Connect
2. Select and authorize the intended location.
3. Click **Test**.

---

## 8. Slack Setup (Optional)

### 8.1 Create OAuth App

1. Slack API → Your Apps → Create New App.
2. OAuth & Permissions → add bot scope `incoming-webhook`.
3. Add redirect URL
   `https://your-app.vercel.app/api/integrations/slack/callback`.
4. Configure server-only `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and
   `SLACK_REDIRECT_URI`.

### 8.2 Connect

1. Your app → Settings → Integrations → Slack → Connect
2. Authorize the workspace and select the alert channel.
3. Click **Test** and verify one integration-test message.

### 8.3 Verify

Qualify one HOT lead (score ≥ 80) and verify exactly one alert. WARM and COLD
must produce no Slack alert. Slack delivery failure must not roll back the
persisted qualification.

## 8A. Twilio Setup (Optional, Read-Only)

1. Open Settings → Integrations → Twilio → Connect.
2. Enter Account SID, Auth Token, and an optional source number in E.164.
3. Revora validates the account with `GET Accounts/{SID}.json` and, when a
   number is present, verifies ownership with a filtered `GET` to
   `IncomingPhoneNumbers.json`.
4. Click **Test** to repeat only this read-only validation.

Phase 14.6D does not send SMS or WhatsApp messages, place calls, buy numbers,
or register Twilio callbacks.

## 8B. Tally Setup (Organization-Scoped)

Tally does not use a global application environment variable. An authorized
organization administrator creates an API key in Tally and enters it only in
**Settings → Integrations → Tally**. Never paste the key into chat, source,
screenshots, logs, or documentation.

Prerequisites:

1. Set `NEXT_PUBLIC_APP_URL` to the externally reachable HTTPS Revora origin.
2. Apply migration `00034_phase_14_6e_tally_inbound.sql` to the authorized
   non-production Supabase project before a live test.
3. Create or reuse an open, published Tally form with an email or phone field.

Connect performs only these provider operations:

- `GET /forms?page=1&limit=500`
- `GET /forms/{formId}/questions`
- `POST /webhooks` for the selected `FORM_RESPONSE` subscription

Revora proposes mappings for name, email, phone, company, and message. The
administrator confirms the mapping, including at least email or phone. Revora
then creates the callback automatically at
`/api/integrations/tally/webhook/{routingToken}`; do not copy or persist that
raw URL. The API key and signing secret are encrypted, while only a SHA-256
routing-token hash is stored in safe config.

**Test** is read-only: it fetches the selected form questions and paginates
`GET /webhooks` to verify the stored webhook. **Disconnect** calls
`DELETE /webhooks/{webhookId}`, then disables the local endpoint and clears
encrypted credentials even when provider cleanup cannot be confirmed.

Inbound requests must use `application/json`, stay at or below 1 MiB, and carry
a valid `Tally-Signature` HMAC over the exact body. Valid submissions create one
organization-scoped lead; identical retries return 2xx without duplication,
payload conflicts return 409, and invalid signatures return 401.

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
4. Settings → Integrations → Slack → OAuth Connect → Test (when configured)
5. Settings → Integrations → Tally → Connect → Test (when configured)
6. Submit one unique Tally response and verify exactly one lead
7. Settings → API Keys → Create → copy raw key
8. Run curl command from step 9.3
9. Check dashboard `/leads` — lead should appear
10. Click lead → "AI Qualify Lead" — should return score + summary
11. Check n8n execution history — workflow should show success
10. Check HubSpot — contact should exist
11. If HOT (score ≥ 80), check Slack for exactly one alert; WARM/COLD send none
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
| Lead created but no n8n execution | Integration inactive or production URL incorrect | Test the organization-scoped n8n connection and confirm the workflow is active |
| AI qualification fails | OPENAI_API_KEY missing/invalid | Check Vercel env vars + OpenAI dashboard |
| HubSpot sync fails | Token expired or wrong scopes | Re-create HubSpot private app with contacts scope |
| Slack OAuth cannot start | Missing Slack server variables or redirect mismatch | Configure `SLACK_*` and the exact callback URL |
| Slack notification not received | App disconnected or wrong selected channel | Reconnect Slack and select the intended channel |
| Twilio source number rejected | Number not owned by the account or not E.164 | Verify ownership and use `+<country><number>` |
| Retry processor doesn't run | No scheduler or wrong worker authorization | POST to `/api/internal/integrations/retries` with the configured bearer secret |
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
| AUTOMATION_RETRY_SECRET | .env | ✓ | — | YES |
| INTEGRATION_ENCRYPTION_KEY | .env | ✓ | — | YES |
| ALLOW_INSECURE_INTEGRATION_WEBHOOKS | .env | ✓ | — | No |
| RATE_LIMITER | .env | ✓ | — | No |
| REDIS_URL | .env | ✓ | — | YES |
| SLACK_CLIENT_ID | .env | ✓ | — | No |
| SLACK_CLIENT_SECRET | .env | ✓ | — | YES |
| SLACK_REDIRECT_URI | .env | ✓ | — | No |

---

## 15. Production Go-Live Checklist

### Infrastructure
- [ ] Supabase project created
- [ ] All migrations `00001` through `00034` applied and synchronized
- [ ] Auth configured (Site URL + Redirect URLs)
- [ ] Vercel deployed
- [ ] Required core and provider env vars configured

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
- [ ] WARM/COLD produce no Slack notification
- [ ] Twilio read-only account/number test verified (optional)
- [ ] No Twilio messaging/call operation performed

### Lead Capture
- [ ] Tally API key entered only through the organization integration UI
- [ ] Selected form and field mapping confirmed with email or phone
- [ ] Signed Tally submission creates exactly one organization-scoped lead
- [ ] Identical replay creates no second lead; conflicting replay fails closed
- [ ] Tally Test is read-only and Disconnect disables local ingestion

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
- [ ] n8n `integration.test`, `lead.created`, and `lead.updated` E2E succeeded
- [ ] AI qualification and each configured CRM integration passed its independent E2E
- [ ] Idempotency verified (duplicate source_id → 200)
- [ ] Dashboard displays real data
- [ ] Automation Activity page shows execution history
