# DECISIONS

## Decision Record

### DR-001: Next.js App Router over Pages Router
**Date:** 2026-08-07
**Decision:** Use App Router (Next.js 16)
**Rationale:**
- React Server Components for better performance
- Nested layouts and route groups
- Streaming and Suspense built-in
- Industry standard for new Next.js projects

### DR-002: Tailwind CSS v4 over v3
**Date:** 2026-08-07
**Decision:** Use Tailwind v4 (installed by default)
**Rationale:**
- CSS-first configuration with @theme
- Better performance (no JS config parsing)
- Simplified setup
- Future-proof for new projects

### DR-003: CVA for Component Variants
**Date:** 2026-08-07
**Decision:** Use Class Variance Authority for component variants
**Rationale:**
- Type-safe variant system
- Composable with Tailwind
- Industry standard (shadcn/ui pattern)
- Reduces CSS bloat

### DR-004: Route Groups for Landing/Dashboard Separation
**Date:** 2026-08-07
**Decision:** Use `(landing)` and `(dashboard)` route groups
**Rationale:**
- Different layouts for public vs authenticated areas
- Clean URL structure
- Independent loading/error states
- Easy to add auth middleware later

### DR-005: Custom Design System over UI Library
**Date:** 2026-08-07
**Decision:** Build custom design system instead of using Radix/shadcn
**Rationale:**
- Full control over design and behavior
- Learning opportunity for the portfolio
- No dependency on third-party component libraries
- Lighter bundle size

### DR-006: Geist Font Family
**Date:** 2026-08-07
**Decision:** Use Geist Sans + Geist Mono
**Rationale:**
- Vercel's typeface, optimized for Next.js
- Modern, clean aesthetic
- Excellent legibility
- Zero-cost via next/font

### DR-007: Color System — Indigo Primary + Cyan Secondary
**Date:** 2026-08-07
**Decision:** Primary #6366f1 (Indigo) + Secondary #06b6d4 (Cyan)
**Rationale:**
- Indigo conveys trust, intelligence, technology
- Cyan adds energy and modernity
- Works well in both light and dark modes
- Accessible contrast ratios
- Distinctive SaaS feel

### DR-008: Docker Multi-Stage Builds
**Date:** 2026-08-07
**Decision:** Use multi-stage Docker builds for production
**Rationale:**
- Smaller production images
- Separation of build and runtime dependencies
- Industry best practice
- Better caching

### DR-009: No State Management Library Yet
**Date:** 2026-08-07
**Decision:** Defer global state management library selection
**Rationale:**
- Current phases don't require complex state
- Server Components reduce client state needs
- Will evaluate React Query, Zustand, or Context in Phase 4
- Avoids premature architecture decisions

### DR-010: ESLint Flat Config
**Date:** 2026-08-07
**Decision:** Use ESLint v9 flat config (eslint.config.mjs)
**Rationale:**
- Modern ESLint configuration format
- Better TypeScript integration
- Forward-compatible
- Default in Next.js 16

### DR-011: Standalone Output for Production
**Date:** 2026-08-07
**Decision:** Configure Next.js with `output: "standalone"`
**Rationale:**
- Smaller Docker images
- Self-contained deployment
- No need for full node_modules in production
- Industry standard for containerized Next.js

### DR-012: Lucide React for Icons
**Date:** 2026-08-07
**Decision:** Use Lucide React over Heroicons or custom SVGs
**Rationale:**
- Large icon set (1,000+ icons)
- Tree-shakeable
- Consistent design language
- MIT licensed
- Active maintenance

### DR-013: Supabase as Backend Platform (No Prisma)
**Date:** 2026-08-07
**Decision:** Use Supabase as the primary backend platform. No Prisma ORM.
**Rationale:**
- Managed PostgreSQL with built-in Auth, Realtime, and Storage — single platform instead of stitching together NextAuth + Prisma + separate DB hosting
- Row Level Security enforces permissions at the database level, eliminating boilerplate API authorization code
- `@supabase/ssr` provides idiomatic Next.js App Router integration with cookie-based session management
- Realtime subscriptions enable live dashboard updates without WebSocket infrastructure
- Service role key enables privileged server-side operations (webhooks, n8n integration) while anon key gated by RLS handles client requests
- Avoids Prisma's migration overhead during early iterations; Supabase Dashboard provides visual schema management
- Auto-generated TypeScript types via Supabase CLI eliminate manual type maintenance
- Free tier sufficient for development and early production; scales to paid plans as needed

### DR-014: Multi-Tenant Schema Design
**Date:** 2026-08-07
**Decision:** All business tables scoped to `organization_id` with UUIDv4 primary keys, no schema-per-tenant.
**Rationale:**
- Single-database multi-tenancy is simpler to operate than schema-per-tenant or database-per-tenant at this scale
- `organization_id` column on every business table enables Row Level Security policies to isolate tenants transparently
- UUIDv4 primary keys prevent ID enumeration attacks and work well with Supabase's `auth.uid()` RLS integration
- Deterministic seed UUIDs (`00000000-...`) allow reproducible development environments
- `profiles` table extends `auth.users` via 1:1 FK — Supabase Auth manages credentials, profiles holds app data
- `memberships` junction enables users to belong to multiple organizations with different roles
- `automations` and `integrations` use `jsonb` for flexible config — avoids schema migrations for new providers/triggers
- `conversations` is append-only (no `updated_at`) for immutable audit trail
- Auto-created profile on signup (`handle_new_user` trigger) eliminates race conditions between auth and app data

