# n8n Workflow Architecture — Revora the implementation

Revora owns lead persistence, AI qualification, CRM synchronization, delivery
state, and retries. n8n is an organization-scoped outbound event destination;
it does not receive Revora provider credentials or call a privileged Revora
qualification endpoint.

## Event Contract

Revora sends version `"1"` envelopes with a UUID event ID:

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

Supported messages are `integration.test`, `lead.created`, and `lead.updated`.
`lead.updated` may contain a sorted `changed_fields` array. Retries always use
the originally persisted envelope rather than rebuilding it from current lead
state.

## Delivery Flow

```text
Revora lead mutation
  -> persist one automation_executions row per event/provider/organization
  -> resolve that organization's active encrypted n8n connection
  -> validate the production URL and resolve public DNS addresses
  -> pin the validated address and POST without following redirects
  -> persist the outcome and safe response metadata
  -> retry transient failures with the same event snapshot

n8n Revora Webhook
  -> require Header Auth before workflow code runs
  -> validate envelope version, ID, type, organization, and data
  -> return a small acknowledgement
```

## Authentication

The n8n Webhook node uses n8n's built-in Header Auth credential:

- Header name: `X-Revora-Webhook-Secret`
- Header value: a random organization-specific secret of at least 16 characters

The same credential is used for Test Connection and business events. Revora
encrypts the webhook URL and secret at rest and never returns decrypted values
to the client. This design does not claim raw-body HMAC validation: the workflow
does not depend on reconstructed JSON matching unavailable original raw bytes.

## Provider Boundaries

- AI qualification remains an authenticated Revora action.
- HubSpot and GoHighLevel synchronization remains inside their Revora adapters.
- Slack, email, and SMS providers remain independent integrations.
- The n8n workflow contains no Revora CRM access token, service-role key, or
  other provider credential.

## Failure and Retry Model

- Network errors, timeouts, HTTP 408/425/429, and 5xx responses are retryable.
- `Retry-After` is honored and capped at one hour.
- Redirects and permanent 4xx responses are not retried.
- Delivery is attempted at most five times with bounded backoff.
- A worker authenticated by `AUTOMATION_RETRY_SECRET` processes due retries.
- Delivery is at-least-once. Consumers should deduplicate using
  `X-Revora-Event-Id` or the envelope `id`.

## URL Security

Production delivery requires HTTPS. Revora blocks localhost, private,
loopback, link-local, multicast, reserved, documentation, cloud-metadata, and
IPv4-translation address ranges. Every hostname is resolved before delivery;
all returned addresses must be public, and the request is pinned to a validated
address to limit DNS rebinding.

## Import

Import `docs/n8n/lead-automation-workflow.json`, configure the Header Auth
credential, activate the workflow, and copy its production URL into
**Revora Settings → Integrations → n8n**. See `docs/n8n/README.md` for the exact
operator sequence.
