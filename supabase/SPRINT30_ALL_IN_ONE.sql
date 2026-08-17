-- ============================================================
-- BASMAT ERP — SPRINT 30 BIG
-- CONTRACT LIFECYCLE + SLA + RECURRING BILLING + RENEWALS
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_contracts') is null then
    raise exception 'PRECHECK FAIL: ict_contracts missing';
  end if;

  if to_regclass('public.ict_customers') is null then
    raise exception 'PRECHECK FAIL: ict_customers missing';
  end if;

  if to_regclass('public.ict_invoices') is null then
    raise exception 'PRECHECK FAIL: ict_invoices missing';
  end if;

  if to_regclass('public.ict_projects') is null then
    raise exception 'PRECHECK FAIL: ict_projects missing';
  end if;

  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_contracts'
      and column_name='end_date'
  ) then
    raise exception 'PRECHECK FAIL: ict_contracts.end_date missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_contracts'
      and column_name='contract_value'
  ) then
    raise exception 'PRECHECK FAIL: ict_contracts.contract_value missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_invoices'
      and column_name='contract_id'
  ) then
    raise exception 'PRECHECK FAIL: ict_invoices.contract_id missing';
  end if;
end $$;

select '01 PRECHECK' as check_name,'PASS ✅' as result;

-- 02 MIGRATION
begin;

