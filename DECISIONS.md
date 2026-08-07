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
