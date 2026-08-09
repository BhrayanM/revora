# Phase 14.4E — Branding Refresh + Premium UX Audit and Implementation Plan

**Date:** 2026-08-09
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Baseline checkpoint:** `82ff0f8 feat(orgs): add secure ownership transfers`
**Status:** Planning complete — **awaiting approval; no production implementation has begun.**

## Scope and guardrails

Phase 14.4E is a visual, content, and interaction-system refresh intended to
position the product as a premium AI revenue automation SaaS. It is not a
security, database, authorization, or identity phase.

The following were reviewed and remain out of scope for this work:

- Supabase migrations `00001` through `00025`, RLS policies, RPC grants, and
  database authorization rules;
- RBAC, active-organization resolution, and ownership-transfer invariants;
- password, OAuth/PKCE, MFA/AAL2, Turnstile, onboarding, invitation, and
  ownership-transfer logic;
- legal-consent persistence and enforcement;
- changes to production delivery behavior, token handling, cookies, or
  service-role use.

The Phase 14.4D handoffs were read before this audit. They establish that
current tenant selection is an HttpOnly, server-validated preference; team,
invitation, and ownership actions are independently database-authorized; and
all visual work must preserve those boundaries.

## Audit method and baseline

The working tree was clean at the stated checkpoint and no code or database
files were changed during the audit. Source, route, component, theme, metadata,
and public-asset inventories were inspected. A browser session was unavailable,
so visual findings are source-audited rather than browser-verified. The manual
browser checklist below is therefore a required release gate.

The application is Next.js 16.3 / React 19 / Tailwind CSS 4 and already has:

- a reusable UI layer (`Button`, `Card`, `Input`, `Modal`, `Badge`, `Alert`,
  `Toast`, `Table`, `EmptyState`, loading primitives);
- a three-option, client-side System / Light / Dark theme preference;
- responsive public, auth, dashboard, Team, and legal surfaces;
- a dashboard shell with a server-resolved organization context; and
- accessible foundations including a skip link, visible focus treatments,
  semantic labels, reduced-motion overrides, and keyboard support in the
  organization switcher/theme controls.

## Current-state UI audit

### Landing page

`src/app/page.tsx` composes a complete long-form marketing page: fixed
navigation, hero, social-proof statistic strip, feature grid, benefit metrics,
linear workflow, integrations, pseudo-demo, testimonials, pricing, FAQ, CTA,
and footer. It is responsive and consistently uses shared colors, cards, and
the `BackgroundPattern` component.

Strengths:

- Clear product breadth and an existing information hierarchy.
- Hero and demo use app-like visualizations rather than requiring image assets.
- The compact mobile navigation and FAQ use native/accessible interaction
patterns.

Refresh opportunities:

- The current indigo/cyan/violet gradients, sparkles, rounded cards, and
  browser-window mockups read as a general AI template rather than an
  enterprise revenue system.
- The hero puts both primary actions at equal visual weight; `Watch Demo` and
  several other marketing buttons do not currently lead to a real destination.
- Workflow steps animate on initial render, not when entering the viewport;
  there is no actual interactive workflow narrative.
- Several statistics, customer counts, testimonials, integration claims,
  pricing promises, and SLA claims appear hard-coded. They must be substantiated
  before retaining them, or replaced with approved, non-numeric copy.
- Footer resource/social links use `#` placeholders; they should not receive a
  visual promotion until a destination exists.

### Authentication and sensitive acceptance pages

The shared `AuthShell` / `AuthCard` system gives login, signup, recovery,
verification, MFA, email change, legal consent, invitation acceptance, and
ownership-transfer acceptance a coherent visual frame. It already supports
status, warning, success, loading, and focused form states.

The visual refresh may update the shell, mark, token usage, spacing, and copy
only. It must not alter form field names, routes, redirect validation,
Turnstile behavior, OAuth provider handling, legal checkbox behavior, or the
invite/transfer state machines. These pages are security-critical and require
functional regression testing after any style-only update.

### Dashboard, sidebar, and navigation

The dashboard has an established responsive shell: fixed/collapsible sidebar,
sticky top navigation, theme picker, organization switcher, KPI cards,
pipeline/automation activity, custom SVG charts, and localized empty states.
The selected organization is passed from the server and the switcher invokes a
Server Action; the UI must continue to treat it as display state only.

