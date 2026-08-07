# n8n Workflow — AI Lead Automation

## Import Instructions

1. Open your n8n instance (self-hosted or cloud)
2. Go to **Workflows → Import from File**
3. Select `docs/n8n/lead-automation-workflow.json`
4. After import, configure the required credentials (see below)

## Required Environment Variables

Configure these in n8n before activating:

| Variable | Purpose |
|----------|---------|
| `N8N_WEBHOOK_SECRET` | HMAC-SHA256 secret to verify incoming lead.created events |
| `N8N_INTERNAL_SECRET` | HMAC-SHA256 secret to authenticate to internal qualification API |
| `APP_URL` | Base URL of the AI Growth Platform (e.g. `https://app.example.com`) |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app access token (stored per organization in integrations table) |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL for HOT lead alerts (stored per organization) |

## Credential References

The workflow uses n8n credential placeholders (`{{ $env.VARIABLE }}`). Replace these with your actual values after import:

- **HTTP Request nodes:** Update the `APP_URL` and authentication headers
- **HubSpot node:** Configure via n8n's HubSpot credential node or use HTTP Request node with `HUBSPOT_ACCESS_TOKEN`
- **Slack node:** Configure via n8n's Slack credential node or use the HTTP Request node with `SLACK_WEBHOOK_URL`

## Webhook Configuration

When activated, the workflow exposes a webhook at:

```
POST <n8n-instance>/webhook/lead-automation
```

Configure `N8N_WEBHOOK_URL` in the AI Growth Platform's `.env` to point to this URL.

## Testing

1. Start the AI Growth Platform dev server
2. Configure test API key in `source_api_keys` table
3. Send a test lead via the API:

```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: ag_live_YOUR_KEY" \
  -d '{"name":"Test Lead","email":"test@example.com","source_id":"test-123"}'
```

4. Check n8n execution history for the workflow run
5. Verify HubSpot contact was created/updated
6. If score ≥ 80, verify Slack notification was sent

## Expected Webhook Payload (lead.created v1)

```json
{
  "event": "lead.created",
  "version": 1,
  "event_id": "...",
  "timestamp": "2026-08-07T00:00:00Z",
  "organization_id": "...",
  "source": "api",
  "lead": {
    "id": "...",
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "phone": "+1...",
    "company": "Example Co",
    "source": "api",
    "source_external_id": "test-123",
    "message": "...",
    "status": "new",
    "score": 50
  }
}
```

## Workflow Steps

1. **Webhook** — Receives `lead.created` event
2. **Verify HMAC** — Computes HMAC-SHA256 of raw body, compares with `X-Signature` header
3. **Validate Event** — Checks `event === "lead.created"` and `version === 1`
4. **Call Internal Qualification API** — `POST /api/internal/leads/{id}/qualify` with `X-Internal-Signature`
5. **Switch by Temperature** — Routes to HOT (≥80), WARM (50-79), or COLD (<50)
6. **HubSpot Sync** — Upserts contact for all temperatures
7. **Slack Alert** — Sends notification only for HOT leads
8. **Execute** — Logs success or error per branch

## Failure Handling

| Failure | Behavior |
|---------|----------|
| Invalid HMAC | Reject with 401 |
| Invalid event | Reject with 400 |
| Qualification API unreachable | Log error, continue to CRM sync |
| HubSpot unreachable | Log error, lead remains in Supabase |
| Slack unreachable | Log error, CRM sync unaffected |
| Duplicate event | Idempotent — overwrites qualification, upserts CRM |
