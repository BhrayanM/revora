# ARCHITECTURE

## Overview

AI Growth Platform follows a layered architecture with clear separation of concerns.

```
┌─────────────────────────────────────────────────┐
│                  Presentation                    │
│  (Landing Pages, Dashboard, UI Components)      │
├─────────────────────────────────────────────────┤
│                 Application Logic                │
│     (Hooks, Context, State Management)           │
├─────────────────────────────────────────────────┤
│                  Data Layer                      │
│     (API Routes, Services, Database)             │
├─────────────────────────────────────────────────┤
│               External Integrations              │
│  (OpenAI, GoHighLevel, HubSpot, Twilio, Slack)  │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
ai-growth-platform/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (landing)/         # Landing page route group
│   │   │   └── page.tsx
│   │   ├── (dashboard)/       # Dashboard route group
│   │   │   ├── dashboard/
│   │   │   ├── analytics/
│   │   │   ├── leads/
│   │   │   ├── pipeline/
│   │   │   ├── settings/
│   │   │   ├── profile/
│   │   │   ├── notifications/
│   │   │   └── layout.tsx
│   │   ├── globals.css
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                # Design System primitives
│   │   ├── landing/           # Landing page sections
│   │   ├── dashboard/         # Dashboard components
│   │   └── shared/            # Cross-cutting components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities and helpers
│   ├── types/                 # TypeScript definitions
│   └── styles/                # Additional styles (if needed)
├── public/                    # Static assets
├── .husky/                    # Git hooks
├── docker-compose.yml         # Production Docker
├── docker-compose.dev.yml     # Development Docker
├── Dockerfile                 # Production build
├── Dockerfile.dev             # Development build
└── docs/                      # Architecture diagrams (future)
```

## Data Flow

```
User → Browser → Next.js (SSR/RSC) → API Routes → Services → Database
                                               → External APIs
```

## Component Architecture

Each UI component follows this pattern:

```tsx
// 1. Imports
import { type VariantProps, cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

// 2. Variants definition (CVA)
const componentVariants = cva("base-classes", {
  variants: { ... },
  defaultVariants: { ... },
});

// 3. Props type
type Props = ComponentPropsWithoutRef<"element"> & VariantProps<typeof componentVariants>;

// 4. Component
export function Component({ className, ...props }: Props) {
  return <element className={cn(componentVariants(), className)} {...props} />;
}
```

## Routing Strategy

- `(landing)/` — Public marketing site, no auth required
- `(dashboard)/` — Protected area, auth required (Phase 4+)
- Route groups allow separate layouts per section

## Theming

CSS custom properties drive the entire theme:

- Light/dark mode switchable via `.dark` class on `<html>`
- Color palette defined in `globals.css` @theme directive
- Semantic tokens: `--surface`, `--border`, `--foreground`

## Performance Strategy

- Server Components by default (RSC)
- Client Components only when interactive
- Image optimization via Next.js Image
- Font optimization via next/font (Geist)
- Route-based code splitting (automatic)
