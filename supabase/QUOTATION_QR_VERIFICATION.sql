-- ============================================================
-- BASMAT ICT — QUOTATION AUTHENTICITY VERIFICATION
-- QR + Verification Code + Public verification RPC
-- Safe to re-run.
-- ============================================================

create extension if not exists pgcrypto;

-- 01) Verification identity columns
alter table public.ict_quotations
  add column if not exists verification_token uuid;

alter table public.ict_quotations
  add column if not exists verification_code text;

-- 02) Generator
create or replace function public.ict_generate_quotation_verification_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code :=
      'QVR-' ||
      extract(year from current_date)::int::text ||
      '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    exit when not exists (
      select 1
      from public.ict_quotations
      where verification_code = v_code
    );
  end loop;

  return v_code;
end;
$$;

-- 03) Defaults for every new quotation
alter table public.ict_quotations
  alter column verification_token
  set default gen_random_uuid();

alter table public.ict_quotations
  alter column verification_code
  set default public.ict_generate_quotation_verification_code();

-- 04) Backfill existing quotations
update public.ict_quotations
set verification_token = gen_random_uuid()
where verification_token is null;

update public.ict_quotations
set verification_code = public.ict_generate_quotation_verification_code()
where verification_code is null
   or btrim(verification_code) = '';

-- 05) Enforce uniqueness / non-null
alter table public.ict_quotations
  alter column verification_token set not null;

alter table public.ict_quotations
  alter column verification_code set not null;

create unique index if not exists ux_ict_quotations_verification_token
  on public.ict_quotations(verification_token);

create unique index if not exists ux_ict_quotations_verification_code
  on public.ict_quotations(verification_code);

-- 06) Public verification function
-- Returns ONLY limited fields required to verify document authenticity.
create or replace function public.ict_verify_quotation(p_token uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q public.ict_quotations%rowtype;
  v_valid_until date;
  v_state text;
begin
  select *
  into q
  from public.ict_quotations
  where verification_token = p_token
  limit 1;

  if q.id is null then
    return jsonb_build_object('valid', false);
  end if;

  v_valid_until :=
    q.created_at::date + greatest(coalesce(q.validity_days, 0), 0);

  v_state :=
    case
      when q.status = 'cancelled' then 'cancelled'
      when q.status = 'rejected' then 'rejected'
      when q.status = 'draft' then 'draft'
      when q.status = 'expired' or current_date > v_valid_until then 'expired'
      when q.status = 'accepted' then 'accepted'
      else 'valid'
    end;

  return jsonb_build_object(
    'valid', true,
    'verification_state', v_state,
    'quotation_no', q.quotation_no,
    'verification_code', q.verification_code,
    'customer_name', q.customer_name,
    'company_name', q.company_name,
    'subject', q.subject,
    'currency', q.currency,
    'total_amount', q.total_amount,
    'issue_date', q.created_at::date,
    'valid_until', v_valid_until,
    'status', q.status
  );
end;
$$;

revoke all on function public.ict_verify_quotation(uuid) from public;
grant execute on function public.ict_verify_quotation(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- 07) HEALTH
select 'VERIFICATION TOKEN' check_name,
  case when not exists(
    select 1 from public.ict_quotations where verification_token is null
  ) then 'PASS ✅' else 'FAIL ❌' end result
union all
select 'VERIFICATION CODE',
  case when not exists(
    select 1 from public.ict_quotations
    where verification_code is null or btrim(verification_code)=''
  ) then 'PASS ✅' else 'FAIL ❌' end
union all
select 'VERIFY RPC',
  case when to_regprocedure('public.ict_verify_quotation(uuid)') is not null
    then 'PASS ✅' else 'FAIL ❌' end;
