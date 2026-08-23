# Phase 14.8C - Secrets Architecture

## Overview
This document outlines the architecture for managing secrets in the Revora / AI Growth Platform. Our strategy is designed to be secure, cost-effective (starting at $0), and ready for production without relying on paid external secret managers during the initial stages.

## Secret Classification
Secrets in this project are classified into the following tiers:

1. **Client-Safe Secrets (Tier 1)**
   - **Prefix:** `NEXT_PUBLIC_`
   - **Examples:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
   - **Exposure:** Safe to be exposed to the browser.
   - **Storage:** Standard `.env` files.

2. **Server-Only Credentials (Tier 2)**
   - **Examples:** `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, OAuth Client Secrets (`SLACK_CLIENT_SECRET`, etc.)
   - **Exposure:** Must NEVER leave the server context. Validated using `import "server-only"` in configuration files.
   - **Storage:** Secure environment variables (Vercel Environment Variables, GitHub Secrets).

3. **Cryptographic & Webhook Secrets (Tier 3)**
   - **Examples:** `INTEGRATION_ENCRYPTION_KEY`, `AUTOMATION_RETRY_SECRET`, Webhook HMAC keys.
   - **Exposure:** Strictly server-side, used for cryptographic operations or request verification.
   - **Storage:** Same as Tier 2, but requires higher scrutiny during rotation.

## Server-Only Validation
All environment variables are parsed and validated within `src/lib/config/env.ts`.
This module includes the directive `import "server-only";` at the top, which causes Next.js to throw a build error if any client-side component attempts to import it.

## Prevention of Client-Side Exposure
- Only variables explicitly prefixed with `NEXT_PUBLIC_` are bundled into the client build.
- Configuration modules that access sensitive secrets (like `SUPABASE_SERVICE_ROLE_KEY`) are protected by `server-only`.

## Sanitization in Logs & Error Handling
- Never log full HTTP request objects or `process.env` directly.
- The observability layer (implemented in Phase 14.8D) will actively sanitize logs to strip any values matching known secret patterns (e.g., Bearer tokens, API keys).
- Errors returned to the client must genericize database or third-party API errors to avoid leaking table structures or connection strings.

## Dev vs CI vs Production Separation
- **Local Development:** Uses `.env.local` (ignored by git).
- **CI Environment:** Uses GitHub Secrets injected into standard `env` contexts in GitHub Actions.
- **Production Environment:** Uses Vercel Environment Variables or the equivalent hosting platform secret manager. Supabase secrets are managed via Supabase's native vault/dashboard.

## Managing Secrets Post-Activation

### GitHub Actions
1. Navigate to Settings > Secrets and variables > Actions.
2. Add necessary production secrets to the "Production" environment.

### Vercel (or equivalent hosting)
1. Navigate to Project Settings > Environment Variables.
2. Add all server-only and public variables here.

### Supabase
1. Navigate to Project Settings > Vault.
2. Store encryption keys or third-party OAuth secrets if utilizing Edge Functions.

## Secret Rotation & Revocation Checklist
When a secret is compromised or nearing its expiration:

1. **Identify the Secret:** Determine the scope of the compromised secret (e.g., Supabase Service Role Key).
2. **Generate New Secret:** Create a new key in the provider's dashboard without immediately deleting the old one if the provider supports multiple active keys (grace period).
3. **Update Infrastructure:** Update the secret in Vercel Environment Variables and GitHub Secrets.
4. **Trigger Deployment:** Force a redeployment so the new application instances pick up the new secret.
5. **Verify:** Run health checks (`npm run release:check`) and monitor error logs to ensure no authentication failures.
6. **Revoke Old Secret:** Delete the old secret from the provider's dashboard.
7. **Audit Logs:** Review access logs to determine if the compromised secret was used maliciously.
