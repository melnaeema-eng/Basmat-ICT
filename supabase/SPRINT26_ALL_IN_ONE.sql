-- BASMAT ERP — SPRINT 26 BIG
-- BUDGETING + CASHFLOW + FORECASTING
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> FINAL RESULT

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_invoices') is null then raise exception 'PRECHECK FAIL: ict_invoices missing'; end if;
  if to_regclass('public.ict_payments') is null then raise exception 'PRECHECK FAIL: ict_payments missing'; end if;
  if to_regclass('public.ict_expenses') is null then raise exception 'PRECHECK FAIL: ict_expenses missing'; end if;
  if to_regclass('public.ict_purchase_orders') is null then raise exception 'PRECHECK FAIL: ict_purchase_orders missing'; end if;
  if to_regclass('public.ict_payroll_runs') is null then raise exception 'PRECHECK FAIL: ict_payroll_runs missing'; end if;
  if to_regclass('public.ict_delivery_projects') is null then raise exception 'PRECHECK FAIL: ict_delivery_projects missing'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;
end $$;
select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create table if not exists public.ict_financial_budgets(
 id uuid primary key default gen_random_uuid(),
 budget_name text not null,
 fiscal_year integer not null,
 department text,
 project_id uuid,
 revenue_budget numeric(16,2) not null default 0,
 expense_budget numeric(16,2) not null default 0,
 capex_budget numeric(16,2) not null default 0,
 payroll_budget numeric(16,2) not null default 0,
 status text not null default 'draft' check(status in('draft','approved','closed')),
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_cashflow_forecasts(
 id uuid primary key default gen_random_uuid(),
 forecast_date date not null,
 forecast_type text not null check(forecast_type in('inflow','outflow')),
 category text not null,
 project_id uuid,
 description text,
 amount numeric(16,2) not null check(amount>=0),
 probability integer not null default 100 check(probability between 0 and 100),
 status text not null default 'forecast' check(status in('forecast','confirmed','realized','cancelled')),
 source_type text,
 source_id uuid,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists ict_cashflow_forecasts_date_idx on public.ict_cashflow_forecasts(forecast_date,status);
create index if not exists ict_financial_budgets_year_idx on public.ict_financial_budgets(fiscal_year,status);

create or replace function public.ict_financial_planning_snapshot(p_year integer default extract(year from current_date)::integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 b_rev numeric:=0; b_exp numeric:=0; b_capex numeric:=0; b_pay numeric:=0;
 actual_rev numeric:=0; actual_exp numeric:=0; actual_pay numeric:=0;
 f_in numeric:=0; f_out numeric:=0;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

 select coalesce(sum(revenue_budget),0),coalesce(sum(expense_budget),0),
        coalesce(sum(capex_budget),0),coalesce(sum(payroll_budget),0)
 into b_rev,b_exp,b_capex,b_pay
 from public.ict_financial_budgets where fiscal_year=p_year and status<>'closed';

 select coalesce(sum(amount),0) into actual_rev from public.ict_payments
 where extract(year from payment_date)=p_year and status not in('reversed','cancelled');

 select coalesce(sum(amount+tax_amount),0) into actual_exp from public.ict_expenses
 where extract(year from expense_date)=p_year and status not in('draft','cancelled');

 select coalesce(sum(total_net),0) into actual_pay from public.ict_payroll_runs
 where year=p_year and status in('approved','paid');

 select
  coalesce(sum(amount*probability/100.0) filter(where forecast_type='inflow'),0),
  coalesce(sum(amount*probability/100.0) filter(where forecast_type='outflow'),0)
 into f_in,f_out
 from public.ict_cashflow_forecasts
 where extract(year from forecast_date)=p_year and status in('forecast','confirmed');

 return jsonb_build_object(
  'year',p_year,'budget_revenue',b_rev,'budget_expense',b_exp,'budget_capex',b_capex,
  'budget_payroll',b_pay,'actual_revenue',actual_rev,'actual_expense',actual_exp,
  'actual_payroll',actual_pay,'forecast_inflow',f_in,'forecast_outflow',f_out,
  'forecast_net',f_in-f_out,'operating_actual_net',actual_rev-actual_exp-actual_pay,
  'revenue_achievement',case when b_rev>0 then round(actual_rev/b_rev*100,2) else 0 end,
  'expense_utilization',case when b_exp>0 then round(actual_exp/b_exp*100,2) else 0 end
 );
end $$;
grant execute on function public.ict_financial_planning_snapshot(integer) to authenticated;

create or replace function public.ict_cashflow_timeline(p_from date default current_date, p_to date default current_date+interval '90 days')
returns table(flow_date date,inflow numeric,outflow numeric,net numeric)
language sql security definer set search_path=public as $$
 select forecast_date,
  coalesce(sum(amount*probability/100.0) filter(where forecast_type='inflow'),0),
  coalesce(sum(amount*probability/100.0) filter(where forecast_type='outflow'),0),
  coalesce(sum(case when forecast_type='inflow' then amount*probability/100.0 else -amount*probability/100.0 end),0)
 from public.ict_cashflow_forecasts
 where forecast_date between p_from and p_to and status in('forecast','confirmed')
 group by forecast_date order by forecast_date
$$;
grant execute on function public.ict_cashflow_timeline(date,date) to authenticated;

alter table public.ict_financial_budgets enable row level security;
alter table public.ict_cashflow_forecasts enable row level security;
drop policy if exists "ERP admins budgets" on public.ict_financial_budgets;
create policy "ERP admins budgets" on public.ict_financial_budgets for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());
drop policy if exists "ERP admins cashflow" on public.ict_cashflow_forecasts;
create policy "ERP admins cashflow" on public.ict_cashflow_forecasts for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());
grant select,insert,update,delete on public.ict_financial_budgets to authenticated;
grant select,insert,update,delete on public.ict_cashflow_forecasts to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'financial_planning',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;
update public.ict_admin_role_permissions set is_allowed=true,updated_at=now()
where role in('admin','manager','finance') and permission_key='financial_planning';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with c as(
 select 'budget table' n,to_regclass('public.ict_financial_budgets') is not null ok
 union all select 'cashflow table',to_regclass('public.ict_cashflow_forecasts') is not null
 union all select 'snapshot rpc',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_financial_planning_snapshot')
 union all select 'timeline rpc',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_cashflow_timeline')
 union all select 'permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='financial_planning' and is_allowed)
 union all select 'finance preserved',to_regclass('public.ict_invoices') is not null and to_regclass('public.ict_payments') is not null
 union all select 'projects preserved',to_regclass('public.ict_delivery_projects') is not null
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from c;

-- 04 FINAL RESULT
select 'SPRINT 26 ALL-IN-ONE' check_name,
case when to_regclass('public.ict_financial_budgets') is not null
 and to_regclass('public.ict_cashflow_forecasts') is not null
 and exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_financial_planning_snapshot')
 and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='financial_planning' and is_allowed)
then 'PASS ✅' else 'FAIL ❌' end result;
