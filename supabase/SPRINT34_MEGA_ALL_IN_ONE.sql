-- ============================================================
-- BASMAT ERP — SPRINT 34 MEGA
-- COMMERCIAL + SALES PLANNING + PROJECT PROFITABILITY
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_sales_orders') is null then raise exception 'PRECHECK FAIL: ict_sales_orders missing'; end if;
  if to_regclass('public.ict_customers') is null then raise exception 'PRECHECK FAIL: ict_customers missing'; end if;
  if to_regclass('public.ict_delivery_projects') is null then raise exception 'PRECHECK FAIL: ict_delivery_projects missing'; end if;
  if to_regclass('public.ict_invoices') is null then raise exception 'PRECHECK FAIL: ict_invoices missing'; end if;
  if to_regclass('public.ict_payments') is null then raise exception 'PRECHECK FAIL: ict_payments missing'; end if;
  if to_regclass('public.ict_purchase_orders') is null then raise exception 'PRECHECK FAIL: ict_purchase_orders missing'; end if;
  if to_regclass('public.ict_supplier_bills') is null then raise exception 'PRECHECK FAIL: ict_supplier_bills missing'; end if;
  if to_regclass('public.ict_inventory_transactions') is null then raise exception 'PRECHECK FAIL: ict_inventory_transactions missing'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;
  if to_regprocedure('public.is_ict_admin()') is null then raise exception 'PRECHECK FAIL: is_ict_admin() missing'; end if;
end $$;

select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create table if not exists public.ict_sales_targets(
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  owner_user_id uuid references auth.users(id) on delete set null,
  revenue_target numeric(16,2) not null default 0 check(revenue_target>=0),
  orders_target numeric(16,2) not null default 0 check(orders_target>=0),
  collection_target numeric(16,2) not null default 0 check(collection_target>=0),
  margin_target_percent numeric(8,2) not null default 0 check(margin_target_percent>=0 and margin_target_percent<=100),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(period_end>=period_start)
);

