# CHANGELOG

## [0.3.5] — 2026-08-07

### Changed (Phase 3.5 — Premium Polish)
- **Architecture:** Dashboard layout converted to Server Component; only Sidebar/TopNav remain Client Components
- **Performance:** Removed framer-motion (~34KB bundle savings); all animations now use native CSS keyframes
- **UX:** Created `/signup` page with registration form; all CTAs now route to signup instead of public dashboard
- **UX:** FAQ converted to native `<details>` element — accessible without JavaScript
- **UX:** Testimonials redesigned as CSS scroll-snap carousel with mixed 4/5 star ratings for credibility
- **UX:** TrustedBy section replaced fake company names with real statistics (10K+ users, 2.4M+ leads, 97.3% accuracy)
- **UX:** Hero dashboard mockup upgraded with real-looking stats cards and activity feed
- **UX:** Fixed mobile sidebar — hamburger menu now properly toggles sidebar with overlay backdrop
- **UX:** "Coming in Phase 5" changed to "Calendar integration launching soon"
- **UX:** Pricing popular card uses `ring-2` instead of `scale-[1.02]` for visual consistency
- **Accessibility:** Added skip-to-content link in root layout
- **Accessibility:** Hero badge icons changed from duplicate BarChart3 to semantic CreditCard/Clock/ShieldCheck
- **Accessibility:** Added `prefers-reduced-motion` media query disabling all animations
- **Accessibility:** Sidebar disabled items use `<span>` instead of `<a href="#">` to prevent accidental navigation
- **Performance:** Added `loading.tsx` and `error.tsx` for dashboard routes
- **Performance:** Added `content-visibility: auto` CSS utilities for below-fold sections
- **Performance:** Added `scrollbar-hide` utility for carousel overflow
- **Design:** Low-contrast `text-zinc-400` replaced with `text-zinc-500` where appropriate
- **Bug:** Fixed SVG gradient ID collision in LineChart using `useId()`
- **SEO:** Added `generateMetadata` to Server Component dashboard pages (Dashboard, Analytics)
- **Dependencies:** Removed framer-motion from production bundle

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
