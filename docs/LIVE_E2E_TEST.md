# LIVE E2E TEST REPORT — Phase 9

## Environment Status

| Service | Status | Notes |
|---------|--------|-------|
| Supabase | NOT CONFIGURED | Requires project creation at supabase.com |
| n8n | NOT CONFIGURED | Requires n8n instance (self-hosted or cloud) |
| OpenAI | NOT CONFIGURED | Requires API key at platform.openai.com |
| HubSpot | NOT CONFIGURED | Requires developer account + private app |
| GoHighLevel | NOT CONFIGURED | Requires GHL account + API key |
| Slack | NOT CONFIGURED | Requires workspace + incoming webhook |

## Local Verification (No External Services Required)

| Check | Result | Evidence |
|-------|--------|----------|
| Build | ✅ PASS | 17 routes, zero errors |
| TypeScript | ✅ PASS | Strict mode, zero errors |
| ESLint | ✅ PASS | Zero errors, zero warnings |
| CRM verification | ✅ 5/5 PASS | Types, routing, payload, idempotency, scoping |
| n8n workflow JSON | ✅ VALID | Parses successfully |
| Migrations | ✅ 9 VALID | Sequential order, no broken references |
| Secrets scan | ✅ CLEAN | Zero `NEXT_PUBLIC_` secrets, zero hardcoded keys |
| Mock data | ✅ CLEAN | Zero fake CRM data in active dashboard components |
| Git status | ✅ CLEAN | No uncommitted changes |

## Tests Requiring External Services

Run these after configuring each service. Check off as completed:

### Supabase Setup

- [ ] Create project at supabase.com
- [ ] Push all 9 migrations via `supabase db push`
- [ ] Enable email auth in Supabase Auth settings
- [ ] Set site URL and redirect URLs
- [ ] Get `SUPABASE_SERVICE_ROLE_KEY`

### User Signup Flow

- [ ] Visit `/signup` → create test user
- [ ] Confirm email → redirect to `/dashboard`
- [ ] Verify organization created (check `organizations` table)
- [ ] Verify membership created with `role = owner`
- [ ] Verify workspace created
- [ ] Dashboard loads with empty state

### API Key Creation

- [ ] Settings → API Keys → Create
- [ ] Raw key shown once: `ag_live_...`
- [ ] Copy key, store in `.env` as `TEST_API_KEY`
- [ ] Verify key not shown again in list

### Lead Ingestion

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: ag_live_YOUR_KEY" \
  -d '{"name":"Test Lead","email":"test@example.com","source_id":"e2e-001"}'
```

Expected:
- [ ] 201 Created
- [ ] Lead appears in dashboard at `/leads`
- [ ] Lead has `source_external_id = e2e-001`

### Idempotency

- [ ] Send same request again
- [ ] Response: 200 (existing lead, not duplicate)
- [ ] No second lead created

### Invalid API Key

- [ ] Send with `x-api-key: ag_live_invalid`
- [ ] Response: 401

### Rate Limiting

- [ ] Send 30+ requests rapidly
- [ ] Response: 429 with Retry-After header

### OpenAI Configuration

- [ ] Set `OPENAI_API_KEY` in `.env`
- [ ] Go to Lead Detail → "AI Qualify Lead"
- [ ] Verify score 0-100 returned
- [ ] Verify temperature matches deterministic thresholds
- [ ] Verify summary, buying signals, risks displayed

### n8n Configuration

- [ ] Import `docs/n8n/lead-automation-workflow.json`
- [ ] Configure Header Auth on the Revora Webhook node with header
      `X-Revora-Webhook-Secret` and an organization-specific secret
- [ ] Activate the workflow and copy its production webhook URL
- [ ] Settings → Integrations → n8n → enter the URL and same secret
- [ ] Connect, then Test → verify an `integration.test` execution
- [ ] Create lead → verify n8n receives `lead.created`
- [ ] Move the lead to another pipeline stage → verify `lead.updated`
- [ ] Verify execution/audit rows use the originating organization and event ID

### HubSpot

- [ ] Create HubSpot private app with contacts scope
- [ ] Create custom properties: `ai_score__c`, `lead_temperature__c`
- [ ] Settings → Integrations → HubSpot → Connect
- [ ] "Test Connection" → "Connection successful"
- [ ] Create lead → verify contact in HubSpot
- [ ] Duplicate lead → verify no duplicate contact

### Slack

- [ ] Create Slack incoming webhook
- [ ] Settings → Integrations → Slack → Connect
- [ ] Create HOT lead (score ≥ 80) → verify Slack notification
- [ ] Create COLD lead → verify no Slack notification

### GoHighLevel

- [ ] Settings → Integrations → GHL → Connect
- [ ] "Test Connection"
- [ ] Create lead → verify contact in GHL
- [ ] Verify GHL API endpoint against current docs

### Tenant Isolation

- [ ] Create Org A and Org B
- [ ] API key A creates lead → Org A sees it, Org B does not
- [ ] API key B creates lead → Org B sees it, Org A does not
- [ ] Integrations isolated between orgs
- [ ] API keys isolated between orgs

### Failure Recovery

- [ ] Simulate n8n/webhook failure
- [ ] Verify lead persists in Supabase
- [ ] Verify execution record shows "failed" in Automation Activity
- [ ] Restore service, run retry processor
- [ ] Verify execution shows "success"

### Dashboard Demo Flow

- [ ] Analytics shows real metrics
- [ ] Leads page with search/filter
- [ ] Lead detail with AI qualification
- [ ] Pipeline with stage movement
- [ ] Automation Activity with execution records
- [ ] Settings → Integrations → all cards
- [ ] Settings → API Keys → full CRUD
- [ ] Profile with real data
