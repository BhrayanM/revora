# Phase 14.6B - HubSpot + GoHighLevel Integrations

**Started:** 2026-08-09
**Completed:** 2026-08-12
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Status:** **COMPLETE**

## Scope

Phase 14.6B delivered production-hardened HubSpot and GoHighLevel OAuth integrations with encrypted credential storage, connection health checks, durable provider mappings, real contact create/update behavior, deduplication, execution tracking, and audit/activity records.

Phase 14.6C has not started.

## Final E2E Results

| Verification | HubSpot | GoHighLevel |
|---|---:|---:|
| Real OAuth authorization | PASS | PASS |
| OAuth callback and token exchange | PASS | PASS |
| Encrypted credential persistence | PASS | PASS |
| Connected account displayed | PASS | PASS - Revora GHL Test |
| Test Connection | PASS | PASS |
| Real contact CREATE | PASS | PASS |
| Real contact UPDATE | PASS | PASS - two consecutive updates |
| Stored provider mapping reused | PASS | PASS |
| Email deduplication | PASS | PASS |
| Exactly one matching provider contact | PASS | PASS |
| Automation execution records | PASS | PASS |
| Integration audit events | PASS | PASS |
| Lead activity records | PASS | PASS |
| Integration health | Healthy | Healthy |

## HubSpot Closure

- Real OAuth E2E completed and committed at `834961e`.
- Authorization code, tenant-bound state, PKCE, token exchange, encrypted credential persistence, refresh, and disconnect behavior were validated.
- Test Connection returned 200.
- Real contact create, update, email-search deduplication, and stored-mapping reuse passed.
- Shared mapping/idempotency helpers were generalized during GHL work without changing HubSpot provider behavior.
- HubSpot adapter and callback files have no changes relative to the committed HubSpot checkpoint.

## GoHighLevel Closure

### Marketplace and authorization

- Marketplace app: Revora, Draft.
- Sandbox app test account and sub-account: Revora GHL Test.
- Canonical callback: `http://localhost:3000/api/integrations/crm/callback`.
- The old provider-named callback route was intentionally moved to the neutral CRM callback route for white-label Marketplace compatibility.
- The Draft Marketplace app was installed successfully through a Test Link generated with the real sandbox Location ID.

### Draft `version_id` requirement

HighLevel's `/oauth/chooselocation` flow attempts to infer a live version when `version_id` is absent. Revora had only a Draft version, which produced `error.noAppVersionIdFound`.

Fix:

- Added optional `GHL_APP_VERSION_ID` configuration.
- Included `version_id` in Revora-initiated authorization requests during Draft testing.
- The setting can be omitted after a live Marketplace version exists.

Result: permission review, location selection, and callback all passed.

### Marketplace callback and tenant association

Marketplace installation can redirect with an authorization code but without Revora-owned state. Revora does not attach credentials from a code-only callback because doing so would lack a safe organization association.

The canonical connection flow is:

1. Install the Draft app through the Marketplace Test Link.
2. Start Connect from the authenticated Revora organization.
3. Generate tenant-bound, provider-bound, expiring, one-time state.
4. Authorize the installed app/version and selected GHL location.
5. Validate state before server-side token exchange and credential persistence.

Code-only installation callbacks redirect back to the Integrations settings page with instructions to use Connect.

### GHL PKCE incompatibility

HighLevel accepted the authorization request but rejected token exchange with HTTP 422 and the safe provider message `property code_verifier should not exist`.

Fix:

- Removed PKCE parameters only from the GoHighLevel authorization/token flow.
- Preserved Revora's hashed, organization-bound, provider-bound, expiring, single-use OAuth state protection.
- HubSpot PKCE remains unchanged.

### Current v3 token exchange

The GHL token and refresh requests now use:

- `POST https://services.leadconnectorhq.com/oauth/token`
- `Content-Type: application/x-www-form-urlencoded`
- `Accept: application/json`
- `Version: v3`
- `clientId`
- `clientSecret`
- `grantType`
- `code` for authorization-code exchange
- `refreshToken` for refresh
- `redirectUri`

Token response normalization accepts current camelCase fields and legacy snake_case fields, then validates required token/location metadata before storage.

### Test Connection false negative

The initial test called `GET /contacts/?limit=1` without a Location ID. HighLevel returned 403 even though the same token could create contacts.

Fix:

- Test Connection now calls `GET /contacts/?limit=1&locationId={locationId}`.
- It sends the OAuth bearer token and `Version: 2021-07-28`.
- It requires a successful response with a `contacts` array.

