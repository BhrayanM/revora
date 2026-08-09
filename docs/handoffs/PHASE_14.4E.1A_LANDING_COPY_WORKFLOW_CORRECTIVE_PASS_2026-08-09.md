# Phase 14.4E.1A — Landing Copy + Workflow Card Corrective Pass

**Date:** 2026-08-09
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Baseline:** `0251737 feat(brand): refresh Revora premium UX`
**Status:** Complete locally; the requested local commit follows this handoff. No push.

## Scope

This corrective pass is limited to the public landing-page workflow and the nearby growth/progression section. It does not modify authentication, RBAC, RLS, Supabase migrations, invitations, ownership transfer, MFA, Turnstile, or backend behavior.

## Root cause and fix

The workflow detail panel combined a `min-h-[23rem]` container with `overflow-hidden` and an absolutely positioned progress row. The progress row did not reserve vertical space, so longer active-state content could run beneath it and be hidden by the panel boundary.

The panel now uses a single CSS grid cell for every detail state. Each state still occupies the grid for sizing, while only the active state is visible and interactive. Therefore, the tallest responsive state establishes the panel height naturally and transitions do not move the surrounding layout. The progress row is now in normal document flow beneath the detail grid, so it cannot cover or clip the step footer.

## Copy updates

### Workflow

- Section label: `Cómo funciona Revora`
- Steps: `01 / CAPTURAR`, `02 / CALIFICAR`, `03 / COORDINAR`, and `04 / APRENDER`
- Replaced abstract English copy with concise Spanish explanations focused on capture, AI-supported prioritization, coordination, and workflow learning.
- Updated the visible footer action to `Continúa con el flujo de trabajo`; the final step uses `Listo para la siguiente señal`.

### Capture / automate / scale section

- Heading: `Empieza con tus leads. Automatiza el proceso. Escala con control.`
- Supporting copy: `Revora reúne la cualificación, el seguimiento y la coordinación del equipo en un mismo flujo de trabajo.`
- Cards now communicate concrete outcomes:
  - `Captura y califica`
  - `Automatiza y conecta`
  - `Escala con control`
- Each card uses the CTA `Comienza a construir`.

## Files changed

- `src/components/landing/ai-workflow.tsx`
- `src/components/landing/pricing.tsx`

## Responsive and theme verification

Implementation review confirms there is no fixed content height, absolutely positioned progress row, or width-constraining change in the corrected workflow panel. The detail grid sizes to its longest wrapped state, the progress bar follows it in flow, and the footer icon cannot shrink into the text.

The change continues to use existing semantic tokens (`surface`, `foreground`, `muted-foreground`, `border`, `primary`, and `primary-foreground`). No theme tokens or theme-selection behavior changed, so System, Light, and Dark mode behavior remains intact.

The in-app browser was unavailable in this environment, so visual verification at runtime remains a required manual release check.

## Required manual browser checks

- At 1440 px and 1600 px widths, activate each workflow state (01–04); confirm the detail copy, footer, and progress indicator are completely visible and the panel does not change height.
- At approximately 1024 px, 768 px, and 390 px widths, repeat all four workflow states; confirm no horizontal overflow, clipping, or progress/footer overlap.
- Confirm the workflow heading wraps naturally and all card CTAs remain visible and usable.
- Repeat the landing checks in Light, Dark, and System theme modes; confirm semantic contrast remains clear for body text, card borders, actions, and focus rings.
- Confirm `Captura y califica`, `Automatiza y conecta`, and `Escala con control` clearly communicate the progression without introducing unsupported claims.

## Validation

- `npm.cmd run lint` — passed
- `npm.cmd run typecheck` — passed
- `npm.cmd run build` — passed
- `npm.cmd audit` — passed; 0 vulnerabilities
- `git diff --check` — passed

## Commit and delivery

Create one local commit with the message `fix(landing): clarify Revora workflow experience`. Do not push. Stop after this corrective pass; do not begin Phase 14.5.
