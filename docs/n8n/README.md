# Revora n8n Automation Events

Revora sends organization-scoped `lead.created` and `lead.updated` events to
an active n8n production webhook. Integration tests use the separate
`integration.test` control message.

## Import and configure

1. Import `lead-automation-workflow.json` in n8n.
2. Open **Revora Webhook** and create a **Header Auth** credential:
   - Header name: `X-Revora-Webhook-Secret`
   - Header value: a random secret with at least 16 characters
3. Select that credential on the Webhook node.
4. Save and publish the workflow.
5. Copy the production URL, which ends in `/webhook/revora-events`.
6. In Revora, open **Settings → Integrations → n8n** and enter the production
   URL and the same header secret.

Do not use n8n's temporary test URL for a persistent Revora connection. It is
only registered while n8n is listening for a test event.

## Event contract

```json
{
  "version": "1",
  "id": "event-uuid",
  "type": "lead.created",
  "occurred_at": "2026-08-14T18:00:00.000Z",
  "organization_id": "organization-uuid",
  "data": {
    "lead": {
      "id": "lead-uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "email": "jane@example.com",
      "phone": null,
      "company": "Example Co",
      "source": "website",
      "status": "new",
      "score": 0,
      "pipeline_stage_id": "stage-uuid"
    }
  }
}
```

`lead.updated` uses the same immutable lead snapshot and may include a sorted
`changed_fields` array. Revora does not currently advertise other business
events.

## Security and reliability

- n8n performs Header Auth before running the workflow.
- The webhook URL and secret are encrypted in Revora's organization-scoped
  integration record.
- Revora requires HTTPS unless an explicit development-only override is set.
- Revora validates DNS and blocks non-public destinations before every request.
- Redirects are not followed.
- Every event is persisted before delivery and retried with the original
  snapshot.
- The workflow only validates and acknowledges Revora events. It does not
  contain HubSpot, GoHighLevel, Slack, or other provider credentials.

## Verification

After connecting, Revora's **Test** action should create one n8n execution with
`event_type` equal to `integration.test`. Creating a lead should create one
`lead.created` execution, and moving it to another pipeline stage should create
one `lead.updated` execution.
