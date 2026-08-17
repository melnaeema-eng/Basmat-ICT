-- ============================================================
-- BASMAT ERP — SPRINT 32 BIG
-- SERVICE MANAGEMENT + SLA + FIELD SERVICE
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_support_tickets') is null then
    raise exception 'PRECHECK FAIL: ict_support_tickets missing';
  end if;

  if to_regclass('public.ict_customers') is null then
    raise exception 'PRECHECK FAIL: ict_customers missing';
  end if;

  if to_regclass('public.ict_delivery_projects') is null then
    raise exception 'PRECHECK FAIL: ict_delivery_projects missing';
  end if;

  if to_regclass('public.ict_contracts') is null then
    raise exception 'PRECHECK FAIL: ict_contracts missing';
  end if;

  if to_regclass('public.ict_contract_sla_policies') is null then
    raise exception 'PRECHECK FAIL: ict_contract_sla_policies missing. Sprint 30 is required.';
  end if;

  if to_regclass('public.ict_hr_employees') is null then
    raise exception 'PRECHECK FAIL: ict_hr_employees missing';
  end if;

  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_support_tickets'
      and column_name='priority'
  ) then
    raise exception 'PRECHECK FAIL: ict_support_tickets.priority missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_support_tickets'
      and column_name='created_at'
  ) then
    raise exception 'PRECHECK FAIL: ict_support_tickets.created_at missing';
  end if;
end $$;

select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

-- Extend the existing support ticket table instead of creating a duplicate ticket system.
alter table public.ict_support_tickets
  add column if not exists contract_id uuid references public.ict_contracts(id) on delete set null,
  add column if not exists severity text,
  add column if not exists first_response_at timestamptz,
  add column if not exists resolved_at timestamptz,
  add column if not exists response_due_at timestamptz,
  add column if not exists resolution_due_at timestamptz,
  add column if not exists sla_status text not null default 'not_applied',
  add column if not exists sla_policy_id uuid references public.ict_contract_sla_policies(id) on delete set null,
  add column if not exists service_owner_id uuid references public.ict_hr_employees(id) on delete set null;

do $$
begin
  if not exists(
    select 1 from pg_constraint
    where conname='ict_support_tickets_severity_check'
  ) then
    alter table public.ict_support_tickets
      add constraint ict_support_tickets_severity_check
      check(severity is null or severity in('critical','high','medium','low'));
  end if;

  if not exists(
    select 1 from pg_constraint
    where conname='ict_support_tickets_sla_status_check'
  ) then
    alter table public.ict_support_tickets
      add constraint ict_support_tickets_sla_status_check
      check(sla_status in('not_applied','on_track','response_breached','resolution_breached','met'));
  end if;
end $$;

create index if not exists ict_support_tickets_contract_idx
  on public.ict_support_tickets(contract_id);

create index if not exists ict_support_tickets_sla_idx
  on public.ict_support_tickets(sla_status,response_due_at,resolution_due_at);

create sequence if not exists public.ict_service_visit_no_seq start 1;

create or replace function public.ict_next_service_visit_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'SV-'||to_char(current_date,'YYYY')||'-'||
         lpad(nextval('public.ict_service_visit_no_seq')::text,6,'0');
end $$;