create table if not exists public.ict_sales_forecast_entries(
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.ict_customers(id) on delete set null,
  sales_order_id uuid references public.ict_sales_orders(id) on delete set null,
  forecast_date date not null,
  forecast_type text not null default 'revenue'
    check(forecast_type in('revenue','collection')),
  amount numeric(16,2) not null check(amount>=0),
  probability integer not null default 50 check(probability between 0 and 100),
  status text not null default 'forecast'
    check(status in('forecast','committed','won','lost','cancelled')),
  owner_user_id uuid references auth.users(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_project_cost_budgets(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ict_delivery_projects(id) on delete cascade,
  labor_budget numeric(16,2) not null default 0 check(labor_budget>=0),
  material_budget numeric(16,2) not null default 0 check(material_budget>=0),
  subcontract_budget numeric(16,2) not null default 0 check(subcontract_budget>=0),
  expense_budget numeric(16,2) not null default 0 check(expense_budget>=0),
  other_budget numeric(16,2) not null default 0 check(other_budget>=0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(project_id)
);

create table if not exists public.ict_project_cost_entries(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ict_delivery_projects(id) on delete cascade,
  cost_date date not null default current_date,
  cost_type text not null
    check(cost_type in('labor','material','subcontract','expense','other')),
  amount numeric(16,2) not null check(amount>=0),
  source_type text,
  source_id uuid,
  reference_no text,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ict_sales_targets_period_idx
  on public.ict_sales_targets(period_start,period_end);
create index if not exists ict_sales_forecast_date_idx
  on public.ict_sales_forecast_entries(forecast_date,status);
create index if not exists ict_project_cost_entries_project_idx
  on public.ict_project_cost_entries(project_id,cost_date);

create or replace function public.ict_sales_planning_snapshot(
  p_start date,
  p_end date
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_orders numeric:=0;
  v_billed numeric:=0;
  v_collected numeric:=0;
  v_target_rev numeric:=0;
  v_target_orders numeric:=0;
  v_target_collect numeric:=0;
  v_forecast_rev numeric:=0;
  v_forecast_collect numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
  if p_end<p_start then raise exception 'الفترة غير صحيحة.'; end if;

  select coalesce(sum(total_amount),0)
  into v_orders
  from public.ict_sales_orders
  where order_date between p_start and p_end
    and status not in('draft','cancelled');

  select coalesce(sum(total_amount),0)
  into v_billed
  from public.ict_invoices
  where issue_date between p_start and p_end
    and status not in('draft','cancelled');

  select coalesce(sum(amount),0)
  into v_collected
  from public.ict_payments
  where payment_date between p_start and p_end
    and status not in('reversed','cancelled');

  select
    coalesce(sum(revenue_target),0),
    coalesce(sum(orders_target),0),
    coalesce(sum(collection_target),0)
  into v_target_rev,v_target_orders,v_target_collect
  from public.ict_sales_targets
  where period_end>=p_start and period_start<=p_end;

  select
    coalesce(sum(amount*probability/100.0) filter(where forecast_type='revenue'),0),
    coalesce(sum(amount*probability/100.0) filter(where forecast_type='collection'),0)
  into v_forecast_rev,v_forecast_collect
  from public.ict_sales_forecast_entries
  where forecast_date between p_start and p_end
    and status in('forecast','committed');

  return jsonb_build_object(
    'orders_value',v_orders,
    'billed_value',v_billed,
    'collected_value',v_collected,
    'revenue_target',v_target_rev,
    'orders_target',v_target_orders,
    'collection_target',v_target_collect,
    'weighted_revenue_forecast',v_forecast_rev,
    'weighted_collection_forecast',v_forecast_collect,
    'orders_achievement',case when v_target_orders>0 then round(v_orders/v_target_orders*100,2) else 0 end,
    'revenue_achievement',case when v_target_rev>0 then round(v_billed/v_target_rev*100,2) else 0 end,
    'collection_achievement',case when v_target_collect>0 then round(v_collected/v_target_collect*100,2) else 0 end
  );
end $$;

create or replace function public.ict_project_profitability_snapshot(
  p_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_project public.ict_delivery_projects%rowtype;
  v_billed numeric:=0;
  v_collected numeric:=0;
  v_po numeric:=0;
  v_supplier_bills numeric:=0;
  v_inventory numeric:=0;
  v_manual numeric:=0;
  v_budget numeric:=0;
  v_actual numeric:=0;
  v_profit numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  select * into v_project
  from public.ict_delivery_projects
  where id=p_project_id;

  if not found then raise exception 'المشروع غير موجود.'; end if;

  select coalesce(sum(total_amount),0),coalesce(sum(amount_paid),0)
  into v_billed,v_collected
  from public.ict_invoices
  where project_id=p_project_id
    and status not in('draft','cancelled');

  select coalesce(sum(amount),0)
  into v_po
  from public.ict_purchase_orders
  where project_id=p_project_id
    and status not in('cancelled');

  select coalesce(sum(total_amount),0)
  into v_supplier_bills
  from public.ict_supplier_bills
  where project_id=p_project_id
    and status not in('draft','cancelled');

  select coalesce(sum(quantity*unit_cost),0)
  into v_inventory
  from public.ict_inventory_transactions
  where project_id=p_project_id
    and transaction_type in('issue','adjustment_out');

  select coalesce(sum(amount),0)
  into v_manual
  from public.ict_project_cost_entries
  where project_id=p_project_id;

  select coalesce(labor_budget+material_budget+subcontract_budget+expense_budget+other_budget,0)
  into v_budget
  from public.ict_project_cost_budgets
  where project_id=p_project_id;

  v_actual:=v_supplier_bills+v_inventory+v_manual;
  v_profit:=v_billed-v_actual;

  return jsonb_build_object(
    'project_id',p_project_id,
    'project_no',v_project.project_no,
    'project_name',v_project.project_name,
    'contract_value',coalesce(v_project.contract_value,0),
    'billed_value',v_billed,
    'collected_value',v_collected,
    'purchase_order_commitments',v_po,
    'supplier_bills',v_supplier_bills,
    'inventory_cost',v_inventory,
    'manual_costs',v_manual,
    'budget_cost',v_budget,
    'actual_cost',v_actual,
    'gross_profit',v_profit,
    'margin_percent',case when v_billed>0 then round(v_profit/v_billed*100,2) else 0 end,
    'cost_variance',v_budget-v_actual
  );
end $$;

create or replace function public.ict_portfolio_profitability()
returns table(
  project_id uuid,
  project_no text,
  project_name text,
  contract_value numeric,
  billed_value numeric,
  actual_cost numeric,
  gross_profit numeric,
  margin_percent numeric
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  return query
  select
    p.id,
    p.project_no,
    p.project_name,
    coalesce(p.contract_value,0),
    coalesce(i.billed,0),
    coalesce(sb.supplier_cost,0)+coalesce(inv.inventory_cost,0)+coalesce(mc.manual_cost,0),
    coalesce(i.billed,0)-
      (coalesce(sb.supplier_cost,0)+coalesce(inv.inventory_cost,0)+coalesce(mc.manual_cost,0)),
    case
      when coalesce(i.billed,0)>0 then
        round(
          (
            coalesce(i.billed,0)-
            (coalesce(sb.supplier_cost,0)+coalesce(inv.inventory_cost,0)+coalesce(mc.manual_cost,0))
          )/i.billed*100,2
        )
      else 0
    end
  from public.ict_delivery_projects p
  left join lateral (
    select sum(total_amount) billed
    from public.ict_invoices x
    where x.project_id=p.id and x.status not in('draft','cancelled')
  ) i on true
  left join lateral (
    select sum(total_amount) supplier_cost
    from public.ict_supplier_bills x
    where x.project_id=p.id and x.status not in('draft','cancelled')
  ) sb on true
  left join lateral (
    select sum(quantity*unit_cost) inventory_cost
    from public.ict_inventory_transactions x
    where x.project_id=p.id and x.transaction_type in('issue','adjustment_out')
  ) inv on true
  left join lateral (
    select sum(amount) manual_cost
    from public.ict_project_cost_entries x
    where x.project_id=p.id
  ) mc on true
  where p.status not in('cancelled')
  order by gross_profit desc;
end $$;

grant execute on function public.ict_sales_planning_snapshot(date,date) to authenticated;
grant execute on function public.ict_project_profitability_snapshot(uuid) to authenticated;
grant execute on function public.ict_portfolio_profitability() to authenticated;

alter table public.ict_sales_targets enable row level security;
alter table public.ict_sales_forecast_entries enable row level security;
alter table public.ict_project_cost_budgets enable row level security;
alter table public.ict_project_cost_entries enable row level security;

drop policy if exists "ERP admins sales targets" on public.ict_sales_targets;
create policy "ERP admins sales targets" on public.ict_sales_targets
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins sales forecast" on public.ict_sales_forecast_entries;
create policy "ERP admins sales forecast" on public.ict_sales_forecast_entries
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins project cost budgets" on public.ict_project_cost_budgets;
create policy "ERP admins project cost budgets" on public.ict_project_cost_budgets
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins project cost entries" on public.ict_project_cost_entries;
create policy "ERP admins project cost entries" on public.ict_project_cost_entries
for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

grant select,insert,update,delete on public.ict_sales_targets to authenticated;
grant select,insert,update,delete on public.ict_sales_forecast_entries to authenticated;
grant select,insert,update,delete on public.ict_project_cost_budgets to authenticated;
grant select,insert,update,delete on public.ict_project_cost_entries to authenticated;

-- Use only roles that already exist in the live admin-user table to avoid role-constraint guessing.
insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select distinct role,'sales_planning',false,now()
from public.ict_admin_users
where role is not null
on conflict(role,permission_key) do nothing;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select distinct role,'project_profitability',false,now()
from public.ict_admin_users
where role is not null
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','sales','finance')
  and permission_key='sales_planning';

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','engineer','finance')
  and permission_key='project_profitability';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
  select 'Sales targets' n,to_regclass('public.ict_sales_targets') is not null ok
  union all select 'Sales forecast',to_regclass('public.ict_sales_forecast_entries') is not null
  union all select 'Project cost budgets',to_regclass('public.ict_project_cost_budgets') is not null
  union all select 'Project cost entries',to_regclass('public.ict_project_cost_entries') is not null
  union all select 'Sales planning RPC',to_regprocedure('public.ict_sales_planning_snapshot(date,date)') is not null
  union all select 'Project profitability RPC',to_regprocedure('public.ict_project_profitability_snapshot(uuid)') is not null
  union all select 'Portfolio profitability RPC',to_regprocedure('public.ict_portfolio_profitability()') is not null
  union all select 'Sales planning admin permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='sales_planning' and is_allowed)
  union all select 'Project profitability admin permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='project_profitability' and is_allowed)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- No protected RPC is executed here.
with checks as(
  select 'S33 Inventory preserved' n,to_regclass('public.ict_inventory_transactions') is not null ok
  union all select 'S29 Sales Orders preserved',to_regclass('public.ict_sales_orders') is not null
  union all select 'Projects preserved',to_regclass('public.ict_delivery_projects') is not null
  union all select 'Invoices preserved',to_regclass('public.ict_invoices') is not null
  union all select 'Supplier bills preserved',to_regclass('public.ict_supplier_bills') is not null
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks;

-- 05 FINAL
select 'SPRINT 34 MEGA ALL-IN-ONE' check_name,
case when
  to_regclass('public.ict_sales_targets') is not null
  and to_regclass('public.ict_project_cost_entries') is not null
  and to_regprocedure('public.ict_sales_planning_snapshot(date,date)') is not null
  and to_regprocedure('public.ict_portfolio_profitability()') is not null
  and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='sales_planning' and is_allowed)
  and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='project_profitability' and is_allowed)
then 'PASS ✅' else 'FAIL ❌' end result;
