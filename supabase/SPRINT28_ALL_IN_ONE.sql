-- ============================================================
-- BASMAT ERP — SPRINT 28 BIG
-- BANK RECONCILIATION + VAT CONTROL + PERIOD CLOSE
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SMOKE TEST
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_treasury_accounts') is null then
    raise exception 'PRECHECK FAIL: ict_treasury_accounts missing. Sprint 27 is required.';
  end if;
  if to_regclass('public.ict_treasury_transactions') is null then
    raise exception 'PRECHECK FAIL: ict_treasury_transactions missing. Sprint 27 is required.';
  end if;
  if to_regclass('public.ict_invoices') is null then
    raise exception 'PRECHECK FAIL: ict_invoices missing.';
  end if;
  if to_regclass('public.ict_expenses') is null then
    raise exception 'PRECHECK FAIL: ict_expenses missing.';
  end if;
  if to_regclass('public.ict_fiscal_periods') is null then
    raise exception 'PRECHECK FAIL: ict_fiscal_periods missing. Sprint 21 is required.';
  end if;
  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing.';
  end if;

  if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='ict_invoices' and column_name='tax_amount')
  then raise exception 'PRECHECK FAIL: ict_invoices.tax_amount missing.'; end if;

  if not exists(select 1 from information_schema.columns
    where table_schema='public' and table_name='ict_expenses' and column_name='tax_amount')
  then raise exception 'PRECHECK FAIL: ict_expenses.tax_amount missing.'; end if;
end $$;

select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create sequence if not exists public.ict_bank_statement_no_seq start 1;
create or replace function public.ict_next_bank_statement_no()
returns text language plpgsql security definer set search_path=public as $$
begin
  return 'BST-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.ict_bank_statement_no_seq')::text,5,'0');
end $$;

create table if not exists public.ict_bank_statements(
  id uuid primary key default gen_random_uuid(),
  statement_no text not null unique default public.ict_next_bank_statement_no(),
  treasury_account_id uuid not null references public.ict_treasury_accounts(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  opening_balance numeric(16,2) not null default 0,
  closing_balance numeric(16,2) not null default 0,
  status text not null default 'open' check(status in('open','reconciled','closed')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end>=period_start)
);

create table if not exists public.ict_bank_statement_lines(
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.ict_bank_statements(id) on delete cascade,
  transaction_date date not null,
  description text,
  reference_no text,
  debit numeric(16,2) not null default 0 check(debit>=0),
  credit numeric(16,2) not null default 0 check(credit>=0),
  matched_treasury_transaction_id uuid references public.ict_treasury_transactions(id) on delete set null,
  match_status text not null default 'unmatched' check(match_status in('unmatched','matched','ignored')),
  created_at timestamptz not null default now(),
  check(not (debit>0 and credit>0))
);

create index if not exists ict_bank_statement_lines_statement_idx
on public.ict_bank_statement_lines(statement_id,transaction_date);

create sequence if not exists public.ict_vat_return_no_seq start 1;
create or replace function public.ict_next_vat_return_no()
returns text language plpgsql security definer set search_path=public as $$
begin
  return 'VAT-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.ict_vat_return_no_seq')::text,4,'0');
end $$;

create table if not exists public.ict_vat_returns(
  id uuid primary key default gen_random_uuid(),
  return_no text not null unique default public.ict_next_vat_return_no(),
  period_start date not null,
  period_end date not null,
  output_vat numeric(16,2) not null default 0,
  input_vat numeric(16,2) not null default 0,
  net_vat numeric(16,2) not null default 0,
  status text not null default 'draft' check(status in('draft','reviewed','filed','paid')),
  filed_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end>=period_start)
);

create unique index if not exists ict_vat_returns_period_uq
on public.ict_vat_returns(period_start,period_end);

create table if not exists public.ict_period_close_checks(
  id uuid primary key default gen_random_uuid(),
  fiscal_period_id uuid references public.ict_fiscal_periods(id) on delete cascade,
  checked_at timestamptz not null default now(),
  checked_by uuid references auth.users(id) on delete set null,
  unreconciled_bank_lines integer not null default 0,
  open_supplier_bills integer not null default 0,
  overdue_customer_invoices integer not null default 0,
  draft_vat_returns integer not null default 0,
  is_ready boolean not null default false,
  details jsonb not null default '{}'::jsonb
);

