-- ============================================================
-- BASMAT ERP — SPRINT 25 BIG
-- EXECUTIVE CONTROL + GOVERNANCE + HARDENING
-- SINGLE ALL-IN-ONE FILE
--
-- ORDER INSIDE THIS FILE:
--   01 PRECHECK
--   02 MIGRATION
--   03 HEALTH CHECK
--   04 FINAL RESULT
-- ============================================================

-- ============================================================
-- 01 PRECHECK — NO DATA CHANGES
-- ============================================================

do $$
begin
  if to_regclass('public.ict_customers') is null then
    raise exception 'PRECHECK FAIL: ict_customers missing';
  end if;

  if to_regclass('public.ict_delivery_projects') is null then
    raise exception 'PRECHECK FAIL: ict_delivery_projects missing';
  end if;

  if to_regclass('public.ict_invoices') is null then
    raise exception 'PRECHECK FAIL: ict_invoices missing';
  end if;

  if to_regclass('public.ict_payments') is null then
    raise exception 'PRECHECK FAIL: ict_payments missing';
  end if;

  if to_regclass('public.ict_expenses') is null then
    raise exception 'PRECHECK FAIL: ict_expenses missing';
  end if;

  if to_regclass('public.ict_purchase_orders') is null then
    raise exception 'PRECHECK FAIL: ict_purchase_orders missing';
  end if;

  if to_regclass('public.ict_purchase_requests') is null then
    raise exception 'PRECHECK FAIL: ict_purchase_requests missing';
  end if;

  if to_regclass('public.ict_hr_employees') is null then
    raise exception 'PRECHECK FAIL: ict_hr_employees missing';
  end if;

  if to_regclass('public.ict_payroll_runs') is null then
    raise exception 'PRECHECK FAIL: ict_payroll_runs missing';
  end if;

  if to_regclass('public.ict_inventory_items') is null then
    raise exception 'PRECHECK FAIL: ict_inventory_items missing';
  end if;

  if to_regclass('public.ict_assets') is null then
    raise exception 'PRECHECK FAIL: ict_assets missing';
  end if;

  if to_regclass('public.ict_project_budgets') is null then
    raise exception 'PRECHECK FAIL: ict_project_budgets missing';
  end if;

  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing';
  end if;

  if to_regclass('public.ict_admin_users') is null then
    raise exception 'PRECHECK FAIL: ict_admin_users missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='ict_delivery_projects'
      and column_name='contract_value'
  ) then
    raise exception 'PRECHECK FAIL: ict_delivery_projects.contract_value missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='ict_invoices'
      and column_name='balance_due'
  ) then
    raise exception 'PRECHECK FAIL: ict_invoices.balance_due missing';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='ict_hr_employees'
      and column_name='status'
  ) then
    raise exception 'PRECHECK FAIL: ict_hr_employees.status missing';
  end if;
end $$;

select
  '01 PRECHECK' as stage,
  'PASS ✅' as result,
  'ERP dependencies verified before Sprint 25 changes.' as details;


-- ============================================================
-- 02 MIGRATION
-- ============================================================

begin;

-- ------------------------------------------------------------
-- A) Executive Approval Center
-- ------------------------------------------------------------
create sequence if not exists public.ict_erp_approval_no_seq start 1;

create or replace function public.ict_next_erp_approval_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'APR-' || to_char(current_date,'YYYY') || '-' ||
         lpad(nextval('public.ict_erp_approval_no_seq')::text,6,'0');
end;
$$;

create table if not exists public.ict_erp_approval_requests (
  id uuid primary key default gen_random_uuid(),
  approval_no text not null unique default public.ict_next_erp_approval_no(),
  approval_type text not null,
  entity_type text,
  entity_id uuid,
  title text not null,
  description text,
  amount numeric(16,2),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','critical')),
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_erp_approval_status_idx
  on public.ict_erp_approval_requests(status,priority,requested_at desc);

-- ------------------------------------------------------------
-- B) Enterprise Risk Register
-- ------------------------------------------------------------
create sequence if not exists public.ict_erp_risk_no_seq start 1;

create or replace function public.ict_next_erp_risk_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'RSK-' || to_char(current_date,'YYYY') || '-' ||
         lpad(nextval('public.ict_erp_risk_no_seq')::text,5,'0');
end;
$$;