### DR-015: Supabase Auth with SSR Middleware Protection
**Date:** 2026-08-07
**Decision:** Use Supabase Auth with `@supabase/ssr` for session management. Protect dashboard routes with Next.js middleware. Auto-create organization + workspace on first signup via auth callback.
**Rationale:**
- `@supabase/ssr` provides idiomatic cookie-based session management for Next.js App Router — no `localStorage` tokens, works in Server Components
- Middleware checks `auth.getUser()` on every protected route and redirects unauthenticated users to `/login`
- Auth callback route handles email confirmation, exchanges code for session, and provisions tenant resources (org, membership, workspace) on first login
- Service role client in callback bypasses RLS for org creation during onboarding
- `handle_new_user` database trigger auto-creates `profiles` row on `auth.users` insert — zero application code for profile creation
- User metadata from signup (`full_name`) flows through to dashboard greeting, sidebar, and topnav via server-side session
- Logout clears session client-side and redirects to `/login`
- RLS policies on all 10 tables enforce tenant isolation transparently without application-level authorization checks
- `onboard_user` PostgreSQL function wraps org + membership + workspace creation in a single atomic transaction, preventing orphan records
- Organization slugs include a random 4-char suffix to prevent collisions between users sharing email domains
- All `SECURITY DEFINER` functions set `search_path = ''` to prevent function hijacking attacks

### DR-016: Organization Scope for Dashboard (Not Workspace)
**Date:** 2026-08-07
**Decision:** All dashboard pages operate at organization scope, not workspace scope. `getCurrentOrganization()` returns the user's first org membership. Workspace filtering is available in the query layer but not wired to any UI yet.
**Rationale:**
- Phase 4 MVP only supports single-organization per user; workspace-level isolation adds complexity without immediate value
- The `workspaces` table exists and is populated on onboarding (default workspace), but no UI exists for workspace switching or filtering
- Query layer already supports workspace-scoped queries (`getLeadsByWorkspace(orgId, wsId)`) — ready for Phase 5 when workspace switching UI is built
- RLS policies enforce org-level isolation; workspace is an additional filter layer within an org
- Settings page persists org-level configuration; workspace-level settings would require schema changes
- This decision can be revisited in Phase 5 when multi-workspace dashboards become necessary

### DR-017: OpenAI Infrastructure Design
**Date:** 2026-08-07
**Decision:** Build a server-only AI abstraction layer using OpenAI SDK with typed errors, retry logic, and structured output support. No client-side AI access.
**Rationale:**
- `import "server-only"` on all AI modules enforces compile-time protection against Client Component imports
- Singleton client pattern (`getOpenAIClient()`) with lazy initialization — the client is never created unless `generateText()` or `generateStructuredOutput()` is actually called, avoiding errors during build when OPENAI_API_KEY is absent
- `gpt-4o-mini` as default model balances quality, speed, and cost for MVP; configurable via OPENAI_MODEL env var
- 3 retries with exponential backoff (1s/2s/4s) and 20% jitter — handles transient API failures without overwhelming the API
- Retry classification: auth errors (401/403) and config/validation errors are non-retryable; rate limits (429), timeouts, and 5xx server errors are retried
- `shouldRetry()` and `classifyAIError()` are pure functions — testable in isolation without API keys
- Error normalization prevents raw OpenAI errors from leaking through the application boundary
- Structured output uses `response_format: { type: "json_object" }` for reliable JSON parsing
- Usage metadata (input/output/total tokens, model, duration) preserved for future cost tracking and monitoring
- Build succeeds without OPENAI_API_KEY — the infrastructure validates the key at runtime, not compile time

### DR-018: AI Lead Qualification Architecture
**Date:** 2026-08-07
**Decision:** Use existing `leads` schema fields (`score`, `tags`, `metadata`) for qualification storage. Score clamped 0-100. Temperature derived deterministically from score (80-100→HOT, 50-79→WARM, 0-49→COLD). LLM temperature suggestion is advisory only — the application enforces classification.
**Rationale:**
- Existing `score` (integer 0-100) maps directly to qualification score — no new column needed
- `tags` (text[]) stores buying signals as searchable tags
- `metadata` (jsonb) stores the full qualification result (temperature, intent, confidence, buyingSignals, risks, recommendedAction, summary, qualifiedAt, model, tokens)
- Deterministic temperature derivation prevents LLM from inventing mismatched classifications (score=85, temperature="COLD" is impossible)
- Post-processing validates and clamps all fields — malformed LLM output is rejected at the application layer
- Re-qualification overwrites previous qualification data (latest wins model)
- Qualification is explicitly triggered (not automatic) — prevents unnecessary API costs
- Tenant isolation: `getLeadById()` + RLs verifies lead belongs to user's org before qualification
- When qualification produces HOT result and lead is "new", an AI conversation summary is auto-created for the activity timeline

### DR-019: External Lead Ingestion with API Key Authentication
**Date:** 2026-08-07
**Decision:** Use `source_api_keys` table for API key authentication on `POST /api/leads`. Service role bypasses RLS for unauthenticated insertion. `source_external_id` provides idempotency.
**Rationale:**
- API keys use format `ag_live_<random-hex>` — SHA-256 hash stored in `source_api_keys.key_hash`. Raw key never stored.
- `x-api-key` header resolves to organization_id server-side. Request body never contains organization_id.
- Source from API key ("website"|"tally"|"n8n"|"api") mapped to leads.source constraint values ("tally"/"n8n"/"api" → "other")
- Service role client needed because RLS `is_org_member()` requires `auth.uid()` — API requests have no authenticated user
- `source_external_id` column + partial unique index WHERE NOT NULL provides database-level idempotency
- Duplicate submissions return 200 with existing lead (idempotent), not 409 conflict
- Rate limiting: in-memory per IP (30/min window). Production requires Redis/Upstash
- n8n webhook delivery: non-blocking, 5s timeout, HMAC-SHA256 signature header. Lead persists even if webhook fails
- AI qualification NOT triggered from API — ingestion and qualification are separate concerns
