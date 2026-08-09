# Phase 14.6B — HubSpot + GoHighLevel Integrations

**Date:** 2026-08-09
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Status:** **IMPLEMENTATION COMPLETE / REAL E2E BLOCKED BY PROVIDER CONFIGURATION**

## Scope

Implemented adaptive OAuth 2.0 adapters for HubSpot and GoHighLevel using the Phase 14.6A integration foundation. Existing CRM contact sync logic preserved and integrated. Real E2E verification requires provider OAuth app credentials.

## HubSpot

### OAuth Architecture
- **Authorization URL:** `https://app.hubspot.com/oauth/authorize`
- **Token URL:** `https://api.hubapi.com/oauth/v1/token`
- **API Base:** `https://api.hubapi.com`
- **Scopes:** `crm.objects.contacts.read`, `crm.objects.contacts.write`
- **PKCE:** S256 challenge/verifier via Phase 14.6A OAuth foundation
- **State:** SHA-256 hashed, organization-bound, single-use, 10-minute expiry
- **Env vars required:** `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`

### OAuth Flow
1. User clicks Connect → `startHubSpotOAuth()` generates authorization URL
2. Redirect to HubSpot authorization page
3. On approval, HubSpot redirects to `/api/integrations/hubspot/callback`
4. Server validates state, exchanges code for tokens
5. Credentials encrypted and persisted with portal ID/name, scopes, expiry
6. Audit event `integration.connected` recorded

### Token Refresh
- `refreshHubSpotToken()` — uses refresh_token grant, handles rotated refresh tokens
- Failed refresh → `reauth_required` status + audit

### Test Connection
- `testHubSpotConnection()` — GET `/crm/v3/objects/contacts?limit=1`
- Non-mutating, updates health status

### Contact Sync
- `syncLeadToHubSpot()` server action in `leads/sync-actions.ts`
- Search by email → update existing OR create new
- Maps: firstname, lastname, email, phone, company
- AI fields: `ai_score__c` (custom property), `lead_temperature__c` (custom property)
- Activity timeline: `integration.hubspot.contact_synced`

### Custom Properties
HubSpot custom properties `ai_score__c` and `lead_temperature__c` assumed to exist. If not present, they will be created by the API on first write. No automatic provisioning code added.

### Disconnect
- `disconnectHubSpot()` — clears all credentials and metadata
- Audit: `integration.disconnected`

## GoHighLevel

### OAuth Architecture
- **Authorization URL:** `https://marketplace.gohighlevel.com/oauth/chooselocation`
- **Token URL:** `https://services.leadconnectorhq.com/oauth/token`
- **API Base:** `https://services.leadconnectorhq.com`
- **API Version:** `2021-07-28` (via header)
- **Scopes:** `contacts.readonly`, `contacts.write`, `locations.readonly`
- **PKCE:** S256 via Phase 14.6A foundation
- **Env vars required:** `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`

### OAuth Flow
1. User clicks Connect → `startGHLOAuth()` generates authorization URL
2. Redirect to GHL location selection page
3. On approval, GHL redirects to `/api/integrations/gohighlevel/callback`
4. Server validates state, exchanges code for tokens
5. Location ID extracted from token response, location name fetched from API
6. Credentials encrypted and persisted with location metadata

### Location Model
- `locationId` extracted from OAuth token response
- Location name fetched via `GET /locations/{locationId}`
- One location per Revora integration connection (documented limitation)

### Token Refresh
- `refreshGHLToken()` — uses refresh_token grant
- Failed refresh → `reauth_required` + audit

### Test Connection
- `testGHLConnection()` — GET `/contacts/?limit=1`
- Non-mutating

### Contact Sync
- `syncLeadToGoHighLevel()` server action
- Lookup by email → update OR create
- Maps: firstName, lastName, email, phone, companyName, locationId
- AI fields in customFields: `ai_score`, `lead_temperature`
- Tags: `revora`, `[temperature.toLowerCase()]`
- Activity timeline: `integration.gohighlevel.contact_synced`

