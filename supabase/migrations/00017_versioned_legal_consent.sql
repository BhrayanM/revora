-- ============================================================================
-- AI Growth Platform - Versioned Legal Documents and Consent History
-- Phase 14.4B.10
--
-- Legal documents are immutable version records. User consent is account-level
-- (rather than organization-level) because it is collected before onboarding.
-- ============================================================================

create table if not exists public.legal_document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('terms', 'privacy', 'marketing')),
  version      text not null check (length(trim(version)) > 0),
  title        text not null,
  content      text not null,
  effective_at timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (document_type, version),
  unique (document_type, effective_at)
);

create index if not exists idx_legal_document_versions_current
  on public.legal_document_versions (document_type, effective_at desc);

create table if not exists public.user_legal_consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.legal_document_versions(id) on delete restrict,
  accepted_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, document_id)
);

create index if not exists idx_user_legal_consents_user_accepted
  on public.user_legal_consents (user_id, accepted_at desc);

-- The legal source of truth is append-only: publish a new version instead of
-- changing or deleting a version that may already have been accepted.
create or replace function public.prevent_legal_document_version_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Legal document versions are immutable. Publish a new version instead.';
end;
$$;

create trigger trg_legal_document_versions_immutable
  before update or delete on public.legal_document_versions
  for each row execute function public.prevent_legal_document_version_mutation();

-- Consent records are append-only audit records. The authenticated user's id
-- and the database timestamp are authoritative, never client-supplied values.
create or replace function public.prepare_legal_consent_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'A consent record may only be created for the authenticated user';
  end if;

  new.accepted_at = now();
  new.created_at = now();
  return new;
end;
$$;

create trigger trg_user_legal_consents_prepare_insert
  before insert on public.user_legal_consents
  for each row execute function public.prepare_legal_consent_insert();

alter table public.legal_document_versions enable row level security;
alter table public.user_legal_consents enable row level security;

-- Terms and Privacy pages are public. Future-dated versions remain private
-- until their effective date.
create policy "Anyone can read effective legal document versions"
  on public.legal_document_versions
  for select
  using (effective_at <= now());

-- Consent history is personal account data, not tenant data. Users can read
-- their own history, and may only append acceptance of the current effective
-- version for each required document. There are deliberately no UPDATE or
-- DELETE policies.
create policy "Users can read own legal consent history"
  on public.user_legal_consents
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can record current legal consent"
  on public.user_legal_consents
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.legal_document_versions document
      where document.id = user_legal_consents.document_id
        and document.effective_at <= now()
        and document.effective_at = (
          select max(current_document.effective_at)
          from public.legal_document_versions current_document
          where current_document.document_type = document.document_type
            and current_document.effective_at <= now()
        )
    )
  );

-- Trigger functions must only execute through their associated triggers.
revoke execute on function public.prevent_legal_document_version_mutation() from public, anon, authenticated;
revoke execute on function public.prepare_legal_consent_insert() from public, anon, authenticated;

-- Initial legal copy is a versioned product draft. It must receive legal review
-- and be replaced by a newly inserted version before production use.
insert into public.legal_document_versions (
  document_type,
  version,
  title,
  content,
  effective_at
)
values
  (
    'terms',
    '2026-08-08',
    'Terms of Service',
    $terms$
Terms of Service

Effective date: August 8, 2026

These Terms of Service govern your use of AI Growth Platform (the "Service"). By creating an account or using the Service, you agree to these Terms.

1. Accounts and access
You must provide accurate account information, keep your credentials confidential, and promptly notify us of suspected unauthorized access. You are responsible for activity conducted through your account and for users you authorize to access your organization.

2. Acceptable use
You may use the Service only for lawful business purposes and in compliance with applicable laws. You must not misuse the Service, interfere with its operation, attempt unauthorized access, or use the Service to transmit unlawful, harmful, or infringing content.

3. Your data
You retain responsibility for the business data, leads, contacts, and other content you submit to the Service. You represent that you have the necessary rights and permissions to submit and process that data through the Service.

4. Service changes and availability
We may modify, maintain, or discontinue features to operate and improve the Service. We will use reasonable efforts to communicate material changes when appropriate, but do not guarantee uninterrupted availability.

5. Suspension and termination
We may suspend or terminate access when necessary to protect the Service, comply with law, address misuse, or enforce these Terms. You may stop using the Service at any time, subject to any applicable agreement or payment obligations.

6. Disclaimers and liability
The Service is provided on an "as is" and "as available" basis except where applicable law requires otherwise. To the maximum extent permitted by law, neither party will be liable for indirect, incidental, special, consequential, or punitive damages.

7. Changes to these Terms
We may publish a new version of these Terms. Continued use after the effective date of a new version may require renewed acceptance before access is restored.

8. Contact
Questions about these Terms may be sent through the Service's published support channel.

This draft must be reviewed and finalized by qualified legal counsel before production use.
$terms$,
    '2026-08-08T00:00:00Z'::timestamptz
  ),
  (
    'privacy',
    '2026-08-08',
    'Privacy Policy',
    $privacy$
Privacy Policy

Effective date: August 8, 2026

This Privacy Policy explains how AI Growth Platform handles personal information when you use the Service.

1. Information we process
We process account details such as name and email address, authentication and security information, organization settings, and the business data you choose to submit to the Service, including lead and contact information.

2. How we use information
We use information to provide, secure, support, and improve the Service; authenticate users; operate requested features and integrations; communicate about the Service; and comply with legal obligations.

3. Service providers and integrations
The Service may use carefully selected service providers to host infrastructure, deliver authentication, process requested integrations, and provide support. When you connect a third-party integration, that provider's terms and privacy practices also apply.

4. Data security and retention
We use technical and organizational measures designed to protect information. No method of transmission or storage is completely secure. We retain information for as long as necessary to provide the Service, meet legal obligations, resolve disputes, and enforce agreements.

5. Your choices
Depending on applicable law, you may have rights to access, correct, delete, export, or object to certain processing of your personal information. You may also control optional marketing communications where they are offered.

6. Policy updates
We may publish a new version of this Policy as the Service or legal requirements change. Continued use after the effective date of a new version may require renewed acceptance before access is restored.

7. Contact
Questions or requests about privacy may be sent through the Service's published support channel.

This draft must be reviewed and finalized by qualified legal counsel before production use.
$privacy$,
    '2026-08-08T00:00:00Z'::timestamptz
  ),
  (
    'marketing',
    '2026-08-08',
    'Marketing Communications Consent',
    $marketing$
Marketing Communications Consent

Effective date: August 8, 2026

If you opt in, AI Growth Platform may send you product announcements, educational material, and promotional communications. You can opt out of marketing communications at any time using the unsubscribe method included in those communications.

This optional consent is not required to use the Service.
$marketing$,
    '2026-08-08T00:00:00Z'::timestamptz
  )
on conflict (document_type, version) do nothing;
