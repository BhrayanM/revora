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
