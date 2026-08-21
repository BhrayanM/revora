# Revora Production Checklist

**Last updated:** 2026-08-21

**Status:** Local production candidate; external credential and deployment gates remain.

## Local Release Gate

- [x] `npm.cmd run test:integration-e2e`
- [x] `npm.cmd run test:crm-integrations`
- [x] `npm.cmd run test:tally`
- [x] `npm.cmd run test:google-workspace`
- [x] `npm.cmd run test:communications`
- [x] `npm.cmd run test:integrations`
- [x] `npm.cmd run lint`
- [x] `npm.cmd run typecheck`
- [x] `npm.cmd run build`
- [x] `npm.cmd audit` reports zero vulnerabilities
- [x] `git diff --check`
- [x] Migrations `00001`-`00035` remain unchanged from the 14.6F checkpoint;
      14.6G adds no migration
- [ ] Migration `00034` applied and verified in the authorized linked project
- [ ] Migration `00035` applied and verified in the authorized linked project
- [x] Modified/untracked secret scan reports no real credential values
- [x] Git working tree is clean after the authorized local phase commit

## Core Environment

- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_APP_NAME`
- [ ] `NEXT_PUBLIC_APP_ENV=production`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- [ ] `OPENAI_API_KEY` (server-only)
- [ ] `OPENAI_MODEL`
- [ ] `AUTOMATION_RETRY_SECRET` (server-only, at least 32 characters)
- [ ] `INTEGRATION_ENCRYPTION_KEY` (server-only, 64 hex characters)
- [ ] `ALLOW_INSECURE_INTEGRATION_WEBHOOKS=false`
- [ ] Production distributed rate limiter configured

## Supabase and Tenant Isolation

- [ ] Migrations `00001`-`00035` applied in order; existing files unchanged
- [ ] RLS enabled on every organization-owned business table
- [ ] Service-role key never reaches browser bundles
- [ ] Org A cannot read, test, disconnect, or use Org B integrations
- [ ] Credentials and webhook URLs are absent from client-safe DTOs

## Completed Provider Gates

- [x] HubSpot implementation and prior provider validation
- [x] GoHighLevel implementation and prior provider validation
- [x] n8n implementation and prior provider validation
- [x] Zapier implementation and prior provider validation
- [x] Make implementation and prior provider validation
- [x] Tally implementation and local contract validation
- [x] Google Calendar and Gmail implementation and local contract validation
- [x] Cross-provider OAuth, tenant, transport, idempotency, client-boundary,
      and migration audit

Re-run each live gate after production-domain or credential rotation.

## Slack

- [ ] Slack app created or reused
- [ ] Redirect URL is `https://<host>/api/integrations/slack/callback`
- [ ] Only required `incoming-webhook` scope configured
- [ ] `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, and `SLACK_REDIRECT_URI` set
- [ ] OAuth Connect stores only encrypted token/webhook credentials
- [ ] Test sends exactly one integration-test message
- [ ] HOT sends exactly one alert; WARM and COLD send none
- [ ] Failure leaves qualification successful and marks safe degraded health
- [ ] Disconnect clears stored credentials

## Twilio — Infrastructure Only

- [ ] Account SID/Auth Token validated using HTTP Basic over HTTPS
- [ ] Optional source number ownership validated in E.164
- [ ] Validation traffic contains only account/number `GET` requests
- [ ] Test repeats only read-only validation
- [ ] Disconnect clears stored credentials
- [ ] No SMS, WhatsApp, call, number-purchase, or callback action exists

## Tally

- [ ] `NEXT_PUBLIC_APP_URL` is an externally reachable HTTPS origin
- [ ] Migration `00034` is applied to the authorized non-production project
- [ ] API key entered only in the masked organization-scoped connection UI
- [ ] Form discovery and question inspection use the documented Tally API only
- [ ] Mapping requires email or phone and stores no raw/unmapped form data
- [ ] Connect creates one signed `FORM_RESPONSE` webhook automatically
- [ ] Test is read-only and validates the selected form plus remote webhook
- [ ] Valid signed submission creates exactly one organization-scoped lead
- [ ] Identical replay is idempotent; payload conflict fails closed
- [ ] Invalid signature, unknown token, and oversized body fail safely
- [ ] Org B cannot read, test, disconnect, or route through Org A's connection
- [ ] Disconnect clears credentials and disables local ingestion regardless of
      remote cleanup outcome

## Google Workspace

- [ ] Calendar API and Gmail API enabled in the intended Google Cloud project
- [ ] Consent/test users configured with only the four documented scopes
- [ ] Exact HTTPS Google Workspace callback registered
- [ ] Three server-only `GOOGLE_WORKSPACE_*` variables configured
- [ ] One OAuth consent connects both cards to the same organization identity
- [ ] Calendar Test lists at most one primary-calendar event and creates none
- [ ] Gmail Test validates identity/scope and sends no synthetic message
- [ ] Calendar mutation is limited to one bounded primary-calendar appointment
- [ ] Gmail mutation is limited to one recipient and plain text only
- [ ] Org B cannot read, refresh, test, disconnect, or use Org A credentials
- [ ] Disconnect from either card revokes and clears both local capabilities

## Automation Reliability

- [ ] n8n/Zapier/Make credentials are organization-scoped and encrypted
- [ ] Redirects and private-network webhook targets fail closed
- [ ] Delivery timeouts and response-size bounds are active
- [ ] Retry worker authorization is configured
- [ ] Idempotency prevents duplicate provider delivery
- [ ] Failed provider delivery does not roll back lead persistence

## Deployment and Operations

- [ ] Production OAuth redirect URLs registered with each provider
- [ ] Production SMTP/sending domain configured
- [ ] Secret rotation and environment separation documented
- [ ] Database backups configured
- [ ] Monitoring and security-event logging configured without secrets
- [ ] WAF/HSTS/rate-limiter decisions completed
- [x] Phase 14.6G deterministic local E2E audit completed
- [ ] External provider and tenant gates repeated on the production candidate
      before final go-live claim

## Remaining Roadmap

- [x] Phase 14.6F — Google Calendar + Gmail (local implementation)
- [x] Phase 14.6G — Complete integration E2E audit (local)
- [ ] Phase 14.7 — Product UX Completion
- [ ] Phase 14.8 — Production Infrastructure and Release Readiness
