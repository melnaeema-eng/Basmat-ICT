-- BASMAT ERP — SPRINT 24 BIG
-- 03 HEALTH CHECK — READ ONLY
with checks as (
 select 'table: ict_project_budgets'::text check_name,to_regclass('public.ict_project_budgets') is not null ok
 union all select 'table: ict_project_timesheets',to_regclass('public.ict_project_timesheets') is not null
 union all select 'table: ict_project_change_orders',to_regclass('public.ict_project_change_orders') is not null
 union all select 'function: project snapshot',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_project_financial_snapshot')
 union all select 'function: portfolio profitability',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_project_profitability_portfolio')
 union all select 'permission: admin project cost',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='project_cost_control' and is_allowed=true)
 union all select 'permission: finance project cost',exists(select 1 from public.ict_admin_role_permissions where role='finance' and permission_key='project_cost_control' and is_allowed=true)
 union all select 'core: projects',to_regclass('public.ict_delivery_projects') is not null
 union all select 'core: invoices',to_regclass('public.ict_invoices') is not null
 union all select 'core: expenses',to_regclass('public.ict_expenses') is not null
 union all select 'core: stock',to_regclass('public.ict_stock_transactions') is not null
)
select check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by check_name;

select 'SPRINT 24 HEALTH' check_name,
case when to_regclass('public.ict_project_budgets') is not null
 and to_regclass('public.ict_project_timesheets') is not null
 and to_regclass('public.ict_project_change_orders') is not null
 and exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_project_financial_snapshot')
 and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='project_cost_control' and is_allowed=true)
then 'PASS ✅' else 'FAIL ❌' end result;
