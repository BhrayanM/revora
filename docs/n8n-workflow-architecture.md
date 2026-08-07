# n8n Workflow Architecture — AI Growth Platform

## Phase 5.4

### Event Contract: `lead.created` (version 1)

```json
{
  "event": "lead.created",
  "version": 1,
  "event_id": "<hmac-derived-id>",
  "timestamp": "2026-08-07T...",
  "organization_id": "<org-uuid>",
  "source": "website|tally|n8n|api",
  "lead": {
    "id": "<lead-uuid>",
    "first_name": "...",
    "last_name": "...",
    "email": "...",
    "phone": "...",
    "company": "...",
    "source": "...",
    "source_external_id": "...",
    "message": "...",
    "status": "new",
    "score": 50
  }
}
```

### n8n Workflow: Lead Ingestion → AI Qualification → Actions

```
Webhook (receive lead.created)
  │
  ├─ 1. Verify HMAC (X-Signature header)
  │     Fail → 401 response, stop
  │
  ├─ 2. Validate event
  │     Check: event === "lead.created", version === 1
  │     Fail → 400 response, stop
  │
  ├─ 3. Call Internal Qualification API
  │     POST /api/internal/leads/{lead.id}/qualify
  │     Headers: X-Internal-Signature (HMAC-SHA256 of URL with N8N_INTERNAL_SECRET)
  │     Body: { "organization_id": "{{ lead.organization_id }}" }
  │     Timeout: 30s
  │     Fail → Log, continue to persistence
  │
  ├─ 4. Persist qualification to Supabase
  │     (Done by the internal API — no additional step needed)
  │
  └─ 5. Branch by temperature

        HOT (score ≥ 80)
        │
        ├─ Slack notification (Phase 5.5)
        └─ CRM sync (Phase 5.5)

        WARM (score 50-79)
        │
        └─ CRM sync (Phase 5.5)

        COLD (score < 50)
        │
        └─ Nurture path (Phase 5.5)
```

### HMAC Verification (n8n side)

```
Input: raw body (JSON string), X-Signature header

1. Compute HMAC-SHA256(raw_body, N8N_WEBHOOK_SECRET)
2. Compare with X-Signature header
3. If match: accept event
4. If no match: reject with 401
```

### Internal Qualification API

```
POST /api/internal/leads/:id/qualify
Host: https://<app-url>
Headers:
  X-Internal-Signature: HMAC-SHA256(request_url, N8N_INTERNAL_SECRET)
Body:
  { "organization_id": "uuid" }

Success 200:
  { "success": true, "lead_id": "...", "score": 85, "temperature": "HOT", "summary": "..." }

Error 401: Invalid signature
Error 404: Lead not found
Error 500: Qualification failed

Idempotent: Safe to call multiple times. Overwrites previous qualification.
```

### Failure Isolation

| Failure | Behavior |
|---------|----------|
| n8n unavailable | Lead persists — event lost (future: retry queue) |
| Webhook timeout (5s) | Lead persists — event delivery failed |
| Invalid HMAC | n8n rejects event — lead persists |
| OpenAI timeout | Internal API returns 500 — n8n can retry |
| OpenAI 429 | Internal API returns 500 — n8n can retry |
| Duplicate event | Idempotent — overwrites qualification |
| Supabase failure | Internal API returns 500 |

### n8n Webhook URL Configuration

```
N8N_WEBHOOK_URL=<n8n-instance>/webhook/lead-created
N8N_WEBHOOK_SECRET=<shared-secret-for-hmac>
N8N_INTERNAL_SECRET=<shared-secret-for-internal-api>
```

### Future Integration Points

- **Slack:** HOT leads → Slack channel notification
- **CRM:** WARM/HOT leads → HubSpot/GoHighLevel create/update contact
- **Email:** Automation trigger from CRM
- **SMS:** Twilio integration from CRM
- **Nurture:** COLD leads → automated email sequence