create table if not exists public.ict_erp_risks (
  id uuid primary key default gen_random_uuid(),
  risk_no text not null unique default public.ict_next_erp_risk_no(),
  project_id uuid,
  category text not null,
  title text not null,
  description text,
  probability integer not null default 1
    check (probability between 1 and 5),
  impact integer not null default 1
    check (impact between 1 and 5),
  risk_score integer generated always as (probability * impact) stored,
  owner_employee_id uuid
    references public.ict_hr_employees(id) on delete set null,
  mitigation_plan text,
  due_date date,
  status text not null default 'open'
    check (status in ('open','mitigating','accepted','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_erp_risks_score_idx
  on public.ict_erp_risks(status,risk_score desc);

-- ------------------------------------------------------------
-- C) KPI Targets
-- ------------------------------------------------------------
create table if not exists public.ict_erp_kpi_targets (
  id uuid primary key default gen_random_uuid(),
  kpi_key text not null,
  kpi_name text not null,
  period_year integer not null,
  period_month integer
    check (period_month is null or period_month between 1 and 12),
  target_value numeric(18,2) not null default 0,
  unit text not null default 'number',
  owner_role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(kpi_key,period_year,period_month)
);

-- ------------------------------------------------------------
-- D) System operational health log
-- ------------------------------------------------------------
create table if not exists public.ict_erp_health_runs (
  id uuid primary key default gen_random_uuid(),
  health_type text not null default 'manual',
  status text not null
    check (status in ('pass','warning','fail')),
  summary text,
  details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- E) Approval decision RPC
-- ------------------------------------------------------------
create or replace function public.ict_erp_decide_approval(
  p_approval_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_role text;
begin
  select role into v_role
  from public.ict_admin_users
  where user_id=auth.uid()
    and is_active=true
    and coalesce(is_archived,false)=false
  limit 1;

  if v_role is null then
    raise exception 'غير مصرح.';
  end if;

  if v_role <> 'admin'
     and not exists (
       select 1
       from public.ict_admin_role_permissions
       where role=v_role
         and permission_key='executive_control'
         and is_allowed=true
     ) then
    raise exception 'لا توجد صلاحية اعتماد تنفيذي.';
  end if;

  if p_decision not in ('approved','rejected') then
    raise exception 'قرار غير صحيح.';
  end if;

  update public.ict_erp_approval_requests
  set
    status=p_decision,
    decided_by=auth.uid(),
    decided_at=now(),
    decision_note=nullif(trim(coalesce(p_note,'')),''),
    updated_at=now()
  where id=p_approval_id
    and status='pending';

  if not found then
    raise exception 'طلب الاعتماد غير موجود أو تمت معالجته.';
  end if;

  return jsonb_build_object('success',true,'status',p_decision);
end;
$$;

grant execute on function public.ict_erp_decide_approval(uuid,text,text)
to authenticated;

-- ------------------------------------------------------------
-- F) Executive Snapshot RPC
-- ------------------------------------------------------------
create or replace function public.ict_erp_executive_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_customers integer := 0;
  v_projects integer := 0;
  v_active_projects integer := 0;
  v_employees integer := 0;
  v_contract_value numeric := 0;
  v_invoiced numeric := 0;
  v_collected numeric := 0;
  v_receivables numeric := 0;
  v_expenses numeric := 0;
  v_po_commitment numeric := 0;
  v_payroll numeric := 0;
  v_stock_value numeric := 0;
  v_asset_value numeric := 0;
  v_pending_pr integer := 0;
  v_pending_approvals integer := 0;
  v_critical_risks integer := 0;
  v_open_risks integer := 0;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select count(*) into v_customers
  from public.ict_customers
  where coalesce(is_archived,false)=false;

  select
    count(*),
    count(*) filter (where status not in ('completed','cancelled','closed')),
    coalesce(sum(contract_value),0)
  into v_projects,v_active_projects,v_contract_value
  from public.ict_delivery_projects;

  select count(*) into v_employees
  from public.ict_hr_employees
  where status='active';

  select
    coalesce(sum(total_amount),0),
    coalesce(sum(balance_due),0)
  into v_invoiced,v_receivables
  from public.ict_invoices
  where status not in ('draft','cancelled');

  select coalesce(sum(amount),0)
  into v_collected
  from public.ict_payments
  where status not in ('reversed','cancelled');

  select coalesce(sum(amount+tax_amount),0)
  into v_expenses
  from public.ict_expenses
  where status not in ('draft','cancelled');

  select coalesce(sum(amount),0)
  into v_po_commitment
  from public.ict_purchase_orders
  where status not in ('cancelled','rejected');

  select coalesce(sum(total_net),0)
  into v_payroll
  from public.ict_payroll_runs
  where status in ('approved','paid');

  select coalesce(sum(quantity_on_hand*average_cost),0)
  into v_stock_value
  from public.ict_inventory_items
  where status='active';

  select coalesce(sum(purchase_cost),0)
  into v_asset_value
  from public.ict_assets
  where status not in ('retired','lost');

  select count(*)
  into v_pending_pr
  from public.ict_purchase_requests
  where status='pending';

  select count(*)
  into v_pending_approvals
  from public.ict_erp_approval_requests
  where status='pending';

  select
    count(*) filter (where status in ('open','mitigating')),
    count(*) filter (
      where status in ('open','mitigating')
        and risk_score >= 15
    )
  into v_open_risks,v_critical_risks
  from public.ict_erp_risks;

  return jsonb_build_object(
    'customers',v_customers,
    'projects',v_projects,
    'active_projects',v_active_projects,
    'employees',v_employees,
    'contract_value',v_contract_value,
    'invoiced',v_invoiced,
    'collected',v_collected,
    'receivables',v_receivables,
    'expenses',v_expenses,
    'po_commitment',v_po_commitment,
    'payroll',v_payroll,
    'stock_value',v_stock_value,
    'asset_value',v_asset_value,
    'pending_purchase_requests',v_pending_pr,
    'pending_approvals',v_pending_approvals,
    'open_risks',v_open_risks,
    'critical_risks',v_critical_risks,
    'collection_ratio',
      case when v_invoiced>0
        then round((v_collected/v_invoiced)*100,2)
        else 0 end,
    'cash_after_operational_outflow',
      v_collected-v_expenses-v_payroll
  );
end;
$$;

grant execute on function public.ict_erp_executive_snapshot()
to authenticated;

-- ------------------------------------------------------------
-- G) ERP Health RPC
-- ------------------------------------------------------------
create or replace function public.ict_erp_run_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_failures text[] := array[]::text[];
  v_status text := 'pass';
  v_result jsonb;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  if to_regclass('public.ict_customers') is null then
    v_failures := array_append(v_failures,'ict_customers');
  end if;
  if to_regclass('public.ict_delivery_projects') is null then
    v_failures := array_append(v_failures,'ict_delivery_projects');
  end if;
  if to_regclass('public.ict_invoices') is null then
    v_failures := array_append(v_failures,'ict_invoices');
  end if;
  if to_regclass('public.ict_payments') is null then
    v_failures := array_append(v_failures,'ict_payments');
  end if;
  if to_regclass('public.ict_hr_employees') is null then
    v_failures := array_append(v_failures,'ict_hr_employees');
  end if;
  if to_regclass('public.ict_erp_approval_requests') is null then
    v_failures := array_append(v_failures,'ict_erp_approval_requests');
  end if;
  if to_regclass('public.ict_erp_risks') is null then
    v_failures := array_append(v_failures,'ict_erp_risks');
  end if;

  if array_length(v_failures,1) is not null then
    v_status := 'fail';
  end if;

  v_result := jsonb_build_object(
    'status',v_status,
    'failed_components',to_jsonb(v_failures),
    'checked_at',now()
  );

  insert into public.ict_erp_health_runs(
    health_type,status,summary,details,created_by
  )
  values(
    'manual',
    v_status,
    case
      when v_status='pass' then 'ERP core health passed'
      else 'ERP core health failed'
    end,
    v_result,
    auth.uid()
  );

  return v_result;