Result: HTTP 200; the GHL integration remains Connected and Healthy.

### Contact request separation

The provider uses different schemas for create and update:

- CREATE: `POST /contacts/` includes `locationId` to associate the contact with the location.
- UPDATE: `PUT /contacts/{contactId}` must omit `locationId`.

Revora now uses explicit typed builders:

- `buildGHLCreateContactPayload()` retains `locationId`.
- `buildGHLUpdateContactPayload()` cannot include `locationId`.

The mapped-contact path falls back only after a confirmed remote 404. Email lookup must succeed before CREATE is allowed, preventing transient provider errors from producing duplicates.

### Real contact E2E evidence

- CREATE: PASS.
- UPDATE: PASS on the same mapped lead/contact.
- Second unchanged UPDATE: PASS on the same mapped lead/contact.
- Exact matching GHL contacts after repeated sync: 1.
- Provider mapping rows for the lead/provider: 1.
- Distinct mapped contact IDs: 1.
- New contact created during update testing: no.
- Remote mapped contact remained in the expected GHL location.
- Remote updated company value matched the Revora lead.

### Execution, audit, and activity evidence

Final counts for the mapped GHL lead:

- Successful `sync_contact` executions: 3 (one create, two updates).
- Preserved failed pre-fix execution: 1.
- Processing executions: 0.
- `contact_synced` audit events: one create and two updates.
- Lead activity records: one create and two updates.
- All audit events reference the one stored provider contact mapping.
- Integration status: Connected.
- Integration health: Healthy.

## Security and Isolation

- OAuth state remains hashed, organization-bound, provider-bound, expiring, and single-use.
- Callback processing requires authenticated Revora organization context.
- Provider mappings are scoped by organization, provider, resource type, and local resource.
- Credentials are encrypted at rest with AES-256-GCM through the canonical integration encryption helpers.
- Token exchange, refresh, API calls, and persistence remain server-side.
- Authorization codes, state values, client secrets, access tokens, refresh tokens, PKCE verifiers, service-role keys, and encryption material are not logged or stored in documentation.
- Temporary diagnostic logging/scripts were removed.
- `.env` remains ignored and must never be staged.

## Migrations

Phase 14.6B reuses deployed migrations `00001` through `00032`.

Relevant existing migrations:

| Migration | Purpose |
|---|---|
| `00029_integration_foundation.sql` | Integration connections, OAuth state, webhooks, and audit foundation |
| `00030_provider_resource_mappings.sql` | Durable provider-to-local contact mapping |
| `00031_add_contact_synced_audit_event.sql` | `contact_synced` audit event support |
| `00032_active_sync_concurrency_guard.sql` | One active sync per organization/lead/provider/action |

No migration was created or modified during final GHL E2E closure.

## Phase 14.6B Implementation Files

- `.env.example`
- `src/app/(dashboard)/leads/[id]/gohighlevel-sync-button.tsx`
- `src/app/(dashboard)/leads/[id]/page.tsx`
- `src/app/(dashboard)/leads/sync-actions.ts`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/settings-content.tsx`
- `src/app/api/integrations/crm/callback/route.ts`
- `src/app/api/integrations/gohighlevel/callback/route.ts` (deleted by intentional route migration)
- `src/lib/integrations/adapters/gohighlevel.ts`
- `src/lib/integrations/gohighlevel-contact-payloads.ts`

## Closure Validation

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS; Next.js production build generated 34 routes |
| `npm audit` | PASS; 0 vulnerabilities |
| `git diff --check` | PASS; only harmless LF-to-CRLF working-copy warnings |
| `npx supabase migration list --linked` | PASS; local and remote synchronized through `00032` |

## Deferred Items

These do not block Phase 14.6B closure:

- GHL token revocation during disconnect.
- Concurrent token-refresh coordination.
- Dedicated integration encryption key instead of service-role-derived fallback.
- Expired OAuth-state cleanup.
- Preserve `company_id` across refresh.
- Consume stored `return_path` after callbacks.
- Replace legacy GHL API-key form remnants.
- Webhook-driven inbound CRM synchronization.
- Bulk contact synchronization.
- GHL custom-field provisioning/ID mapping.
- Production HTTPS callback and Marketplace publication/review.

## Phase Decision

**Phase 14.6B is COMPLETE.**

## Exact Next Phase

**Phase 14.6C - n8n + Zapier + Make.**

Phase 14.6C has not started and must not begin without explicit approval after this local closure commit.
