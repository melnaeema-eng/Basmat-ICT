-- ============================================================
-- BASMAT ERP — SPRINT 35 FINAL MEGA
-- EXECUTIVE BI + ERP HEALTH + PRODUCTION CLOSURE
-- ============================================================

-- 01 PRECHECK: only objects proven by prior accepted sprints.
do $$
begin
  if to_regprocedure('public.is_ict_admin()') is null then raise exception 'PRECHECK FAIL: is_ict_admin() missing'; end if;
  if to_regclass('public.ict_customers') is null then raise exception 'PRECHECK FAIL: ict_customers missing'; end if;
  if to_regclass('public.ict_sales_orders') is null then raise exception 'PRECHECK FAIL: ict_sales_orders missing'; end if;
  if to_regclass('public.ict_delivery_projects') is null then raise exception 'PRECHECK FAIL: ict_delivery_projects missing'; end if;
  if to_regclass('public.ict_invoices') is null then raise exception 'PRECHECK FAIL: ict_invoices missing'; end if;
  if to_regclass('public.ict_payments') is null then raise exception 'PRECHECK FAIL: ict_payments missing'; end if;
  if to_regclass('public.ict_supplier_bills') is null then raise exception 'PRECHECK FAIL: ict_supplier_bills missing'; end if;
  if to_regclass('public.ict_inventory_transactions') is null then raise exception 'PRECHECK FAIL: ict_inventory_transactions missing'; end if;
  if to_regclass('public.ict_project_cost_entries') is null then raise exception 'PRECHECK FAIL: ict_project_cost_entries missing'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;
end $$;
select '01 S35 PRECHECK' check_name,'PASS ✅' result;

-- 02 EXECUTIVE BI
begin;

create or replace function public.ict_executive_erp_snapshot(p_start date,p_end date)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
 v_orders numeric:=0; v_billed numeric:=0; v_collected numeric:=0;
 v_supplier numeric:=0; v_inventory numeric:=0; v_manual numeric:=0;
 v_projects bigint:=0; v_customers bigint:=0; v_open_invoices bigint:=0;
 v_cost numeric:=0; v_profit numeric:=0;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 if p_end<p_start then raise exception 'الفترة غير صحيحة.'; end if;

 select count(*) into v_customers from public.ict_customers;
 select count(*) into v_projects from public.ict_delivery_projects where status not in('cancelled');
 select coalesce(sum(total_amount),0) into v_orders from public.ict_sales_orders
  where order_date between p_start and p_end and status not in('draft','cancelled');
 select coalesce(sum(total_amount),0),count(*) filter(where status not in('paid','cancelled'))
  into v_billed,v_open_invoices from public.ict_invoices
  where issue_date between p_start and p_end and status not in('draft','cancelled');
 select coalesce(sum(amount),0) into v_collected from public.ict_payments
  where payment_date between p_start and p_end and status not in('reversed','cancelled');
 select coalesce(sum(total_amount),0) into v_supplier from public.ict_supplier_bills
  where status not in('draft','cancelled');
 select coalesce(sum(quantity*unit_cost),0) into v_inventory from public.ict_inventory_transactions
  where transaction_type in('issue','adjustment_out');
 select coalesce(sum(amount),0) into v_manual from public.ict_project_cost_entries
  where cost_date between p_start and p_end;

 v_cost:=v_supplier+v_inventory+v_manual;
 v_profit:=v_billed-v_cost;

 return jsonb_build_object(
  'customers',v_customers,'active_projects',v_projects,'orders',v_orders,
  'billed',v_billed,'collected',v_collected,'open_invoices',v_open_invoices,
  'supplier_cost',v_supplier,'inventory_cost',v_inventory,'manual_project_cost',v_manual,
  'total_cost',v_cost,'gross_profit',v_profit,
  'gross_margin_percent',case when v_billed>0 then round(v_profit/v_billed*100,2) else 0 end,
  'collection_rate',case when v_billed>0 then round(v_collected/v_billed*100,2) else 0 end
 );
end $$;

create or replace function public.ict_erp_production_health()
returns table(check_name text,result text)
language plpgsql security definer set search_path=public
as $$
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 return query
 select x.n,case when x.ok then 'PASS ✅'::text else 'FAIL ❌'::text end
 from(values
  ('Customers',to_regclass('public.ict_customers') is not null),
  ('Sales Orders',to_regclass('public.ict_sales_orders') is not null),
  ('Projects',to_regclass('public.ict_delivery_projects') is not null),
  ('Invoices',to_regclass('public.ict_invoices') is not null),
  ('Payments',to_regclass('public.ict_payments') is not null),
  ('Supplier Bills',to_regclass('public.ict_supplier_bills') is not null),
  ('Inventory',to_regclass('public.ict_inventory_transactions') is not null),
  ('S34 Sales Targets',to_regclass('public.ict_sales_targets') is not null),
  ('S34 Project Costs',to_regclass('public.ict_project_cost_entries') is not null),
  ('S34 Portfolio RPC',to_regprocedure('public.ict_portfolio_profitability()') is not null),
  ('S35 Executive RPC',to_regprocedure('public.ict_executive_erp_snapshot(date,date)') is not null)
 ) as x(n,ok);
end $$;

grant execute on function public.ict_executive_erp_snapshot(date,date) to authenticated;
grant execute on function public.ict_erp_production_health() to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select distinct role,'erp_health',false,now()
from public.ict_admin_users where role is not null
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager') and permission_key='erp_health';

notify pgrst,'reload schema';
commit;

-- 03 SAFE HEALTH: do not execute protected RPC from SQL editor.
with c as(
 select 'Executive ERP Snapshot RPC' n,to_regprocedure('public.ict_executive_erp_snapshot(date,date)') is not null ok
 union all select 'ERP Production Health RPC',to_regprocedure('public.ict_erp_production_health()') is not null
 union all select 'S34 Sales Planning preserved',to_regprocedure('public.ict_sales_planning_snapshot(date,date)') is not null
 union all select 'S34 Portfolio preserved',to_regprocedure('public.ict_portfolio_profitability()') is not null
 union all select 'Admin ERP Health permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='erp_health' and is_allowed)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from c;

-- 04 FINAL
select 'SPRINT 35 FINAL MEGA' check_name,
case when
 to_regprocedure('public.ict_executive_erp_snapshot(date,date)') is not null
 and to_regprocedure('public.ict_erp_production_health()') is not null
 and to_regprocedure('public.ict_portfolio_profitability()') is not null
 and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='erp_health' and is_allowed)
then 'PASS ✅' else 'FAIL ❌' end result;