The dashboard can feel more premium by standardizing dense data surfaces,
elevating hierarchy around organization context and page actions, and using an
intentional monochrome treatment rather than four brand-accent colors. Current
empty states are helpful but vary by page and do not form a clear first-run
journey. A shared onboarding/empty-state pattern can provide a small sequence
of real next steps without inventing onboarding state or changing permissions.

The sidebar’s inline sparkle mark differs from the public/auth mark. The top
navigation also contains a `button` inside a `Link`, and several marketing
CTAs wrap a `Button` in a `Link`; the implementation phase should remove these
nested interactive controls as part of the shared action/brand refactor.

### Settings, Team, profile, and legal pages

Settings uses a sensible section list, cards, forms, security accordions,
integration/API-key views, and the existing theme control. Team Management is
the most mature high-stakes workspace: role-aware actions, confirmations,
pending states, toast feedback, invitation states, ownership-transfer states,
and audit history already use shared primitives.

The refresh should make these workflows calmer and clearer, particularly
high-impact confirmation states, but must preserve their present wording where
it communicates a security guarantee unless product/security review approves a
copy change. The Terms and Privacy routes render current database-backed legal
documents. Their legal content is not hard-coded in the application and must
not be renamed as a design task; it needs separate legal approval and a
versioned legal-document process.

### Empty, loading, and error states

There are useful page-specific empty states in Dashboard, Analytics, Leads,
Pipeline, Automation, Notifications, API Keys, Team, and Profile. They vary in
icon scale, card containment, CTA treatment, and helpfulness. The shared
`EmptyState` primitive is available but underused.

Dashboard route loading is a centered spinner and message; Team has a separate
route loading state; tables use skeleton rows. The refresh should introduce a
small set of layout-preserving skeleton recipes (page header, KPI, table,
kanban, side-panel) and reserve full-page spinners for actual route
transitions. Dashboard error handling is already explicit but visually basic.

### Component and accessibility findings

- Buttons, inputs, cards, badges, alerts, and theme controls consistently use
  shared tokens and visible focus rings. This is a strong base for a migration.
- `Modal` supports Escape and backdrop dismissal but does not currently manage
  initial focus, return focus, or trap focus. Any modal visual rewrite should
  fix that behavior without changing action semantics.
- Generic sortable table headers are click handlers on `th` elements, so they
  are not keyboard-operable buttons. This is an existing accessibility issue
  worth correcting in the component pass.
- Toasts use `role="alert"`, but no dedicated live-region container; their exit
  class (`animate-fade-out`) has no matching global keyframe. The component pass
  should provide a defined reduced-motion-safe exit transition and robust
  announcement behavior.
- The mobile public-nav trigger should gain `aria-expanded` and
  `aria-controls`; the mobile dashboard sidebar would benefit from focus
  management while open.
- Existing global reduced-motion rules cover the named animation utilities.
  Future scroll effects must respect `prefers-reduced-motion`, be optional, and
  never conceal content until JavaScript runs.

## Current branding inventory

### Public-facing identity

- The product name **AI Growth** appears in the root metadata, public nav,
  footer, hero mockup, landing copy, testimonials, integrations copy, CTA,
  benefits, auth mark, dashboard sidebar, Team heading, and theme appearance
  copy.
- The visual mark is duplicated as inline SVG sparkles in the public navbar,
  public footer, and sidebar; auth uses a Lucide `Sparkles` icon instead. There
  is no shared brand component or public logo asset.
- `src/app/favicon.ico` is the only app icon. `public/` contains only default
  starter SVG assets; there is no manifest, OG image, or dedicated brand logo.
- Root metadata identifies the product as “AI Growth | End-to-End AI Business
  Automation,” supplies AI-business-automation copy/keywords, and has an
  `AI Growth` Open Graph title and author. Route-level titles repeat the name
  for Dashboard, Analytics, Leads, Automation, Team, invitations, ownership
  transfer, legal consent, Terms, and Privacy.

### Copy, placeholders, and documents

- Auth placeholders are generic (`you@company.com`); Team uses
  `teammate@company.com`; no customer-facing support address was found in
  application source.
- The newsletter input and inactive footer/social/resource links are
  presentation-only today and have no connected delivery/destination.
- Legal route titles and consent explanatory copy mention AI Growth. The legal
  body itself is retrieved from current legal-document records and must be
  treated as separately governed content.
