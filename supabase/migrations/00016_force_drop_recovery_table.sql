-- Force-drop the table with cascade to handle dependent policies/indexes
-- that blocked the plain DROP TABLE in migration 00014
do $$
begin
  if exists (
    select from pg_tables
    where schemaname = 'public' and tablename = 'mfa_recovery_codes'
  ) then
    drop table public.mfa_recovery_codes cascade;
  end if;
end $$;
