-- ============================================================
-- BASMAT ICT — MFA RECOVERY VIA EMAIL
-- Run once in Supabase SQL Editor.
-- Safe to re-run.
-- ============================================================

create table if not exists public.ict_mfa_recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_ict_mfa_recovery_codes_user_created
  on public.ict_mfa_recovery_codes(user_id, created_at desc);

create index if not exists idx_ict_mfa_recovery_codes_expiry
  on public.ict_mfa_recovery_codes(expires_at);

alter table public.ict_mfa_recovery_codes enable row level security;

-- No direct browser access. Only the service-role Edge Function uses this table.
revoke all on public.ict_mfa_recovery_codes from anon, authenticated;

notify pgrst, 'reload schema';

select 'MFA RECOVERY TABLE' check_name,
  case when to_regclass('public.ict_mfa_recovery_codes') is not null
    then 'PASS ✅' else 'FAIL ❌' end result
union all
select 'MFA RECOVERY RLS',
  case when exists(
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname='public'
      and c.relname='ict_mfa_recovery_codes'
      and c.relrowsecurity = true
  ) then 'PASS ✅' else 'FAIL ❌' end;