### Disconnect
- `disconnectGHL()` — clears all credentials
- Audit: `integration.disconnected`

## Shared Architecture

### Files Created
| File | Purpose |
|---|---|
| `src/lib/integrations/adapters/hubspot.ts` | HubSpot OAuth adapter + API helpers |
| `src/lib/integrations/adapters/gohighlevel.ts` | GoHighLevel OAuth adapter + API helpers |
| `src/app/api/integrations/hubspot/callback/route.ts` | HubSpot OAuth callback |
| `src/app/api/integrations/gohighlevel/callback/route.ts` | GoHighLevel OAuth callback |
| `src/app/(dashboard)/leads/sync-actions.ts` | Lead-to-CRM sync server actions |

### Files Modified
| File | Change |
|---|---|
| `src/app/(dashboard)/settings/integrations-actions.ts` | Added OAuth flow actions + provider-specific test/disconnect |
| `src/app/(dashboard)/settings/integrations-panel.tsx` | OAuth-aware Connect flow, provider-specific test/disconnect |
| `.env.example` | Added HUBSPOT_*, GHL_*, INTEGRATION_ENCRYPTION_KEY variables |

### Existing Code Classification
| File | Verdict |
|---|---|
| `src/lib/crm/types.ts` | PRESERVED — CRMContact, CRMLeadContext, CRMSyncResult types still valid |
| `src/lib/crm/hubspot.ts` | PRESERVED — contact sync logic reused within new adapter |
| `src/lib/crm/gohighlevel.ts` | PRESERVED — contact sync logic reused within new adapter |
| `src/lib/crm/index.ts` | PRESERVED — factory function unchanged; new adapter services are separate |

### Idempotency
Lead sync uses email-based search-create-update pattern. Duplicate contacts prevented by provider semantics (email uniqueness). External resource IDs not persisted to a mapping table yet — contact search happens on each sync.

### Rate Limiting / Retry
- 15-second AbortController timeout on all HTTP calls
- `normalizeHubSpotError()` / `normalizeGHLError()` classify HTTP status codes
- `extractRetryAfter()` parses `Retry-After` header
- Error normalization feeds into shared integration error categories

### Security Review
- OAuth state: SHA-256 hashed, organization-bound, single-use, 10-min expiry ✅
- CSRF protection: PKCE S256 ✅
- Token storage: AES-256-GCM encrypted ✅
- Server-only: `import "server-only"` enforced ✅
- Env vars: never NEXT_PUBLIC_ ✅
- Callback validation: state, org, provider, expiry, replay ✅
- No credential logging ✅

### RBAC
- `integrations.manage` required for connect, test, disconnect
- Server actions enforce permissions before any provider call
- Organization binding checked in OAuth flow

### Known Limitations
1. **No real provider E2E executed** — requires HubSpot developer app + GHL Marketplace app credentials
2. **Custom property provisioning** — `ai_score__c` and `lead_temperature__c` assumed to exist; no auto-create
3. **No resource mapping table** — external contact IDs not persisted; search on each sync
4. **No webhook receivers** — inbound CRM events not implemented
5. **No bulk sync** — single lead sync per server action
6. **One GHL location per connection** — documented limitation
7. **Localhost OAuth** — both providers accept http://localhost redirects in development

### Validation
| Command | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run build` | 34 routes, passed |
| `npm audit` | 0 vulnerabilities |
| `git diff --check` | Clean |
| Migrations | 00001–00029, no new migration needed |

### To Complete Phase 14.6B
1. Create HubSpot developer app, obtain OAuth credentials
2. Create GoHighLevel Marketplace app, obtain OAuth credentials
3. Configure env vars: `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`, `GHL_CLIENT_ID`, `GHL_CLIENT_SECRET`, `GHL_REDIRECT_URI`
4. Execute real browser OAuth flow for both providers
5. Create/sync synthetic leads and verify in provider dashboards
6. Test disconnect and reconnect

### Next Phase
**Phase 14.6C — n8n + Zapier + Make**
