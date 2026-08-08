-- ============================================================================
-- MFA Recovery Codes
-- Phase 14.4B.7
--
-- Stores SHA-256 hashes of one-time recovery codes. Plaintext codes are
-- returned to the user once during generation and never stored.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;

create table public.mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index idx_mfa_recovery_codes_profile
  on public.mfa_recovery_codes(profile_id, used_at)
  where used_at is null;

alter table public.mfa_recovery_codes enable row level security;

create policy "Users cannot directly read recovery codes"
  on public.mfa_recovery_codes
  for select
  using (false);

create policy "Users cannot directly insert recovery codes"
  on public.mfa_recovery_codes
  for insert
  with check (false);

create policy "Users cannot directly update recovery codes"
  on public.mfa_recovery_codes
  for update
  using (false);

create policy "Users cannot directly delete recovery codes"
  on public.mfa_recovery_codes
  for delete
  using (false);

-- ============================================================================
-- RPC: generate_backup_codes(p_profile_id, p_count)
-- Generates `p_count` codes (128-bit random hex), stores SHA-256 hashes,
-- returns plaintext. Previous codes for the profile are invalidated.
-- ============================================================================
create or replace function public.generate_backup_codes(
  p_profile_id uuid,
  p_count      integer default 10
)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_i    integer;
begin
  if auth.uid() != p_profile_id then
    raise exception 'Not authorized';
  end if;

  delete from public.mfa_recovery_codes
  where profile_id = p_profile_id;

  for v_i in 1..p_count loop
    v_code := 'backup-' || encode(gen_random_bytes(16), 'hex');

    insert into public.mfa_recovery_codes (profile_id, code_hash)
    values (p_profile_id, encode(extensions.digest(v_code, 'sha256'), 'hex'));

    return next v_code;
  end loop;
end;
$$;

-- ============================================================================
-- RPC: consume_backup_code(p_profile_id, p_code)
-- Consumes a single recovery code. Returns true if valid and unused.
-- ============================================================================
create or replace function public.consume_backup_code(
  p_profile_id uuid,
  p_code       text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_id   uuid;
begin
  if auth.uid() != p_profile_id then
    raise exception 'Not authorized';
  end if;

  v_hash := encode(extensions.digest(p_code, 'sha256'), 'hex');

  select rc.id into v_id
  from public.mfa_recovery_codes rc
  where rc.profile_id = p_profile_id
    and rc.used_at is null
    and rc.code_hash = v_hash
  limit 1
  for update skip locked;

  if v_id is null then
    return false;
  end if;

  update public.mfa_recovery_codes
  set used_at = now()
  where id = v_id;

  return true;
end;
$$;

-- ============================================================================
-- RPC: count_backup_codes(p_profile_id)
-- Returns the number of unused recovery codes for this profile.
-- ============================================================================
create or replace function public.count_backup_codes(
  p_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() != p_profile_id then
    raise exception 'Not authorized';
  end if;

  return (
    select count(*)::integer
    from public.mfa_recovery_codes
    where profile_id = p_profile_id and used_at is null
  );
end;
$$;

revoke execute on function public.generate_backup_codes from public, anon;
revoke execute on function public.consume_backup_code from public, anon;
revoke execute on function public.count_backup_codes from public, anon;
