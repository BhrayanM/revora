# ROADMAP

## Phase 0 — Foundation ✅
- [x] Next.js 16 + TypeScript (Strict)
- [x] Tailwind CSS v4 + Design Tokens
- [x] ESLint + Prettier
- [x] Husky + lint-staged
- [x] Docker + docker-compose
- [x] Environment variables
- [x] Initial architecture
- [x] Documentation

## Phase 1 — Design System ✅
- [x] Design Tokens (colors, typography, spacing, shadows, animations)
- [x] Component primitives (Button, Input, Card, Badge, Alert, Toast, Modal, Table)
- [x] Loading / Empty / Error states
- [x] Dark mode preparation
- [x] Responsive utilities
- [x] Animations (CSS keyframes + animation-delay stagger)

## Phase 2 — Landing Premium ✅
- [x] Navbar with mobile menu
- [x] Hero section
- [x] Trusted By / Social Proof
- [x] Features grid
- [x] Benefits section
- [x] AI Workflow visualization
- [x] Integrations showcase
- [x] Demo / Interactive section
- [x] Testimonials
- [x] Pricing table
- [x] FAQ accordion
- [x] CTA section
- [x] Footer
- [x] Fully responsive

## Phase 3 — Dashboard UI ✅
- [x] Sidebar navigation
- [x] Top navigation bar
- [x] Dashboard overview
- [x] Analytics page
- [x] Lead table with actions
- [x] Lead detail view
- [x] Pipeline kanban view
- [x] Settings page
- [x] Profile page
- [x] Notifications panel
- [x] Charts and widgets
- [x] Recent activity feed
- [x] Calendar placeholder
- [x] AI Insights placeholder

## Phase 3.5 — Premium Polish ✅
- [x] Dashboard layout to Server Component (only Sidebar/TopNav as Client Components)
- [x] FAQ converted to native `<details>` element (accessible, zero JS)
- [x] Testimonials as CSS scroll-snap carousel (Server Component)
- [x] Removed framer-motion (~34KB bundle savings); all animations pure CSS
- [x] Created `/signup` page with registration form; all CTAs route correctly
- [x] TrustedBy section: real statistics replacing fake company names
- [x] Hero dashboard mockup upgraded with real-looking KPIs
- [x] Fixed mobile sidebar toggle with overlay backdrop
- [x] Added `loading.tsx` and `error.tsx` for dashboard routes
- [x] Accessibility: skip-to-content, semantic icons, reduced-motion support
- [x] Fixed SVG gradient ID collision with `useId()`
- [x] Added `generateMetadata` to Server Component pages (Dashboard, Analytics)
- [x] Pricing card uses `ring-2` instead of `scale-[1.02]` for visual consistency
- [x] Low-contrast `text-zinc-400` replaced with `text-zinc-500` where needed

## Phase 4 — Backend & Database (Planned)
- [ ] Prisma ORM setup
- [ ] PostgreSQL schema + migrations
- [ ] Authentication (NextAuth.js)
- [ ] User management
- [ ] Role-based access control

## Phase 5 — API & Integrations (Planned)
- [ ] REST API routes
- [ ] OpenAI integration
- [ ] GoHighLevel integration
- [ ] HubSpot integration
- [ ] Twilio (SMS) integration
- [ ] Slack integration
- [ ] n8n webhook integration
- [ ] Email automation (Resend/SendGrid)

## Phase 6 — AI Features (Planned)
- [ ] AI Lead Qualification engine
- [ ] AI-powered lead scoring
- [ ] Automated appointment booking
- [ ] Email generation (OpenAI)
- [ ] SMS automation flows
- [ ] AI insights dashboard
- [ ] Chatbot / conversational AI

## Phase 7 — Polish & Launch (Planned)
- [ ] End-to-end tests
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Monitoring (Sentry)
- [ ] Analytics (PostHog/Plausible)
- [ ] Documentation site
- [ ] Deployment pipeline
