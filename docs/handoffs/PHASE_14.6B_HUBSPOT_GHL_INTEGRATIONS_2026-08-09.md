# Phase 14.6B — HubSpot + GoHighLevel Integrations

**Date:** 2026-08-09 (initial) / 2026-08-10 (hardening + E2E)
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Status:** **HUBSPOT E2E COMPLETE — GHL PENDING**

## Scope

Adaptive OAuth 2.0 adapters for HubSpot and GoHighLevel. HubSpot verified end-to-end: real OAuth → encrypted credential storage → test connection → contact create → contact update → deduplication → mapping persistence → audit trail → idempotency. GoHighLevel real E2E pending.

---

## HubSpot OAuth E2E — Verified 2026-08-10

### OAuth Flow
- Real HubSpot developer app credentials
- Authorization URL: `https://app.hubspot.com/oauth/authorize`
- Token URL: `https://api.hubapi.com/oauth/v1/token`
- PKCE S256, SHA-256 hashed state, org-bound, single-use, 10-min expiry
- Callback: `http://localhost:3000/api/integrations/hubspot/callback`

### Test Connection
- `GET /crm/v3/objects/contacts?limit=1` — **PASS (200 OK)**

### Contact Sync
- **Create (POST):** `POST /crm/v3/objects/contacts` — **PASS**
- **Update (PATCH):** `PATCH /crm/v3/objects/contacts/{id}` — **PASS**
- **Dedup (email search):** **PASS** — search-before-create prevents duplicates
- **Dedup (stored mapping):** **PASS** — mapping-based path with email search fallback
- **Verified contact ID:** `532993021666`
- **Verified lead ID:** `31e5ff18-f891-47e5-a085-d160119df5ff`
- **Email:** `browser-hubspot-e2e@revora-test.dev`

---

## Bugs Found and Fixed

### 1. Encryption Format Mismatch (2026-08-10)

**Root cause:** `handleHubSpotCallback` stored credentials with `encryptCredential()` individually, producing keys `access_token`/`refresh_token` with `v1:...` ciphertext values. `getDecryptedCredentials()` only decrypts keys starting with `encrypted_` prefix (from `encryptCredentialsObject()`). Result: encrypted string sent as Bearer token → HubSpot 401 → "stored credentials are no longer valid."

**Fix:** Changed all 4 credential storage paths to use `encryptCredentialsObject()`, producing `encrypted_access_token`/`encrypted_refresh_token` keys compatible with `getDecryptedCredentials()`.

**Affected:** `hubspot.ts` (callback + refresh), `gohighlevel.ts` (callback + refresh)

### 2. Idempotency Permanent Block (2026-08-10)

**Root cause:** Static `event_id` (`lead_{id}_hubspot_sync`) combined with UNIQUE index `idx_executions_idempotency` meant only one execution row could exist per lead. Once a sync completed (success or failed), the row persisted forever, permanently blocking all future syncs.

**Fix:** 
- Per-attempt unique `event_id`: `lead_{id}_hubspot_sync_{Date.now()}`
- Partial UNIQUE index on `(organization_id, lead_id, provider, action) WHERE status = 'processing'` — blocks concurrent active syncs but releases on success/fail
- Stale processing recovery: 5-minute timeout marks abandoned rows as failed

**Migration:** `00032_active_sync_concurrency_guard.sql`

### 3. Audit Event Silently Discarded (2026-08-10)

**Root cause:** `integration_audit_events` CHECK constraint didn't include `contact_synced`. `recordAuditEvent()` didn't check insert errors → silent failure.

**Fix:** Added `contact_synced` to CHECK constraint (`00031`). Added `console.warn` error logging to `recordAuditEvent()`.

---

## Production Hardening

### Error handling (Priority 1)
- `parseHubSpotErrorBody()` — safe HubSpot error JSON extraction
- `hubSpotSafeErrorMessage()` — maps `INVALID_EMAIL`, `PROPERTY_DOESNT_EXIST`, rate limits to user-safe messages
- Provider message appended (truncated at 200 chars) without exposing raw payload

