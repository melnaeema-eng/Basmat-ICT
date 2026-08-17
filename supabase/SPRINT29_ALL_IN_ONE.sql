-- ============================================================
-- BASMAT ERP — SPRINT 29 BIG
-- ORDER-TO-CASH + REVENUE CONTROL
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_customers') is null then raise exception 'PRECHECK FAIL: ict_customers missing'; end if;
  if to_regclass('public.ict_projects') is null then raise exception 'PRECHECK FAIL: ict_projects missing'; end if;
  if to_regclass('public.ict_invoices') is null then raise exception 'PRECHECK FAIL: ict_invoices missing'; end if;
  if to_regclass('public.ict_payments') is null then raise exception 'PRECHECK FAIL: ict_payments missing'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;

  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_invoices' and column_name='balance_due')
  then raise exception 'PRECHECK FAIL: ict_invoices.balance_due missing'; end if;

  if not exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_invoices' and column_name='total_amount')
  then raise exception 'PRECHECK FAIL: ict_invoices.total_amount missing'; end if;
end $$;

select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create sequence if not exists public.ict_sales_order_no_seq start 1;
create or replace function public.ict_next_sales_order_no()
returns text language plpgsql security definer set search_path=public as $$
begin
  return 'SO-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.ict_sales_order_no_seq')::text,5,'0');
end $$;

