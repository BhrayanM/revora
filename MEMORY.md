# MEMORY

**Purpose:** Context continuity for multiple agents working on this project.

## Project Identity

- **Name:** AI Growth Platform
- **Tagline:** End-to-End AI Business Automation Platform
- **Primary Goal:** Production-grade SaaS for AI-powered business automation
- **Target Audience:** Businesses needing AI automation, CRM, lead qualification

## Architecture Principles

1. **Modular by design** — Every feature is a self-contained module
2. **Design System first** — All UI built from `src/components/ui/`
3. **TypeScript strict** — No `any` unless absolutely necessary
4. **Mobile-first responsive** — All components work on mobile
5. **Dark mode ready** — CSS variables drive theming
6. **SOLID principles** — Single responsibility, dependency injection
7. **No premature optimization** — But keep code clean from start

## Component Organization

```
src/components/
├── ui/          → Design System primitives (Button, Input, Card, etc.)
├── landing/     → Landing page specific components
├── dashboard/   → Dashboard specific components
└── shared/      → Cross-cutting components (Navbar, Footer, etc.)
```

## File Naming Conventions

- Components: `kebab-case.tsx` (e.g., `primary-button.tsx`)
- Utilities: `kebab-case.ts` (e.g., `format-date.ts`)
- Types: `kebab-case.ts` (e.g., `lead-types.ts`)
- Hooks: `use-kebab-case.ts` (e.g., `use-media-query.ts`)

## Route Groups

- `(landing)` — Public-facing marketing pages
- `(dashboard)` — Authenticated dashboard pages (auth guard planned Phase 4)

## State Management Strategy

- Phase 1-3: React Server Components + local state
- Phase 4+: React Context for auth/user, SWR or React Query for server state
- No global state library yet — evaluate need in Phase 5

## Key Files

- `src/app/globals.css` — Design tokens and theme
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/types/index.ts` — Shared TypeScript types
- `.env` — Environment variables (git-ignored)
- `.env.example` — Template for env vars

## Known Limitations (Current)

- No backend/API yet (Phase 4)
- No authentication (Phase 4)
- Dashboard data is static/mock
- No database connection (Phase 4)
- Charts are placeholder/simplified

## When Resuming Work

1. Read this file first
2. Check PROJECT_STATUS.md for current phase
3. Check CHANGELOG.md for recent changes
4. Read ARCHITECTURE.md for detailed architecture
5. Read DECISIONS.md for rationale behind choices
6. Run `npm run dev` to see current state
7. Run `npm run typecheck && npm run lint` to ensure cleanliness
