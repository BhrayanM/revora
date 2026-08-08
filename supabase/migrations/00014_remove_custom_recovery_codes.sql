-- ============================================================================
-- Remove dormant custom backup-code attack surface
-- Phase 14.4B.7B
--
-- The custom recovery code implementation (00013) was disabled because
-- Supabase does not natively support recovery codes and the custom
-- implementation cannot produce a valid AAL2 session.
--
-- This migration:
--   1. Drops the three SECURITY DEFINER RPCs
--   2. Drops the unused mfa_recovery_codes table (0 rows, never had data)
-- ============================================================================

drop function if exists public.generate_backup_codes(uuid, integer);
drop function if exists public.consume_backup_code(uuid, text);
drop function if exists public.count_backup_codes(uuid);
drop table if exists public.mfa_recovery_codes;