- Existing product/deployment/readme and n8n documentation contain additional
  AI Growth references. They are documentation/operational scope, not part of
  this visual implementation unless a later approved rename explicitly adds
  them.

### Technical identifiers that are **not** brand-copy migration targets

The following contain legacy naming but are security/operational identifiers,
not display copy: `ai-growth-theme` local storage, `ai_growth_*` HttpOnly
cookies, the `ai-growth-platform` repository/image/tag naming, and internal
CRM/n8n labels. Renaming them would create unnecessary session, preference,
integration, and deployment risk. They should remain untouched unless a future
dedicated compatibility migration is approved.

The MFA issuer (`AI Growth Platform`) is authentication metadata, not a visual
label. Changing it would affect authenticator recognition and is explicitly
out of scope.

## Existing design system

### Colors and surfaces

The current system is indigo-first: primary `#6366f1`, cyan secondary
`#06b6d4`, violet accent `#8b5cf6`, with semantic green/amber/red. Light mode
uses cool off-white canvas/surfaces; dark mode uses graphite (`#0f1115`
canvas, `#111318` background, `#15181e` surface) with indigo active states.
Tokens already exist for canvas, surfaces, borders, inputs, sidebar, muted
text, and semantic status colors. This is the correct migration seam: update
semantic tokens rather than mass-replacing utility classes.

### Type, space, shape, and elevation

Geist and Geist Mono are loaded through `next/font`. Type emphasizes bold,
tight dashboard headings and regular body copy. The system uses a practical
4px-derived Tailwind rhythm, 6/8/12/16/24px radii, and modest cool-grey
shadows. Cards are generally rounded-xl with a border and hover shadow. This
is visually consistent but not yet distinctive.

### Motion and themes

Global motion consists of fade, slide, scale, glow, shimmer, pulse, and
transition utilities. It is CSS-only; `MotionWrapper` has no viewport observer
despite a `once` prop. System/Light/Dark preference persists in local storage,
is applied before hydration, and responds to an operating-system change when
System is selected. This behavior must be preserved.

## Recommended branding direction

### Proposed direction: Revora (exploratory, not adopted yet)

Use **Revora** only as the candidate brand in design explorations until the
name, trademark, legal entity, and `saasrevora.com` ownership/redirect plan are
confirmed. Do not rename the application, cookies, database, emails, legal
documents, or operational identifiers in Phase 14.4E planning.

Recommended positioning:

> AI revenue automation for teams that need every qualified signal to become
> a repeatable revenue workflow.

The proposed visual language is a dark, restrained, enterprise interface:

- near-black layered surfaces, white and near-white type, quiet neutral
  borders, and semantic status colors;
- a simple white geometric triangle/rising-form mark, paired with a precise
  wordmark; create it once as an accessible shared vector component rather
  than duplicating icon paths;
- strong information hierarchy, compact data density, and deliberate empty
  space instead of gradients and decorative color;
- a single restrained signal color only where it conveys state or action; no
  multi-hue AI gradients in the core product;
- retained light and System themes, derived from the same neutral semantic
  tokens. Dark can become the launch default only after an explicit product
  decision; current System behavior should not be changed speculatively.

Suggested token intent for the future approved implementation:

| Role | Dark premium direction | Light equivalent |
| --- | --- | --- |
| Canvas / background | true black through graphite (`#070707` / `#0c0c0d`) | warm-neutral white / pale grey |
| Elevated surfaces | restrained graphite with white-8–12% borders | white with neutral grey borders |
| Primary action / wordmark | white or near-white on dark surfaces | near-black on light surfaces |
| Focus ring | high-contrast neutral/approved signal at 3:1+ | same semantic focus color |
| Status | retain distinct green, amber, red with text contrast | retain matching semantic values |

Final values must be tested for WCAG 2.2 AA: 4.5:1 normal text, 3:1 large
text/UI boundaries where applicable, and a 3:1 visible focus indicator.

## Branding migration strategy

1. **Decide identity before rename.** Confirm candidate name, legal entity,
   trademark/domain status, canonical app/marketing URLs, sending domain,
   approved claims, and whether dark or System remains the default.
2. **Build a compatibility-safe presentation layer.** Add one shared brand
   mark/lockup, semantic neutral tokens, and reusable action/surface/loading
   patterns. Keep all current security and persistence identifiers.
