# Phase 14.4E.1B — Landing Progression + Signup UX Corrective Pass

**Date:** 2026-08-09
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Baseline:** `4bba7d3 fix(landing): clarify Revora workflow experience`
**Status:** Complete locally; the requested local commit follows this handoff. No push.

## Scope and guardrails

This pass is limited to the public landing progression, signup presentation, and OAuth-provider display order. It does not change Supabase migrations, RLS, RBAC, invitations, MFA, Turnstile behavior, OAuth callback behavior, ownership-transfer security, provisioning, redirect handling, or backend contracts.

## Root UX problems

1. The three capture/automate/scale cards used identical CTAs and had no visible relationship, which made one workflow appear to be three independent products or plans.
2. Signup displayed unimplemented trial, product-limit, integration, reporting, support, and commercial claims.

## Progression redesign

- The three stages now live in one labelled progression list, with textual stage labels: `01 / CAPTURAR`, `02 / AUTOMATIZAR`, and `03 / ESCALAR`.
- Connectors use a right arrow on large screens and a down arrow below the `lg` breakpoint. The stage labels and ordered text communicate sequence independently of the decorative connectors.
- The original concise stage descriptions and bullets remain intact.
- Per-card CTA buttons were removed. One primary CTA, `Empieza a construir con Revora`, follows the complete progression and links to `/signup`.
- The composition is horizontal on large screens and becomes a vertical, connected progression at smaller widths.

## Signup simplification

- Heading changed to `Start building with Revora`.
- Supporting copy changed to `Create your workspace and organize your revenue workflow.`
- The primary action is now `Create Account`.
- Removed the complete `Your free trial includes` panel and every unsupported statement in it, including the 14-day trial, credit-card, lead-limit, automation, integration, analytics, support, and response-time claims.
- Google, Microsoft, and Apple remain available in the same existing OAuth implementation; only their display order is now Google, Microsoft, Apple. Apple was not enabled or otherwise reconfigured.

## Legal-consent placement and OAuth behavior

The explicit Terms/Privacy checkbox remains immediately before the shared OAuth and email account-creation area. It is intentionally retained there because `SocialAuth` receives `requireLegalConsent` and disables active OAuth buttons until this state is accepted. The checkbox now explicitly explains that it is required before creating an account or continuing with a provider.

Email/password signup keeps its existing client-side consent guard. OAuth keeps its existing client-side disabled-state guard, OAuth provider parameters, PKCE callback route, and return path. Independently, `/auth/callback` still uses `hasCurrentLegalConsent` and redirects users without recorded current consent to `/legal/consent`; this server-side enforcement was not changed.

## Turnstile and security regression check

- Turnstile component, token state, failed/expired reset behavior, fail-closed create-account button, and Cloudflare widget presentation are unchanged.
- The diff is restricted to `pricing.tsx`, `signup/page.tsx`, and the provider ordering in `social-auth.tsx`.
- No server actions, callback routes, consent persistence, Supabase clients, migrations, policies, invitations, organization context, or RBAC code changed.

## Responsive and accessibility considerations

- At `lg` and above, three responsive cards fit as one connected horizontal sequence with fixed-size connectors; below `lg`, they stack vertically with down-arrow connectors.
- Progression cards have `min-w-0`, preserve natural content wrapping, and use a full-width CTA only on small screens.
- Signup loses the unsupported lower panel, reducing card height without changing the form fields, labels, focus styles, provider buttons, checkbox association, or Turnstile layout.
- The progression is exposed as a labelled list with stage numbers, so sequence does not depend exclusively on arrow visuals. Connectors are `aria-hidden`.

The in-app browser was unavailable in this environment. The responsive and theme behaviors above were verified from the responsive utility structure and existing semantic theme tokens, but runtime visual confirmation remains required before release.

## Required manual browser QA

- At 1440 px and 1600 px, confirm the three landing stages read left-to-right as one sequence, connectors remain centered, and only the final CTA appears.
- At 1024 px, confirm cards, connector circles, text wrapping, and the final CTA fit without horizontal overflow.
- At 768 px and 390 px, confirm cards stack in 01–03 order with visible down connectors, readable bullets, and a usable full-width mobile CTA.
- At 390 px, confirm signup’s consent text, provider controls, form labels, create-account button, Turnstile widget, and sign-in link are fully visible with no excessive gap.
- Repeat landing and signup checks in System, Light, and Dark themes; verify semantic contrast, focus rings, and disabled-provider contrast.
- Confirm Google/Microsoft remain disabled until the explicit checkbox is selected, Apple remains Coming soon, email signup remains disabled without consent or a Turnstile token, and a new OAuth user is still redirected to legal consent before application access.

## Validation

- `npm.cmd run lint` — passed
- `npm.cmd run typecheck` — passed
- `npm.cmd run build` — passed
- `npm.cmd audit` — passed; 0 vulnerabilities
- `git diff --check` — passed

## Commit and delivery

Create one local commit with `fix(ux): clarify Revora progression and signup`. Do not push. Stop after this corrective pass; do not begin Phase 14.5.