end;
$$;

grant execute on function public.ict_erp_run_health()
to authenticated;

-- ------------------------------------------------------------
-- H) RLS
-- ------------------------------------------------------------
alter table public.ict_erp_approval_requests enable row level security;
alter table public.ict_erp_risks enable row level security;
alter table public.ict_erp_kpi_targets enable row level security;
alter table public.ict_erp_health_runs enable row level security;

drop policy if exists "ERP admins manage approvals"
  on public.ict_erp_approval_requests;
create policy "ERP admins manage approvals"
on public.ict_erp_approval_requests
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "ERP admins manage risks"
  on public.ict_erp_risks;
create policy "ERP admins manage risks"
on public.ict_erp_risks
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "ERP admins manage KPI targets"
  on public.ict_erp_kpi_targets;
create policy "ERP admins manage KPI targets"
on public.ict_erp_kpi_targets
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "ERP admins read health runs"
  on public.ict_erp_health_runs;
create policy "ERP admins read health runs"
on public.ict_erp_health_runs
for select
to authenticated
using (public.is_ict_admin());

grant select,insert,update on public.ict_erp_approval_requests to authenticated;
grant select,insert,update on public.ict_erp_risks to authenticated;
grant select,insert,update on public.ict_erp_kpi_targets to authenticated;
grant select on public.ict_erp_health_runs to authenticated;