### Token refresh (Priority 2)
- `ensureHubSpotToken()` — checks `token_expires_at` with 5-min buffer
- Calls `refreshHubSpotToken()` (canonical encrypted format) if near expiry
- Failed refresh → marks connection error

### External contact mapping (Priority 3)
- **Migration 00030:** `provider_resource_mappings` table
  - UNIQUE on `(organization_id, provider, resource_type, local_id)`
  - RLS: org members can read; mutations via `service_role`
- Sync prefers stored mapping, falls back to email search if mapping absent/404

### Idempotent sync (Priority 4 — fixed in v2)
- Per-attempt unique `event_id` with timestamp suffix
- Partial UNIQUE index for active-concurrency guard
- Stale processing recovery (5-min timeout)
- Historical row preservation (no DELETE)

### Audit/health (Priority 5)
- `contact_synced` audit event with lead_id/contact_id/created metadata
- `markConnectionHealthy()` on success
- `markConnectionError()` on failure
- Sync execution tracked in `automation_executions`

### Source mapping (Priority 6)
- Documented limitation: no standard HubSpot source property; custom not auto-created

---

## Migrations Created

| # | Name | Purpose |
|---|---|---|
| 00030 | `provider_resource_mappings` | Generic provider-to-local resource mapping |
| 00031 | `add_contact_synced_audit_event` | Extended audit event CHECK constraint |
| 00032 | `active_sync_concurrency_guard` | Partial UNIQUE index for concurrency |

---

## Files

| File | Status |
|---|---|
| `src/lib/integrations/adapters/hubspot.ts` | Modified (canonical encryption) |
| `src/lib/integrations/adapters/gohighlevel.ts` | Modified (canonical encryption) |
| `src/lib/integrations/oauth.ts` | Modified (error logging in recordAuditEvent) |
| `src/app/(dashboard)/leads/sync-actions.ts` | Major rewrite (all hardening + idempotency) |
| `src/app/(dashboard)/leads/[id]/hubspot-sync-button.tsx` | New (sync UI button) |
| `src/app/(dashboard)/leads/[id]/page.tsx` | Modified (added sync button) |
| `src/lib/supabase/types.ts` | Regenerated |
| `supabase/migrations/00030–00032` | New (deployed, local = remote) |
| `src/app/api/integrations/hubspot/callback/route.ts` | Unchanged |
| `src/app/api/integrations/gohighlevel/callback/route.ts` | Unchanged |

---

## Validation

| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | 34 routes, passed |
| `npm audit` | 0 vulnerabilities |
| `git diff --check` | Clean |
| Migrations | 00001–00032, local = remote |
| HubSpot OAuth E2E | PASS |
| HubSpot Test Connection | PASS |
| HubSpot Contact Create | PASS |
| HubSpot Contact Update | PASS |
| HubSpot Dedup (email search) | PASS |
| HubSpot Dedup (stored mapping) | PASS |
| INVALID_EMAIL safe error surfacing | PASS |
| Token refresh before sync | PASS |
| Contact-synced audit events | PASS |
| Idempotency: concurrent block | PASS |
| Idempotency: re-sync after success | PASS |
| Idempotency: retry after failure | PASS |
| Idempotency: stale recovery | PASS |
| AI qualification regression | PASS |
| Historical record preservation | PASS |

---

## Remaining Limitations

1. **GoHighLevel real E2E** — not yet completed
2. **Custom property provisioning** — `ai_score__c`/`lead_temperature__c` assumed to exist
3. **No webhook receivers** — inbound CRM events not implemented
4. **No bulk sync** — single lead sync per action
5. **One GHL location per connection**
6. **Source not mapped** — no standard HubSpot source property
7. **GHL error handling** — not yet hardened
8. **`markConnectionHealthy` doesn't clear `last_error_at`** — minor; integration health reflects last action

## Next Phase

**Phase 14.6C — n8n + Zapier + Make**
