# AI Growth Platform — Phase 14.4B.10 Completion Handoff

**Date:** 2026-08-08
**Repository:** `C:\Users\bhray\ai-growth-platform`
**Branch:** `master`
**Current implementation commit:** `098bfeb51595ca84ec687e501dc34d0180086fc2`
**Commit message:** `feat(legal): add versioned consent enforcement`
**Remote status:** local only — do not push

## Status

Phase **14.4B.10 — Terms + Privacy + Versioned Legal Consent** is code-complete and locally validated. The new database migration has been created but has **not** been applied to any Supabase environment.

## Migration Status

- Migrations `00001` through `00016` are unchanged and remain immutable.
- New migration: `supabase/migrations/00017_versioned_legal_consent.sql`.
- Local migration file is ready for the established Supabase migration workflow.
- Remote migration status for `00017` is **pending**; do not treat the legal pages or consent guard as live until it is applied and verified.

`00017` adds:

- `legal_document_versions`: append-only Terms of Service, Privacy Policy, and optional Marketing Communications Consent versions.
- `user_legal_consents`: immutable per-user acceptance records linked to the exact accepted version.
- Indexes for current-version and user-consent lookups.
- RLS policies: effective legal documents are publicly readable; consent history is readable and appendable only by its authenticated user.
- Triggers that reject legal-document updates/deletes and set acceptance timestamps in the database.

## Completed Features

- Public `/terms` and `/privacy` pages render the current effective legal-document versions.
- Footer legal links now route to those pages.
- Signup requires affirmative Terms and Privacy acceptance before email or OAuth signup can begin.
- OAuth signup buttons are disabled until required legal acceptance is checked; the existing PKCE OAuth implementation remains unchanged.
- Authenticated `/legal/consent` supports required Terms/Privacy re-consent and optional marketing consent.
- `/auth/callback` verifies current required consent **before** calling the service-role-only `onboard_user` RPC.
- The dashboard layout blocks users who lack current required consent before its existing onboarding recovery and MFA checks.
- The organization data-access helper and profile mutations also require current legal consent, preventing direct protected-data actions from bypassing the UI gate.
- Supabase type definitions include the new legal tables.

## Security Model Preserved

- Existing organization-scoped RLS and all auth flows are intact.
- Legal consent is intentionally **user-scoped**, not organization-scoped, because consent is collected before a new organization is provisioned.
- Legal-consent writes use the authenticated Supabase client under RLS. No new service-role path and no new SECURITY DEFINER RPC was introduced.
- Users cannot create consent records for another user, backdate acceptance, update records, or delete records.
- The proxy remains an optimistic session check; database-backed consent enforcement lives in the callback, dashboard, and data-access layer as recommended for server-side authorization.
- MFA remains enforced before dashboard access. Email OTP and PKCE OAuth redirect through the same callback gate.

## Validation Completed

- `npm run lint` — pass
- `npx tsc --noEmit` — pass
- `npm run build` — pass (25 routes, including `/terms`, `/privacy`, and `/legal/consent`)
- `git diff --check` — pass before checkpoint commit
- Commit hooks — ESLint and Prettier pass

## Pending Manual Actions

1. Apply and verify migration `00017_versioned_legal_consent.sql` using the established Supabase migration workflow. Do not modify earlier migrations.
2. Run live E2E checks after migration application:
   - email/password signup → email OTP → legal consent → onboarding → dashboard;
   - Google OAuth signup → legal consent → onboarding → dashboard;
   - Microsoft OAuth signup → legal consent → onboarding → dashboard;
   - existing user login/re-consent, including MFA-enabled users;
   - direct dashboard and protected-action access without consent is blocked;
   - RLS checks: users can read only their own consent history and cannot update/delete it.
3. Have qualified legal counsel review the seeded Terms, Privacy, and marketing-consent drafts before production use.
4. Publish counsel-approved copy as new legal-document versions. Existing rows are intentionally immutable; do not edit them in place.
5. Complete the pre-existing Custom SMTP work before treating email OTP E2E as fully unblocked.

## Next Recommended Phase

After migration deployment and the legal/auth E2E checks pass, proceed to **Phase 14.4C — Auth Visual Polish**.

Do not begin Team Management (Phase 14.4D) or Phase 14.5 without explicit authorization.

## Warnings

- Applying `00017` makes Terms and Privacy acceptance a hard access requirement. Existing users without current records will be redirected to `/legal/consent` before dashboard access.
- The seeded legal content is a product draft, not production-approved legal advice or final contractual copy.
- Migration `00017` is pending only; this handoff does not authorize applying it to Supabase.
- Do not reintroduce custom MFA recovery codes or weaken AAL2, OAuth, OTP, onboarding, or RLS controls while testing.
- Do not push the local commits or this handoff unless explicitly instructed.