3. **Refresh public storytelling.** Replace generic growth claims with approved
   revenue-automation language, an honest workflow visualization based on
   supported product capabilities, clear CTA destinations, and optional
   reduced-motion scroll reveals.
4. **Refresh product surfaces.** Apply the component system to sidebar,
   dashboard, settings, Team, forms, confirmation modals, empty states, and
   loading states without changing server/client data contracts.
5. **Rename only after separate approval.** Update visible product copy,
   metadata, icons, social/OG assets, and approved transactional templates as
   a controlled display-name migration. Legal documents, MFA issuer, cookies,
   repository naming, and infrastructure config need separate owners and
   compatibility plans.

## Proposed implementation phases

### Phase E.0 — Approval inputs (no code)

- Approve/reject Revora and the triangle mark direction.
- Supply approved value proposition, proof points, customer quotes/logos,
  pricing/plan truth, demo destination, sales/contact destination, and footer
  links.
- Confirm brand/domain/legal ownership and decide whether a display-name
  migration is included now or deferred.

### Phase E.1 — Foundations and accessibility hardening

- Read the applicable Next.js 16 metadata/icon guidance before editing route
  metadata or App Router icon files.
- Introduce a shared brand mark/lockup and replace duplicated inline marks.
- Retune semantic CSS tokens for premium dark/light/system themes; preserve
  theme initialization, storage key, and preference behavior.
- Refine buttons, cards, inputs, badges, alerts, table controls, toasts,
  modals, skeletons, focus treatments, and reduced-motion behavior.
- Correct nested interactive controls, modal focus lifecycle, mobile-menu
  semantics, and sortable-table keyboard access.

### Phase E.2 — Landing and marketing narrative

- Rebuild the hero around AI revenue automation and a clear primary/secondary
  CTA hierarchy.
- Replace decorative pseudo-demo content with an accessible, progressively
  enhanced workflow visualization; use motion only when reduced motion is not
  requested.
- Refresh sections, social proof, pricing, testimonials, integrations, and
  footer only with approved facts and live destinations. Remove or mark as
  unavailable any unsupported claim/link.
- Add branded icon/OG assets and approved metadata only if the brand-name
  decision is made.

### Phase E.3 — Application polish and onboarding

- Rework the dashboard shell, sidebar, top navigation, organization switcher
  presentation, KPI/data surfaces, charts, pipeline cards, and activity views.
- Introduce consistent first-run and no-data experiences with genuine next
  steps: add a lead, connect an existing supported integration, or invite a
  permitted teammate. Do not reveal options a role cannot use.
- Update settings, API keys, integrations, profile, notifications, Team,
  invitation, and ownership-transfer presentation using the refined primitives.

### Phase E.4 — Auth, legal presentation, and validation

- Apply the approved visual frame/mark to all auth and secure acceptance
  screens, keeping flow logic byte-for-byte isolated where practical.
- Update public route titles and legal-consent explanatory labels only after
  display-name/legal approval. Do not alter database legal bodies without the
  legal content workflow.
- Perform full browser, accessibility, responsive, theme, and security-flow
  regression testing; then run lint, typecheck, build, format check, and diff
  checks.

## Expected file scope after approval

The exact diff depends on Phase E.0 decisions. Expected presentation files are:

| Area | Likely files |
| --- | --- |
| Design tokens and root metadata | `src/app/globals.css`, `src/app/layout.tsx`, approved App Router icon/OG asset files |
| Shared brand/UI | new `src/components/brand/*`; `src/components/ui/{button,card,input,modal,toast,table,empty-state,loading,motion}.tsx`; `src/components/shared/background-pattern.tsx` |
| Themes | `src/components/theme/{theme-provider,theme-script,theme-toggle,theme-appearance}.tsx` (visual copy/tokens only) |
| Marketing | all `src/components/landing/*` and `src/app/page.tsx` |
| Dashboard | `src/components/dashboard/{dashboard-shell,sidebar,top-nav,organization-switcher,stat-widget,ai-insights,charts}.tsx`; relevant dashboard page and empty-state files |
| Product settings | `settings-content`, `security-panel`, `integrations-panel`, `api-keys-panel`, `profile-content`, `team-management-content`, and affected dashboard route pages |
| Auth / acceptance | `src/components/auth/{auth-shell,social-auth}.tsx`; login, signup, recovery, verification, MFA, email-change, invite acceptance, ownership-transfer acceptance, and legal-consent presentation routes |
| Legal / public metadata | `src/app/{terms,privacy,legal/consent}/page.tsx`, `src/components/legal/legal-document-page.tsx`, only subject to approved name/legal scope |