create table if not exists public.ict_contract_lines(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.ict_contracts(id) on delete cascade,
  line_no integer not null default 1,
  item_type text not null default 'service'
    check(item_type in('service','product','maintenance','license','subscription','other')),
  description text not null,
  quantity numeric(16,3) not null default 1 check(quantity>0),
  unit_price numeric(16,2) not null default 0 check(unit_price>=0),
  billing_frequency text not null default 'one_time'
    check(billing_frequency in('one_time','monthly','quarterly','semi_annual','annual')),
  start_date date,
  end_date date,
  line_total numeric(16,2) generated always as (round(quantity*unit_price,2)) stored,
  status text not null default 'active'
    check(status in('active','suspended','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contract_id,line_no)
);

create table if not exists public.ict_contract_sla_policies(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.ict_contracts(id) on delete cascade,
  policy_name text not null,
  severity text not null
    check(severity in('critical','high','medium','low')),
  response_minutes integer not null check(response_minutes>0),
  resolution_minutes integer not null check(resolution_minutes>0),
  service_window text not null default 'business_hours'
    check(service_window in('business_hours','24x7')),
  penalty_percent numeric(8,4) not null default 0 check(penalty_percent>=0 and penalty_percent<=100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contract_id,severity)
);

create sequence if not exists public.ict_contract_billing_schedule_no_seq start 1;

create or replace function public.ict_next_contract_billing_schedule_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'CBS-'||to_char(current_date,'YYYY')||'-'||
    lpad(nextval('public.ict_contract_billing_schedule_no_seq')::text,6,'0');
end $$;

create table if not exists public.ict_contract_billing_schedules(
  id uuid primary key default gen_random_uuid(),
  schedule_no text not null unique default public.ict_next_contract_billing_schedule_no(),
  contract_id uuid not null references public.ict_contracts(id) on delete cascade,
  contract_line_id uuid references public.ict_contract_lines(id) on delete set null,
  billing_date date not null,
  amount numeric(16,2) not null check(amount>=0),
  tax_rate numeric(8,4) not null default 15 check(tax_rate>=0),
  tax_amount numeric(16,2) not null default 0,
  total_amount numeric(16,2) not null default 0,
  invoice_id uuid references public.ict_invoices(id) on delete set null,
  status text not null default 'planned'
    check(status in('planned','ready','invoiced','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_contract_billing_contract_idx
  on public.ict_contract_billing_schedules(contract_id,billing_date,status);

create sequence if not exists public.ict_contract_renewal_no_seq start 1;

create or replace function public.ict_next_contract_renewal_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'REN-'||to_char(current_date,'YYYY')||'-'||
    lpad(nextval('public.ict_contract_renewal_no_seq')::text,5,'0');
end $$;

create table if not exists public.ict_contract_renewals(
  id uuid primary key default gen_random_uuid(),
  renewal_no text not null unique default public.ict_next_contract_renewal_no(),
  contract_id uuid not null references public.ict_contracts(id) on delete cascade,
  proposed_start_date date,
  proposed_end_date date,
  proposed_value numeric(16,2) not null default 0,
  probability integer not null default 50 check(probability between 0 and 100),
  status text not null default 'identified'
    check(status in('identified','contacted','negotiation','won','lost','cancelled')),
  owner_user_id uuid references auth.users(id) on delete set null,
  next_action_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contract_id,status) deferrable initially immediate
);

create table if not exists public.ict_contract_reviews(
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.ict_contracts(id) on delete cascade,
  review_date date not null default current_date,
  review_type text not null
    check(review_type in('monthly','quarterly','annual','renewal','exception')),
  commercial_score numeric(6,2),
  service_score numeric(6,2),
  customer_score numeric(6,2),
  overall_score numeric(6,2),
  risks text,
  actions text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ict_contract_reviews_contract_idx
  on public.ict_contract_reviews(contract_id,review_date desc);

create or replace function public.ict_contract_revenue_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_active integer:=0;
  v_contract_value numeric:=0;
  v_billed numeric:=0;
  v_collected numeric:=0;
  v_unbilled numeric:=0;
  v_due30 numeric:=0;
  v_due60 numeric:=0;
  v_renewal_pipeline numeric:=0;
  v_expiring30 integer:=0;
  v_expiring90 integer:=0;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select
    count(*) filter(where status not in('cancelled','completed','expired')),
    coalesce(sum(contract_value) filter(where status not in('cancelled')),0),
    count(*) filter(where end_date between current_date and current_date+30),
    count(*) filter(where end_date between current_date+31 and current_date+90)
  into v_active,v_contract_value,v_expiring30,v_expiring90
  from public.ict_contracts;

  select coalesce(sum(total_amount),0)
  into v_billed
  from public.ict_invoices
  where contract_id is not null
    and status not in('draft','cancelled');

  select coalesce(sum(amount_paid),0)
  into v_collected
  from public.ict_invoices
  where contract_id is not null
    and status not in('draft','cancelled');

  select coalesce(sum(total_amount),0)
  into v_unbilled
  from public.ict_contract_billing_schedules
  where status in('planned','ready');

  select
    coalesce(sum(total_amount) filter(
      where billing_date between current_date and current_date+30
        and status in('planned','ready')
    ),0),
    coalesce(sum(total_amount) filter(
      where billing_date between current_date+31 and current_date+60
        and status in('planned','ready')
    ),0)
  into v_due30,v_due60
  from public.ict_contract_billing_schedules;

  select coalesce(sum(proposed_value*probability/100.0),0)
  into v_renewal_pipeline
  from public.ict_contract_renewals
  where status in('identified','contacted','negotiation');

  return jsonb_build_object(
    'active_contracts',v_active,
    'contract_value',v_contract_value,
    'billed_value',v_billed,
    'collected_value',v_collected,
    'unbilled_schedule',v_unbilled,
    'billing_due_30',v_due30,
    'billing_due_60',v_due60,
    'renewal_pipeline',v_renewal_pipeline,
    'expiring_30_days',v_expiring30,
    'expiring_90_days',v_expiring90
  );
end $$;

create or replace function public.ict_generate_contract_billing(
  p_contract_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  l record;
  d date;
  v_count integer:=0;
  v_tax numeric(16,2);
  v_total numeric(16,2);
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  for l in
    select *
    from public.ict_contract_lines
    where contract_id=p_contract_id
      and status='active'
      and billing_frequency<>'one_time'
  loop
    d:=coalesce(l.start_date,current_date);

    while d<=coalesce(l.end_date,current_date+interval '1 year') loop
      v_tax:=round(l.line_total*0.15,2);
      v_total:=l.line_total+v_tax;

      insert into public.ict_contract_billing_schedules(
        contract_id,contract_line_id,billing_date,amount,tax_rate,tax_amount,total_amount,status
      )
      values(
        p_contract_id,l.id,d,l.line_total,15,v_tax,v_total,'planned'
      )
      on conflict do nothing;

      v_count:=v_count+1;

      d:=case l.billing_frequency
        when 'monthly' then (d+interval '1 month')::date
        when 'quarterly' then (d+interval '3 months')::date
        when 'semi_annual' then (d+interval '6 months')::date
        when 'annual' then (d+interval '1 year')::date
        else (d+interval '100 years')::date
      end;
    end loop;
  end loop;

  return jsonb_build_object('success',true,'generated',v_count);
end $$;

create or replace function public.ict_identify_contract_renewals(
  p_days integer default 120
)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  v_count integer:=0;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  insert into public.ict_contract_renewals(
    contract_id,proposed_start_date,proposed_end_date,proposed_value,probability,status
  )
  select
    c.id,
    c.end_date+1,
    c.end_date+1+(coalesce(c.end_date,c.start_date)-coalesce(c.start_date,c.end_date)),
    c.contract_value,
    50,
    'identified'
  from public.ict_contracts c
  where c.end_date between current_date and current_date+p_days
    and c.status not in('cancelled','completed')
    and not exists(
      select 1
      from public.ict_contract_renewals r
      where r.contract_id=c.id
        and r.status in('identified','contacted','negotiation','won')
    );

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.ict_contract_revenue_snapshot() to authenticated;
grant execute on function public.ict_generate_contract_billing(uuid) to authenticated;
grant execute on function public.ict_identify_contract_renewals(integer) to authenticated;

alter table public.ict_contract_lines enable row level security;
alter table public.ict_contract_sla_policies enable row level security;
alter table public.ict_contract_billing_schedules enable row level security;
alter table public.ict_contract_renewals enable row level security;
alter table public.ict_contract_reviews enable row level security;

drop policy if exists "ERP admins contract lines" on public.ict_contract_lines;
create policy "ERP admins contract lines" on public.ict_contract_lines
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins contract SLA" on public.ict_contract_sla_policies;
create policy "ERP admins contract SLA" on public.ict_contract_sla_policies
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins contract billing" on public.ict_contract_billing_schedules;
create policy "ERP admins contract billing" on public.ict_contract_billing_schedules
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins contract renewals" on public.ict_contract_renewals;
create policy "ERP admins contract renewals" on public.ict_contract_renewals
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins contract reviews" on public.ict_contract_reviews;
create policy "ERP admins contract reviews" on public.ict_contract_reviews
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

grant select,insert,update,delete on public.ict_contract_lines to authenticated;
grant select,insert,update,delete on public.ict_contract_sla_policies to authenticated;
grant select,insert,update,delete on public.ict_contract_billing_schedules to authenticated;
grant select,insert,update,delete on public.ict_contract_renewals to authenticated;
grant select,insert,update,delete on public.ict_contract_reviews to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'contract_lifecycle',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','sales','finance')
  and permission_key='contract_lifecycle';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
  select 'Contract lines' n,to_regclass('public.ict_contract_lines') is not null ok
  union all select 'Contract SLA',to_regclass('public.ict_contract_sla_policies') is not null
  union all select 'Billing schedules',to_regclass('public.ict_contract_billing_schedules') is not null
  union all select 'Contract renewals',to_regclass('public.ict_contract_renewals') is not null
  union all select 'Contract reviews',to_regclass('public.ict_contract_reviews') is not null
  union all select 'Contract snapshot RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_contract_revenue_snapshot')
  union all select 'Billing generation RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_generate_contract_billing')
  union all select 'Renewal identification RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_identify_contract_renewals')
  union all select 'Admin permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='contract_lifecycle' and is_allowed=true)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- No auth-protected RPC is executed here.
with safe_checks as(
  select 'Contracts columns' n,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_contracts' and column_name='end_date') ok
  union all select 'Invoices contract link',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_invoices' and column_name='contract_id')
  union all select 'Contract line FK',
    exists(select 1 from information_schema.table_constraints where table_schema='public' and table_name='ict_contract_lines' and constraint_type='FOREIGN KEY')
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from safe_checks;

-- 05 FINAL RESULT
select 'SPRINT 30 ALL-IN-ONE' check_name,
case when
  to_regclass('public.ict_contract_lines') is not null
  and to_regclass('public.ict_contract_billing_schedules') is not null
  and to_regclass('public.ict_contract_renewals') is not null
  and exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_contract_revenue_snapshot')
  and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='contract_lifecycle' and is_allowed=true)
then 'PASS ✅' else 'FAIL ❌' end result;