create table if not exists public.ict_service_visits(
  id uuid primary key default gen_random_uuid(),
  visit_no text not null unique default public.ict_next_service_visit_no(),
  ticket_id uuid references public.ict_support_tickets(id) on delete set null,
  customer_id uuid not null references public.ict_customers(id) on delete restrict,
  project_id uuid references public.ict_delivery_projects(id) on delete set null,
  contract_id uuid references public.ict_contracts(id) on delete set null,
  engineer_id uuid references public.ict_hr_employees(id) on delete set null,
  visit_type text not null default 'corrective'
    check(visit_type in('corrective','preventive','inspection','installation','survey','other')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  location text,
  work_performed text,
  findings text,
  recommendations text,
  customer_contact_name text,
  customer_acceptance boolean,
  status text not null default 'scheduled'
    check(status in('scheduled','in_progress','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_service_visits_ticket_idx
  on public.ict_service_visits(ticket_id,scheduled_start);

create index if not exists ict_service_visits_engineer_idx
  on public.ict_service_visits(engineer_id,scheduled_start);

create sequence if not exists public.ict_pm_plan_no_seq start 1;

create or replace function public.ict_next_pm_plan_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'PM-'||to_char(current_date,'YYYY')||'-'||
         lpad(nextval('public.ict_pm_plan_no_seq')::text,5,'0');
end $$;

create table if not exists public.ict_preventive_maintenance_plans(
  id uuid primary key default gen_random_uuid(),
  plan_no text not null unique default public.ict_next_pm_plan_no(),
  customer_id uuid not null references public.ict_customers(id) on delete restrict,
  project_id uuid references public.ict_delivery_projects(id) on delete set null,
  contract_id uuid references public.ict_contracts(id) on delete set null,
  plan_name text not null,
  frequency text not null
    check(frequency in('monthly','quarterly','semi_annual','annual')),
  next_visit_date date not null,
  assigned_engineer_id uuid references public.ict_hr_employees(id) on delete set null,
  scope text,
  status text not null default 'active'
    check(status in('active','paused','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_service_parts_usage(
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references public.ict_service_visits(id) on delete cascade,
  description text not null,
  quantity numeric(16,3) not null default 1 check(quantity>0),
  unit_cost numeric(16,2) not null default 0 check(unit_cost>=0),
  total_cost numeric(16,2) generated always as (round(quantity*unit_cost,2)) stored,
  created_at timestamptz not null default now()
);

create or replace function public.ict_apply_ticket_sla(
  p_ticket_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  t public.ict_support_tickets%rowtype;
  v_severity text;
  p public.ict_contract_sla_policies%rowtype;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select * into t
  from public.ict_support_tickets
  where id=p_ticket_id
  for update;

  if not found then
    raise exception 'التذكرة غير موجودة.';
  end if;

  v_severity:=coalesce(
    t.severity,
    case t.priority
      when 'urgent' then 'critical'
      when 'high' then 'high'
      when 'normal' then 'medium'
      else 'low'
    end
  );

  if t.contract_id is null then
    update public.ict_support_tickets
    set severity=v_severity,
        sla_status='not_applied'
    where id=t.id;

    return jsonb_build_object(
      'success',true,
      'sla_applied',false,
      'reason','no_contract'
    );
  end if;

  select * into p
  from public.ict_contract_sla_policies
  where contract_id=t.contract_id
    and severity=v_severity
    and active=true
  limit 1;

  if not found then
    update public.ict_support_tickets
    set severity=v_severity,
        sla_status='not_applied'
    where id=t.id;

    return jsonb_build_object(
      'success',true,
      'sla_applied',false,
      'reason','no_policy'
    );
  end if;

  update public.ict_support_tickets
  set severity=v_severity,
      sla_policy_id=p.id,
      response_due_at=t.created_at + make_interval(mins=>p.response_minutes),
      resolution_due_at=t.created_at + make_interval(mins=>p.resolution_minutes),
      sla_status='on_track'
  where id=t.id;

  return jsonb_build_object(
    'success',true,
    'sla_applied',true,
    'severity',v_severity,
    'response_due_at',t.created_at + make_interval(mins=>p.response_minutes),
    'resolution_due_at',t.created_at + make_interval(mins=>p.resolution_minutes)
  );
end $$;

create or replace function public.ict_refresh_sla_status()
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

  update public.ict_support_tickets
  set sla_status =
    case
      when resolved_at is not null
        and resolution_due_at is not null
        and resolved_at<=resolution_due_at then 'met'
      when resolved_at is null
        and resolution_due_at is not null
        and now()>resolution_due_at then 'resolution_breached'
      when first_response_at is null
        and response_due_at is not null
        and now()>response_due_at then 'response_breached'
      else 'on_track'
    end
  where sla_policy_id is not null
    and status not in('closed');

  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.ict_service_management_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_open integer:=0;
  v_urgent integer:=0;
  v_ontrack integer:=0;
  v_breached integer:=0;
  v_resolved integer:=0;
  v_visits_today integer:=0;
  v_pm_due30 integer:=0;
  v_parts_cost numeric:=0;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select
    count(*) filter(where status in('open','in_progress','waiting_customer')),
    count(*) filter(where priority='urgent' and status not in('resolved','closed')),
    count(*) filter(where sla_status='on_track'),
    count(*) filter(where sla_status in('response_breached','resolution_breached')),
    count(*) filter(where status in('resolved','closed'))
  into v_open,v_urgent,v_ontrack,v_breached,v_resolved
  from public.ict_support_tickets;

  select count(*) into v_visits_today
  from public.ict_service_visits
  where scheduled_start::date=current_date
    and status in('scheduled','in_progress');

  select count(*) into v_pm_due30
  from public.ict_preventive_maintenance_plans
  where status='active'
    and next_visit_date between current_date and current_date+30;

  select coalesce(sum(total_cost),0) into v_parts_cost
  from public.ict_service_parts_usage;

  return jsonb_build_object(
    'open_tickets',v_open,
    'urgent_tickets',v_urgent,
    'sla_on_track',v_ontrack,
    'sla_breached',v_breached,
    'resolved_tickets',v_resolved,
    'visits_today',v_visits_today,
    'pm_due_30_days',v_pm_due30,
    'service_parts_cost',v_parts_cost
  );
end $$;

grant execute on function public.ict_apply_ticket_sla(uuid) to authenticated;
grant execute on function public.ict_refresh_sla_status() to authenticated;
grant execute on function public.ict_service_management_snapshot() to authenticated;

alter table public.ict_service_visits enable row level security;
alter table public.ict_preventive_maintenance_plans enable row level security;
alter table public.ict_service_parts_usage enable row level security;

drop policy if exists "ERP admins service visits" on public.ict_service_visits;
create policy "ERP admins service visits"
on public.ict_service_visits
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

drop policy if exists "ERP admins PM plans" on public.ict_preventive_maintenance_plans;
create policy "ERP admins PM plans"
on public.ict_preventive_maintenance_plans
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

drop policy if exists "ERP admins service parts" on public.ict_service_parts_usage;
create policy "ERP admins service parts"
on public.ict_service_parts_usage
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

grant select,insert,update,delete on public.ict_service_visits to authenticated;
grant select,insert,update,delete on public.ict_preventive_maintenance_plans to authenticated;
grant select,insert,update,delete on public.ict_service_parts_usage to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'service_management',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','engineer','support')
  and permission_key='service_management';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
  select 'Support ticket SLA columns' n,
    exists(select 1 from information_schema.columns
      where table_schema='public'
        and table_name='ict_support_tickets'
        and column_name='sla_status') ok

  union all select 'Service visits',
    to_regclass('public.ict_service_visits') is not null

  union all select 'PM plans',
    to_regclass('public.ict_preventive_maintenance_plans') is not null

  union all select 'Service parts',
    to_regclass('public.ict_service_parts_usage') is not null

  union all select 'Apply SLA RPC',
    exists(select 1 from information_schema.routines
      where routine_schema='public'
        and routine_name='ict_apply_ticket_sla')

  union all select 'Refresh SLA RPC',
    exists(select 1 from information_schema.routines
      where routine_schema='public'
        and routine_name='ict_refresh_sla_status')

  union all select 'Service snapshot RPC',
    exists(select 1 from information_schema.routines
      where routine_schema='public'
        and routine_name='ict_service_management_snapshot')

  union all select 'Support permission',
    exists(select 1 from public.ict_admin_role_permissions
      where role='support'
        and permission_key='service_management'
        and is_allowed=true)

  union all select 'Engineer permission',
    exists(select 1 from public.ict_admin_role_permissions
      where role='engineer'
        and permission_key='service_management'
        and is_allowed=true)
)
select n check_name,
       case when ok then 'PASS ✅' else 'FAIL ❌' end result
from checks
order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- No auth-protected RPC is executed here.
with safe_checks as(
  select 'Existing ticket table preserved' n,
    to_regclass('public.ict_support_tickets') is not null ok

  union all select 'Contract SLA table preserved',
    to_regclass('public.ict_contract_sla_policies') is not null

  union all select 'Ticket contract FK added',
    exists(
      select 1
      from information_schema.columns
      where table_schema='public'
        and table_name='ict_support_tickets'
        and column_name='contract_id'
    )

  union all select 'Service visit ticket FK',
    exists(
      select 1
      from information_schema.table_constraints
      where table_schema='public'
        and table_name='ict_service_visits'
        and constraint_type='FOREIGN KEY'
    )
)
select n check_name,
       case when ok then 'PASS ✅' else 'FAIL ❌' end result
from safe_checks;

-- 05 FINAL RESULT
select 'SPRINT 32 ALL-IN-ONE' check_name,
case when
  to_regclass('public.ict_service_visits') is not null
  and to_regclass('public.ict_preventive_maintenance_plans') is not null
  and exists(
    select 1 from information_schema.routines
    where routine_schema='public'
      and routine_name='ict_service_management_snapshot'
  )
  and exists(
    select 1 from public.ict_admin_role_permissions
    where role='admin'
      and permission_key='service_management'
      and is_allowed=true
  )
then 'PASS ✅'
else 'FAIL ❌'
end result;