-- ------------------------------------------------------------
-- I) Permission
-- ------------------------------------------------------------
insert into public.ict_admin_role_permissions(
  role,permission_key,is_allowed,updated_at
)
select r.role,'executive_control',false,now()
from (
  values
    ('admin'),
    ('manager'),
    ('sales'),
    ('engineer'),
    ('support'),
    ('hr'),
    ('finance')
) r(role)
on conflict(role,permission_key)
do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,
    updated_at=now()
where role in ('admin','manager','finance')
  and permission_key='executive_control';

notify pgrst,'reload schema';

commit;


-- ============================================================
-- 03 HEALTH CHECK — READ ONLY
-- ============================================================

with checks as (
  select 'table: ict_erp_approval_requests'::text check_name,
         to_regclass('public.ict_erp_approval_requests') is not null ok
  union all
  select 'table: ict_erp_risks',
         to_regclass('public.ict_erp_risks') is not null
  union all
  select 'table: ict_erp_kpi_targets',
         to_regclass('public.ict_erp_kpi_targets') is not null
  union all
  select 'table: ict_erp_health_runs',
         to_regclass('public.ict_erp_health_runs') is not null

  union all
  select 'function: executive snapshot',
         exists(
           select 1
           from information_schema.routines
           where routine_schema='public'
             and routine_name='ict_erp_executive_snapshot'
         )

  union all
  select 'function: ERP health',
         exists(
           select 1
           from information_schema.routines
           where routine_schema='public'
             and routine_name='ict_erp_run_health'
         )

  union all
  select 'function: decide approval',
         exists(
           select 1
           from information_schema.routines
           where routine_schema='public'
             and routine_name='ict_erp_decide_approval'
         )

  union all
  select 'permission: admin executive control',
         exists(
           select 1
           from public.ict_admin_role_permissions
           where role='admin'
             and permission_key='executive_control'
             and is_allowed=true
         )

  union all
  select 'permission: manager executive control',
         exists(
           select 1
           from public.ict_admin_role_permissions
           where role='manager'
             and permission_key='executive_control'
             and is_allowed=true
         )

  union all
  select 'RLS: approvals',
         (select relrowsecurity
          from pg_class
          where oid='public.ict_erp_approval_requests'::regclass)

  union all
  select 'RLS: risks',
         (select relrowsecurity
          from pg_class
          where oid='public.ict_erp_risks'::regclass)

  union all
  select 'RLS: KPI targets',
         (select relrowsecurity
          from pg_class
          where oid='public.ict_erp_kpi_targets'::regclass)

  union all
  select 'core preserved: projects',
         to_regclass('public.ict_delivery_projects') is not null

  union all
  select 'core preserved: finance',
         to_regclass('public.ict_invoices') is not null
         and to_regclass('public.ict_payments') is not null

  union all
  select 'core preserved: procurement',
         to_regclass('public.ict_purchase_orders') is not null
         and to_regclass('public.ict_purchase_requests') is not null

  union all
  select 'core preserved: HR',
         to_regclass('public.ict_hr_employees') is not null
)
select
  check_name,
  case when ok then 'PASS ✅' else 'FAIL ❌' end as result
from checks
order by check_name;


-- ============================================================
-- 04 FINAL RESULT
-- ============================================================

select
  'SPRINT 25 ALL-IN-ONE' as check_name,
  case
    when
      to_regclass('public.ict_erp_approval_requests') is not null
      and to_regclass('public.ict_erp_risks') is not null
      and to_regclass('public.ict_erp_kpi_targets') is not null
      and exists(
        select 1
        from information_schema.routines
        where routine_schema='public'
          and routine_name='ict_erp_executive_snapshot'
      )
      and exists(
        select 1
        from information_schema.routines
        where routine_schema='public'
          and routine_name='ict_erp_run_health'
      )
      and exists(
        select 1
        from public.ict_admin_role_permissions
        where role='admin'
          and permission_key='executive_control'
          and is_allowed=true
      )
    then 'PASS ✅'
    else 'FAIL ❌'
  end as result;
