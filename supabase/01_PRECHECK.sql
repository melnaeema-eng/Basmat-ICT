-- BASMAT ERP — SPRINT 24 BIG
-- 01 PRECHECK — READ ONLY
do $$
begin
  if to_regclass('public.ict_delivery_projects') is null then raise exception 'PRECHECK FAIL: ict_delivery_projects missing'; end if;
  if to_regclass('public.ict_invoices') is null then raise exception 'PRECHECK FAIL: ict_invoices missing'; end if;
  if to_regclass('public.ict_payments') is null then raise exception 'PRECHECK FAIL: ict_payments missing'; end if;
  if to_regclass('public.ict_expenses') is null then raise exception 'PRECHECK FAIL: ict_expenses missing'; end if;
  if to_regclass('public.ict_purchase_orders') is null then raise exception 'PRECHECK FAIL: ict_purchase_orders missing'; end if;
  if to_regclass('public.ict_stock_transactions') is null then raise exception 'PRECHECK FAIL: ict_stock_transactions missing'; end if;
  if to_regclass('public.ict_hr_employees') is null then raise exception 'PRECHECK FAIL: ict_hr_employees missing'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_delivery_projects' and column_name='contract_value')
    then raise exception 'PRECHECK FAIL: ict_delivery_projects.contract_value missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_invoices' and column_name='project_id')
    then raise exception 'PRECHECK FAIL: ict_invoices.project_id missing'; end if;
  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_expenses' and column_name='project_id')
    then raise exception 'PRECHECK FAIL: ict_expenses.project_id missing'; end if;
end $$;

select 'SPRINT 24 PRECHECK' check_name,'PASS ✅' result,
'Projects + Finance + Procurement + Inventory + HR dependencies verified.' details;