create or replace function public.ict_match_bank_line(
  p_statement_line_id uuid,
  p_treasury_transaction_id uuid
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_account uuid;
  v_tx_account uuid;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  select s.treasury_account_id into v_account
  from public.ict_bank_statement_lines l
  join public.ict_bank_statements s on s.id=l.statement_id
  where l.id=p_statement_line_id;

  if v_account is null then raise exception 'سطر كشف البنك غير موجود.'; end if;

  select treasury_account_id into v_tx_account
  from public.ict_treasury_transactions
  where id=p_treasury_transaction_id;

  if v_tx_account is null then raise exception 'حركة الخزينة غير موجودة.'; end if;
  if v_account<>v_tx_account then raise exception 'الحركة ليست لنفس حساب الخزينة.'; end if;

  update public.ict_bank_statement_lines
  set matched_treasury_transaction_id=p_treasury_transaction_id,
      match_status='matched'
  where id=p_statement_line_id;

  return jsonb_build_object('success',true);
end $$;

create or replace function public.ict_bank_reconciliation_summary(p_statement_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_statement public.ict_bank_statements%rowtype;
  v_debit numeric:=0; v_credit numeric:=0; v_unmatched integer:=0; v_matched integer:=0;
  v_book_balance numeric:=0; v_difference numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
  select * into v_statement from public.ict_bank_statements where id=p_statement_id;
  if not found then raise exception 'كشف البنك غير موجود.'; end if;

  select coalesce(sum(debit),0),coalesce(sum(credit),0),
         count(*) filter(where match_status='unmatched'),
         count(*) filter(where match_status='matched')
  into v_debit,v_credit,v_unmatched,v_matched
  from public.ict_bank_statement_lines where statement_id=p_statement_id;

  select coalesce(current_balance,0) into v_book_balance
  from public.ict_treasury_accounts where id=v_statement.treasury_account_id;

  v_difference:=v_statement.closing_balance-v_book_balance;

  return jsonb_build_object(
    'statement_no',v_statement.statement_no,
    'bank_closing_balance',v_statement.closing_balance,
    'book_balance',v_book_balance,
    'difference',v_difference,
    'statement_debits',v_debit,
    'statement_credits',v_credit,
    'matched_lines',v_matched,
    'unmatched_lines',v_unmatched,
    'is_reconciled',(v_unmatched=0 and abs(v_difference)<0.01)
  );
end $$;

create or replace function public.ict_calculate_vat_return(
  p_period_start date,
  p_period_end date
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_output numeric:=0; v_input numeric:=0; v_net numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
  if p_period_end<p_period_start then raise exception 'الفترة غير صحيحة.'; end if;

  select coalesce(sum(tax_amount),0) into v_output
  from public.ict_invoices
  where issue_date between p_period_start and p_period_end
    and status not in('draft','cancelled');

  select coalesce(sum(tax_amount),0) into v_input
  from public.ict_expenses
  where expense_date between p_period_start and p_period_end
    and status not in('draft','cancelled');

  v_net:=v_output-v_input;

  return jsonb_build_object(
    'period_start',p_period_start,'period_end',p_period_end,
    'output_vat',v_output,'input_vat',v_input,'net_vat',v_net
  );
end $$;

create or replace function public.ict_save_vat_return(
  p_period_start date,
  p_period_end date
)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v jsonb; v_id uuid;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
  v:=public.ict_calculate_vat_return(p_period_start,p_period_end);

  insert into public.ict_vat_returns(
    period_start,period_end,output_vat,input_vat,net_vat,status,created_by
  ) values(
    p_period_start,p_period_end,
    (v->>'output_vat')::numeric,(v->>'input_vat')::numeric,(v->>'net_vat')::numeric,
    'draft',auth.uid()
  )
  on conflict(period_start,period_end) do update
  set output_vat=excluded.output_vat,input_vat=excluded.input_vat,
      net_vat=excluded.net_vat,updated_at=now()
  returning id into v_id;

  return v_id;
end $$;

create or replace function public.ict_period_close_readiness(p_fiscal_period_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  p public.ict_fiscal_periods%rowtype;
  v_bank integer:=0; v_ap integer:=0; v_ar integer:=0; v_vat integer:=0; v_ready boolean:=false;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
  select * into p from public.ict_fiscal_periods where id=p_fiscal_period_id;
  if not found then raise exception 'الفترة المالية غير موجودة.'; end if;

  select count(*) into v_bank
  from public.ict_bank_statement_lines l
  join public.ict_bank_statements s on s.id=l.statement_id
  where l.match_status='unmatched'
    and s.period_end>=p.start_date and s.period_start<=p.end_date;

  select count(*) into v_ap
  from public.ict_supplier_bills
  where status in('open','partially_paid')
    and coalesce(due_date,bill_date)<=p.end_date
    and balance_due>0;

  select count(*) into v_ar
  from public.ict_invoices
  where status not in('draft','cancelled','paid')
    and coalesce(due_date,issue_date)<=p.end_date
    and balance_due>0;

  select count(*) into v_vat
  from public.ict_vat_returns
  where period_end>=p.start_date and period_start<=p.end_date
    and status='draft';

  v_ready:=(v_bank=0 and v_vat=0);

  insert into public.ict_period_close_checks(
    fiscal_period_id,checked_by,unreconciled_bank_lines,open_supplier_bills,
    overdue_customer_invoices,draft_vat_returns,is_ready,details
  ) values(
    p_fiscal_period_id,auth.uid(),v_bank,v_ap,v_ar,v_vat,v_ready,
    jsonb_build_object('period_start',p.start_date,'period_end',p.end_date)
  );

  return jsonb_build_object(
    'period_id',p_fiscal_period_id,
    'unreconciled_bank_lines',v_bank,
    'open_supplier_bills',v_ap,
    'overdue_customer_invoices',v_ar,
    'draft_vat_returns',v_vat,
    'is_ready',v_ready
  );
end $$;

grant execute on function public.ict_match_bank_line(uuid,uuid) to authenticated;
grant execute on function public.ict_bank_reconciliation_summary(uuid) to authenticated;
grant execute on function public.ict_calculate_vat_return(date,date) to authenticated;
grant execute on function public.ict_save_vat_return(date,date) to authenticated;
grant execute on function public.ict_period_close_readiness(uuid) to authenticated;

alter table public.ict_bank_statements enable row level security;
alter table public.ict_bank_statement_lines enable row level security;
alter table public.ict_vat_returns enable row level security;
alter table public.ict_period_close_checks enable row level security;

drop policy if exists "ERP admins bank statements" on public.ict_bank_statements;
create policy "ERP admins bank statements" on public.ict_bank_statements for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins bank statement lines" on public.ict_bank_statement_lines;
create policy "ERP admins bank statement lines" on public.ict_bank_statement_lines for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins vat returns" on public.ict_vat_returns;
create policy "ERP admins vat returns" on public.ict_vat_returns for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins period close checks" on public.ict_period_close_checks;
create policy "ERP admins period close checks" on public.ict_period_close_checks for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

grant select,insert,update on public.ict_bank_statements to authenticated;
grant select,insert,update on public.ict_bank_statement_lines to authenticated;
grant select,insert,update on public.ict_vat_returns to authenticated;
grant select on public.ict_period_close_checks to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'financial_control',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','finance') and permission_key='financial_control';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
 select 'Bank statements table' n,to_regclass('public.ict_bank_statements') is not null ok
 union all select 'Bank statement lines',to_regclass('public.ict_bank_statement_lines') is not null
 union all select 'VAT returns',to_regclass('public.ict_vat_returns') is not null
 union all select 'Period close checks',to_regclass('public.ict_period_close_checks') is not null
 union all select 'Bank reconciliation RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_bank_reconciliation_summary')
 union all select 'VAT calculation RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_calculate_vat_return')
 union all select 'Period close readiness RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_period_close_readiness')
 union all select 'Financial control permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='financial_control' and is_allowed=true)
 union all select 'Treasury preserved',to_regclass('public.ict_treasury_accounts') is not null and to_regclass('public.ict_treasury_transactions') is not null
 union all select 'Financial planning preserved',to_regclass('public.ict_financial_budgets') is not null and to_regclass('public.ict_cashflow_forecasts') is not null
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- IMPORTANT:
-- Do NOT call auth-protected RPCs here because SQL Editor has no authenticated
-- application session and auth.uid() is NULL.
-- The checks below validate the same dependencies without bypassing security.

with safe_checks as (
  select 'VAT source columns readable'::text check_name,
         exists(
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='ict_invoices'
             and column_name='tax_amount'
         )
         and exists(
           select 1 from information_schema.columns
           where table_schema='public'
             and table_name='ict_expenses'
             and column_name='tax_amount'
         ) ok

  union all
  select 'VAT calculation function signature',
         exists(
           select 1
           from pg_proc p
           join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public'
             and p.proname='ict_calculate_vat_return'
             and pg_get_function_identity_arguments(p.oid)='p_period_start date, p_period_end date'
         )

  union all
  select 'Bank reconciliation function exists',
         exists(
           select 1 from information_schema.routines
           where routine_schema='public'
             and routine_name='ict_bank_reconciliation_summary'
         )

  union all
  select 'Period close function exists',
         exists(
           select 1 from information_schema.routines
           where routine_schema='public'
             and routine_name='ict_period_close_readiness'
         )

  union all
  select 'Financial control admin permission',
         exists(
           select 1
           from public.ict_admin_role_permissions
           where role='admin'
             and permission_key='financial_control'
             and is_allowed=true
         )
)
select
  check_name,
  case when ok then 'PASS ✅' else 'FAIL ❌' end as result
from safe_checks
order by check_name;

-- 05 FINAL RESULT
select
  'SPRINT 28 ALL-IN-ONE' as check_name,
  case
    when
      to_regclass('public.ict_bank_statements') is not null
      and to_regclass('public.ict_bank_statement_lines') is not null
      and to_regclass('public.ict_vat_returns') is not null
      and to_regclass('public.ict_period_close_checks') is not null
      and exists(
        select 1
        from information_schema.routines
        where routine_schema='public'
          and routine_name='ict_calculate_vat_return'
      )
      and exists(
        select 1
        from information_schema.routines
        where routine_schema='public'
          and routine_name='ict_bank_reconciliation_summary'
      )
      and exists(
        select 1
        from information_schema.routines
        where routine_schema='public'
          and routine_name='ict_period_close_readiness'
      )
      and exists(
        select 1
        from public.ict_admin_role_permissions
        where role='admin'
          and permission_key='financial_control'
          and is_allowed=true
      )
    then 'PASS ✅'
    else 'FAIL ❌'
  end as result;