create table if not exists public.ict_sales_orders(
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique default public.ict_next_sales_order_no(),
  customer_id uuid not null references public.ict_customers(id) on delete restrict,
  project_id uuid references public.ict_projects(id) on delete set null,
  order_date date not null default current_date,
  expected_start_date date,
  expected_end_date date,
  currency text not null default 'SAR',
  subtotal numeric(16,2) not null default 0,
  tax_rate numeric(8,4) not null default 15,
  tax_amount numeric(16,2) not null default 0,
  total_amount numeric(16,2) not null default 0,
  billed_amount numeric(16,2) not null default 0,
  collected_amount numeric(16,2) not null default 0,
  status text not null default 'draft'
    check(status in('draft','approved','in_progress','completed','cancelled')),
  payment_terms text,
  scope text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_sales_order_items(
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.ict_sales_orders(id) on delete cascade,
  line_no integer not null default 1,
  description text not null,
  quantity numeric(16,3) not null default 1 check(quantity>0),
  unit text,
  unit_price numeric(16,2) not null default 0 check(unit_price>=0),
  line_total numeric(16,2) generated always as (round(quantity*unit_price,2)) stored,
  created_at timestamptz not null default now(),
  unique(sales_order_id,line_no)
);

create table if not exists public.ict_billing_milestones(
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.ict_sales_orders(id) on delete cascade,
  milestone_name text not null,
  milestone_percent numeric(8,4) not null default 0 check(milestone_percent>=0 and milestone_percent<=100),
  milestone_amount numeric(16,2) not null default 0 check(milestone_amount>=0),
  due_date date,
  status text not null default 'planned'
    check(status in('planned','ready','invoiced','collected','cancelled')),
  invoice_id uuid references public.ict_invoices(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_collection_actions(
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.ict_invoices(id) on delete cascade,
  action_date date not null default current_date,
  action_type text not null
    check(action_type in('call','email','meeting','promise_to_pay','escalation','other')),
  promised_payment_date date,
  promised_amount numeric(16,2),
  notes text,
  status text not null default 'open' check(status in('open','done','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ict_sales_orders_customer_idx on public.ict_sales_orders(customer_id,status);
create index if not exists ict_sales_orders_project_idx on public.ict_sales_orders(project_id);
create index if not exists ict_billing_milestones_order_idx on public.ict_billing_milestones(sales_order_id,status);
create index if not exists ict_collection_actions_invoice_idx on public.ict_collection_actions(invoice_id,action_date desc);

create or replace function public.ict_recalculate_sales_order(p_sales_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_sub numeric:=0; v_tax_rate numeric:=0; v_tax numeric:=0; v_total numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  select tax_rate into v_tax_rate from public.ict_sales_orders where id=p_sales_order_id;
  if not found then raise exception 'أمر البيع غير موجود.'; end if;

  select coalesce(sum(line_total),0) into v_sub
  from public.ict_sales_order_items where sales_order_id=p_sales_order_id;

  v_tax:=round(v_sub*v_tax_rate/100.0,2);
  v_total:=v_sub+v_tax;

  update public.ict_sales_orders
  set subtotal=v_sub,tax_amount=v_tax,total_amount=v_total,updated_at=now()
  where id=p_sales_order_id;

  return jsonb_build_object('subtotal',v_sub,'tax_amount',v_tax,'total_amount',v_total);
end $$;

create or replace function public.ict_approve_sales_order(p_sales_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_total numeric;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  perform public.ict_recalculate_sales_order(p_sales_order_id);
  select total_amount into v_total from public.ict_sales_orders where id=p_sales_order_id for update;

  if v_total is null then raise exception 'أمر البيع غير موجود.'; end if;
  if v_total<=0 then raise exception 'لا يمكن اعتماد أمر بيع بدون قيمة.'; end if;

  update public.ict_sales_orders
  set status='approved',approved_by=auth.uid(),approved_at=now(),updated_at=now()
  where id=p_sales_order_id and status='draft';

  return jsonb_build_object('success',true,'total_amount',v_total);
end $$;

create or replace function public.ict_order_to_cash_snapshot()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_orders numeric:=0; v_billed numeric:=0; v_collected numeric:=0; v_ar numeric:=0;
  v_overdue numeric:=0; v_due30 numeric:=0; v_pipeline numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  select coalesce(sum(total_amount),0) into v_orders
  from public.ict_sales_orders where status in('approved','in_progress','completed');

  select coalesce(sum(total_amount),0) into v_billed
  from public.ict_invoices where status not in('draft','cancelled');

  select coalesce(sum(amount),0) into v_collected
  from public.ict_payments where status not in('reversed','cancelled');

  select
    coalesce(sum(balance_due),0),
    coalesce(sum(balance_due) filter(where due_date is not null and due_date<current_date),0),
    coalesce(sum(balance_due) filter(where due_date between current_date and current_date+30),0)
  into v_ar,v_overdue,v_due30
  from public.ict_invoices
  where balance_due>0 and status not in('draft','cancelled');

  select coalesce(sum(total_amount-billed_amount),0) into v_pipeline
  from public.ict_sales_orders
  where status in('approved','in_progress') and total_amount>billed_amount;

  return jsonb_build_object(
    'sales_orders_value',v_orders,
    'billed_value',v_billed,
    'collected_value',v_collected,
    'accounts_receivable',v_ar,
    'overdue_receivables',v_overdue,
    'due_next_30_days',v_due30,
    'unbilled_order_value',v_pipeline,
    'collection_rate',case when v_billed>0 then round(v_collected/v_billed*100,2) else 0 end
  );
end $$;

create or replace function public.ict_sales_order_sync_billing(p_sales_order_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_billed numeric:=0; v_collected numeric:=0;
begin
  if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

  select coalesce(sum(i.total_amount),0),
         coalesce(sum(i.amount_paid),0)
  into v_billed,v_collected
  from public.ict_billing_milestones m
  join public.ict_invoices i on i.id=m.invoice_id
  where m.sales_order_id=p_sales_order_id
    and i.status not in('draft','cancelled');

  update public.ict_sales_orders
  set billed_amount=v_billed,collected_amount=v_collected,updated_at=now()
  where id=p_sales_order_id;

  return jsonb_build_object('billed_amount',v_billed,'collected_amount',v_collected);
end $$;

grant execute on function public.ict_recalculate_sales_order(uuid) to authenticated;
grant execute on function public.ict_approve_sales_order(uuid) to authenticated;
grant execute on function public.ict_order_to_cash_snapshot() to authenticated;
grant execute on function public.ict_sales_order_sync_billing(uuid) to authenticated;

alter table public.ict_sales_orders enable row level security;
alter table public.ict_sales_order_items enable row level security;
alter table public.ict_billing_milestones enable row level security;
alter table public.ict_collection_actions enable row level security;

drop policy if exists "ERP admins sales orders" on public.ict_sales_orders;
create policy "ERP admins sales orders" on public.ict_sales_orders for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins sales order items" on public.ict_sales_order_items;
create policy "ERP admins sales order items" on public.ict_sales_order_items for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins billing milestones" on public.ict_billing_milestones;
create policy "ERP admins billing milestones" on public.ict_billing_milestones for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "ERP admins collection actions" on public.ict_collection_actions;
create policy "ERP admins collection actions" on public.ict_collection_actions for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

grant select,insert,update,delete on public.ict_sales_orders to authenticated;
grant select,insert,update,delete on public.ict_sales_order_items to authenticated;
grant select,insert,update,delete on public.ict_billing_milestones to authenticated;
grant select,insert,update,delete on public.ict_collection_actions to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'order_to_cash',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','sales','finance') and permission_key='order_to_cash';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
 select 'Sales orders' n,to_regclass('public.ict_sales_orders') is not null ok
 union all select 'Sales order items',to_regclass('public.ict_sales_order_items') is not null
 union all select 'Billing milestones',to_regclass('public.ict_billing_milestones') is not null
 union all select 'Collection actions',to_regclass('public.ict_collection_actions') is not null
 union all select 'Order snapshot RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_order_to_cash_snapshot')
 union all select 'Order approval RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_approve_sales_order')
 union all select 'Admin permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='order_to_cash' and is_allowed=true)
 union all select 'Sales permission',exists(select 1 from public.ict_admin_role_permissions where role='sales' and permission_key='order_to_cash' and is_allowed=true)
 union all select 'Finance permission',exists(select 1 from public.ict_admin_role_permissions where role='finance' and permission_key='order_to_cash' and is_allowed=true)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- No auth-protected RPC is executed here.
with safe_checks as(
 select 'Invoice AR columns' n,
   exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_invoices' and column_name='balance_due') ok
 union all select 'Payment amount column',
   exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_payments' and column_name='amount')
 union all select 'Sales order FK customer',
   exists(select 1 from information_schema.table_constraints where table_schema='public' and table_name='ict_sales_orders' and constraint_type='FOREIGN KEY')
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from safe_checks;

-- 05 FINAL RESULT
select 'SPRINT 29 ALL-IN-ONE' check_name,
case when
 to_regclass('public.ict_sales_orders') is not null
 and to_regclass('public.ict_billing_milestones') is not null
 and exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_order_to_cash_snapshot')
 and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='order_to_cash' and is_allowed=true)
then 'PASS ✅' else 'FAIL ❌' end result;
