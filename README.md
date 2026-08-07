# AI Growth Platform

**End-to-End AI Business Automation Platform**

A production-grade SaaS platform that integrates AI-powered lead qualification, appointment booking, multi-channel automation, and CRM capabilities into a unified dashboard experience.

## Tech Stack

| Category         | Technology                    |
| ---------------- | ----------------------------- |
| Framework        | Next.js 16 (App Router)       |
| Language         | TypeScript (Strict Mode)      |
| Styling          | Tailwind CSS v4               |
| UI Components    | Custom Design System + CVA    |
| Icons            | Lucide React                  |
| Animations       | Framer Motion + CSS           |
| Database         | PostgreSQL 16                 |
| Containerization | Docker + docker-compose       |
| Code Quality     | ESLint + Prettier + Husky     |

## Architecture

- `src/components/ui/` — Design System primitives
- `src/components/landing/` — Landing page components
- `src/components/dashboard/` — Dashboard components
- `src/components/shared/` — Cross-cutting components
- `src/lib/` — Utilities, helpers, constants
- `src/hooks/` — Custom React hooks
- `src/types/` — TypeScript type definitions
- `src/app/(landing)/` — Landing page route group
- `src/app/(dashboard)/` — Dashboard route group

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description              |
| ---------------- | ------------------------ |
| `npm run dev`    | Start development server |
| `npm run build`  | Production build         |
| `npm run lint`   | Run ESLint               |
| `npm run format` | Format with Prettier     |
| `npm run typecheck` | TypeScript check       |

## Docker

```bash
# Development
docker compose -f docker-compose.dev.yml up

# Production
docker compose up -d
```

## Environment Variables

See `.env.example` for all required environment variables.

## Project Status

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for current status.

## License

Private — All rights reserved.
