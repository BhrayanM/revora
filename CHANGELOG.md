# CHANGELOG

## [0.3.0] — 2026-08-07

### Added (Phase 3 — Dashboard UI)
- Sidebar navigation with collapsible sections
- Top navigation bar with search, notifications, profile
- Dashboard overview page with KPI widgets and charts
- Analytics page with lead metrics and conversion charts
- Lead management table with status badges and actions
- Lead detail view with timeline, notes, and AI score
- Pipeline kanban board layout
- Settings page with sections (general, notifications, integrations)
- Profile page with avatar, info, and preferences
- Notifications panel with read/unread states
- Charts: line chart, bar chart, donut chart (simplified SVG)
- Activity feed with timeline
- Calendar placeholder
- AI Insights placeholder widget
- Dashboard shared layout with Sidebar + TopNav

## [0.2.0] — 2026-08-07

### Added (Phase 2 — Landing Premium)
- Navbar with scroll effect, mobile hamburger menu, CTA button
- Hero section with gradient text, animated illustration, CTA buttons
- Trusted By section with company logos (placeholder)
- Features grid with icon cards
- Benefits section with alternating layout
- AI Workflow visualization (5-step process)
- Integrations showcase (12+ integration cards)
- Demo section with interactive mock and stats
- Testimonials carousel with avatar cards
- Pricing table (3 tiers) with feature lists
- FAQ accordion section
- Final CTA section with gradient background
- Footer with multi-column layout, links, social icons
- Background pattern component (grid, dots)
- Section wrapper component with consistent spacing
- All landing sections are responsive

## [0.1.0] — 2026-08-07

### Added (Phase 1 — Design System)
- Design tokens (colors, typography, spacing, shadows, animations)
- Button component (6 variants, 4 sizes, loading state)
- Input component (with label, error, helper text, icon support)
- Card component (with header, content, footer slots)
- Badge component (6 variants, 3 sizes)
- Alert component (4 variants: info, success, warning, error)
- Toast component (4 variants, auto-dismiss)
- Modal component (with overlay, close button, sizes)
- Table component (with header, body, sorting, pagination)
- Loading states (spinner, skeleton, page loader)
- Empty state component (with icon, title, description, action)
- Motion primitives (FadeIn, SlideUp, ScaleIn, StaggerChildren)
- Dark mode preparation via CSS custom properties
- Container component for consistent max-width

## [0.0.1] — 2026-08-07

### Added (Phase 0 — Foundation)
- Next.js 16 with TypeScript strict mode
- Tailwind CSS v4 with custom theme configuration
- ESLint 9 (flat config) with Next.js and TypeScript rules
- Prettier with consistent formatting configuration
- Husky + lint-staged for pre-commit quality checks
- Docker + docker-compose (production and development)
- Environment variables template (.env.example)
- Project directory structure and architecture
- Core utility `cn()` function (clsx + tailwind-merge)
- Root layout with Geist font and metadata
- Documentation files (README, ROADMAP, MEMORY, ARCHITECTURE, DECISIONS)