Explicitly not expected to change: `supabase/migrations/**`, RLS/RPC SQL,
`src/lib/auth/**` security behavior, invitation/ownership token modules,
permission logic, OAuth/Turnstile/MFA action logic, cookie names, or
server-side authorization contracts. Code-review can reject any change that
crosses these boundaries.

## Risk assessment and mitigations

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Premature use of Revora or `saasrevora.com` | High | Keep it proposal-only until legal, trademark, DNS, and business approval are recorded. |
| Legal document or consent mismatch | High | Keep DB-backed legal text immutable in this phase; involve legal for a versioned update before changing any legal brand references. |
| Security-flow regression from auth/acceptance styling | High | Isolate markup/style changes; execute normal, invited, MFA, OAuth, Turnstile, legal, and transfer-flow browser checks. |
| Tenant/RBAC regression from dashboard refactor | High | Do not alter authorization/context modules; test each role and organization switch with real sessions. |
| Loss of accessibility through dark visuals/motion | Medium | Token contrast review, keyboard and screen-reader checks, visible focus test, and reduced-motion checks are release criteria. |
| Inconsistent brand mark / stale icon caches | Medium | Use one mark component and versioned App Router icon/metadata assets; verify in fresh browser profiles. |
| Misleading marketing claims or dead CTAs | Medium | Replace unverified values/links with approved factual copy or remove them before release. |
| Theme preference regression / flash | Medium | Preserve pre-hydration theme script and storage key; test System behavior and first paint. |

## Required manual browser testing checklist

### Visual, responsive, and theme coverage

- [ ] Test landing, auth, dashboard, settings, Team, legal, invite, and
  ownership-transfer routes at approximately 375px, 768px, and 1440px widths.
- [ ] Test Light, Dark, and System themes; change OS theme while System is
  selected and verify first paint has no incorrect flash.
- [ ] Verify the logo/wordmark, favicon, metadata previews, page titles, and
  approved brand copy are consistent across all visible routes.
- [ ] Confirm every CTA, footer item, and social/resource destination is live
  or intentionally absent; confirm no placeholder `#` navigation remains.
- [ ] Confirm motion is subtle, does not cause layout shift, and is disabled or
  static with `prefers-reduced-motion`.

### Accessibility

- [ ] Navigate every menu, form, modal, toast dismissal, Team action, theme
  selector, and organization switcher by keyboard only.
- [ ] Confirm the skip link works; focus is visible on all interactive
  elements; dialogs contain/restore focus; Escape/outside dismissal matches
  the intended action state.
- [ ] Check semantic buttons/links, mobile nav expanded state, table sorting,
  alert/toast announcements, form errors, and chart text alternatives.
- [ ] Run automated accessibility checks and manually confirm AA contrast for
  text, controls, selected states, errors, and focus indicators.

### Functional and security regression

- [ ] Normal password signup/login with positive and negative Turnstile cases.
- [ ] Google/Microsoft (and enabled provider) OAuth/PKCE return paths.
- [ ] Email verification, password reset, email change, and enrolled MFA/AAL2
  challenge flows.
- [ ] Legal-consent routing and acceptance; no legal checkbox behavior change.
- [ ] Valid, expired, revoked, wrong-account, and replayed invitation states;
  no raw invitation token in the URL after capture or in UI outside approved
  development behavior.
- [ ] Ownership-transfer creation, cancel/reject/expire/replay/wrong-account
  states; owner/admin permissions and prior-owner refresh behavior.
- [ ] Owner, admin, manager, agent, viewer, suspended, and removed Team page
  behavior and controls.
- [ ] Multi-organization selection, foreign/stale selection rejection, direct
  lead-route transition, and full data refresh when switching organizations.
- [ ] Empty/loading/error states on Dashboard, Leads, Pipeline, Automation,
  Analytics, API Keys, Notifications, Team, and Settings.

### Automated validation after implementation

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run format:check`
- [ ] `git diff --check`

## Approval gate

No production code, migrations, commits, or pushes have been made for Phase
14.4E. Implementation may begin only after review of this plan and explicit
approval of the candidate brand scope, approved marketing claims/destinations,
and the display-name/domain decision.
