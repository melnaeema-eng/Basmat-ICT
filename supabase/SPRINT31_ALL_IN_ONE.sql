-- ============================================================
-- BASMAT ERP — SPRINT 31 BIG
-- PROCURE-TO-PAY + VENDOR PERFORMANCE + 3-WAY MATCH
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_suppliers') is null then
    raise exception 'PRECHECK FAIL: ict_suppliers missing';
  end if;

  if to_regclass('public.ict_purchase_orders') is null then
    raise exception 'PRECHECK FAIL: ict_purchase_orders missing';
  end if;

  if to_regclass('public.ict_supplier_bills') is null then
    raise exception 'PRECHECK FAIL: ict_supplier_bills missing. Sprint 27 is required.';
  end if;

  if to_regclass('public.ict_delivery_projects') is null then
    raise exception 'PRECHECK FAIL: ict_delivery_projects missing';
  end if;

  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_purchase_orders'
      and column_name='amount'
  ) then
    raise exception 'PRECHECK FAIL: ict_purchase_orders.amount missing';
  end if;

  if not exists(
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_supplier_bills'
      and column_name='purchase_order_id'
  ) then
    raise exception 'PRECHECK FAIL: ict_supplier_bills.purchase_order_id missing';
  end if;
end $$;

select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create sequence if not exists public.ict_grn_no_seq start 1;

create or replace function public.ict_next_grn_no()
returns text
language plpgsql
security definer
set search_path=public
as $$
begin
  return 'GRN-'||to_char(current_date,'YYYY')||'-'||
         lpad(nextval('public.ict_grn_no_seq')::text,6,'0');
end $$;

create table if not exists public.ict_goods_receipts(
  id uuid primary key default gen_random_uuid(),
  grn_no text not null unique default public.ict_next_grn_no(),
  purchase_order_id uuid not null references public.ict_purchase_orders(id) on delete restrict,
  supplier_id uuid references public.ict_suppliers(id) on delete set null,
  project_id uuid references public.ict_delivery_projects(id) on delete set null,
  receipt_date date not null default current_date,
  delivery_note_no text,
  received_value numeric(16,2) not null default 0 check(received_value>=0),
  status text not null default 'received'
    check(status in('draft','received','accepted','rejected','cancelled')),
  quality_status text not null default 'pending'
    check(quality_status in('pending','passed','failed','partial')),
  notes text,
  received_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_goods_receipt_items(
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references public.ict_goods_receipts(id) on delete cascade,
  line_no integer not null default 1,
  description text not null,
  ordered_qty numeric(16,3) not null default 0,
  received_qty numeric(16,3) not null default 0,
  accepted_qty numeric(16,3) not null default 0,
  rejected_qty numeric(16,3) not null default 0,
  unit text,
  unit_price numeric(16,2) not null default 0,
  line_value numeric(16,2) generated always as (round(accepted_qty*unit_price,2)) stored,
  created_at timestamptz not null default now(),
  unique(goods_receipt_id,line_no)
);

create table if not exists public.ict_supplier_performance_reviews(
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.ict_suppliers(id) on delete cascade,
  review_period_start date not null,
  review_period_end date not null,
  quality_score numeric(6,2),
  delivery_score numeric(6,2),
  commercial_score numeric(6,2),
  responsiveness_score numeric(6,2),
  overall_score numeric(6,2),
  issues text,
  improvement_actions text,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check(review_period_end>=review_period_start)
);

create index if not exists ict_goods_receipts_po_idx
  on public.ict_goods_receipts(purchase_order_id,receipt_date desc);

create index if not exists ict_supplier_reviews_supplier_idx
  on public.ict_supplier_performance_reviews(supplier_id,review_period_end desc);

create or replace function public.ict_three_way_match(
  p_purchase_order_id uuid,
  p_supplier_bill_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_po public.ict_purchase_orders%rowtype;
  v_bill public.ict_supplier_bills%rowtype;
  v_received numeric:=0;
  v_po_diff numeric:=0;
  v_grn_diff numeric:=0;
  v_match boolean:=false;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select * into v_po
  from public.ict_purchase_orders
  where id=p_purchase_order_id;

  if not found then
    raise exception 'أمر الشراء غير موجود.';
  end if;

  select * into v_bill
  from public.ict_supplier_bills
  where id=p_supplier_bill_id;

  if not found then
    raise exception 'فاتورة المورد غير موجودة.';
  end if;

  if v_bill.purchase_order_id is distinct from v_po.id then
    raise exception 'فاتورة المورد غير مرتبطة بأمر الشراء المحدد.';
  end if;

  select coalesce(sum(received_value),0)
  into v_received
  from public.ict_goods_receipts
  where purchase_order_id=v_po.id
    and status in('received','accepted')
    and quality_status in('passed','partial');

  v_po_diff:=abs(coalesce(v_po.amount,0)-coalesce(v_bill.total_amount,0));
  v_grn_diff:=abs(coalesce(v_received,0)-coalesce(v_bill.total_amount,0));

  v_match := (v_po_diff<=1 and v_grn_diff<=1);

  return jsonb_build_object(
    'purchase_order_amount',coalesce(v_po.amount,0),
    'received_value',v_received,
    'supplier_bill_amount',coalesce(v_bill.total_amount,0),
    'po_bill_difference',v_po_diff,
    'grn_bill_difference',v_grn_diff,
    'is_matched',v_match
  );
end $$;

create or replace function public.ict_procure_to_pay_snapshot()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_po numeric:=0;
  v_received numeric:=0;
  v_billed numeric:=0;
  v_paid numeric:=0;
  v_ap numeric:=0;
  v_overdue_ap numeric:=0;
  v_open_po integer:=0;
  v_failed_quality integer:=0;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select
    coalesce(sum(amount),0),
    count(*) filter(where status not in('cancelled','completed','closed'))
  into v_po,v_open_po
  from public.ict_purchase_orders;

  select coalesce(sum(received_value),0),
         count(*) filter(where quality_status='failed')
  into v_received,v_failed_quality
  from public.ict_goods_receipts
  where status not in('cancelled','rejected');

  select
    coalesce(sum(total_amount),0),
    coalesce(sum(amount_paid),0),
    coalesce(sum(balance_due),0),
    coalesce(sum(balance_due) filter(
      where due_date is not null and due_date<current_date
    ),0)
  into v_billed,v_paid,v_ap,v_overdue_ap
  from public.ict_supplier_bills
  where status not in('draft','cancelled');

  return jsonb_build_object(
    'purchase_order_value',v_po,
    'received_value',v_received,
    'supplier_billed_value',v_billed,
    'supplier_paid_value',v_paid,
    'accounts_payable',v_ap,
    'overdue_ap',v_overdue_ap,
    'open_purchase_orders',v_open_po,
    'failed_quality_receipts',v_failed_quality,
    'receipt_coverage',
      case when v_po>0 then round(v_received/v_po*100,2) else 0 end,
    'payment_coverage',
      case when v_billed>0 then round(v_paid/v_billed*100,2) else 0 end
  );
end $$;

create or replace function public.ict_supplier_performance_snapshot()
returns table(
  supplier_id uuid,
  supplier_name text,
  avg_quality numeric,
  avg_delivery numeric,
  avg_commercial numeric,
  avg_responsiveness numeric,
  avg_overall numeric,
  review_count bigint
)
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  return query
  select
    s.id,
    s.name,
    round(avg(r.quality_score),2),
    round(avg(r.delivery_score),2),
    round(avg(r.commercial_score),2),
    round(avg(r.responsiveness_score),2),
    round(avg(r.overall_score),2),
    count(r.id)
  from public.ict_suppliers s
  left join public.ict_supplier_performance_reviews r
    on r.supplier_id=s.id
  group by s.id,s.name
  order by avg(r.overall_score) desc nulls last,s.name;
end $$;

grant execute on function public.ict_three_way_match(uuid,uuid) to authenticated;
grant execute on function public.ict_procure_to_pay_snapshot() to authenticated;
grant execute on function public.ict_supplier_performance_snapshot() to authenticated;

alter table public.ict_goods_receipts enable row level security;
alter table public.ict_goods_receipt_items enable row level security;
alter table public.ict_supplier_performance_reviews enable row level security;

drop policy if exists "ERP admins goods receipts" on public.ict_goods_receipts;
create policy "ERP admins goods receipts"
on public.ict_goods_receipts
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

drop policy if exists "ERP admins goods receipt items" on public.ict_goods_receipt_items;
create policy "ERP admins goods receipt items"
on public.ict_goods_receipt_items
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

drop policy if exists "ERP admins supplier reviews" on public.ict_supplier_performance_reviews;
create policy "ERP admins supplier reviews"
on public.ict_supplier_performance_reviews
for all to authenticated
using(public.is_ict_admin())
with check(public.is_ict_admin());

grant select,insert,update,delete on public.ict_goods_receipts to authenticated;
grant select,insert,update,delete on public.ict_goods_receipt_items to authenticated;
grant select,insert,update,delete on public.ict_supplier_performance_reviews to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'procure_to_pay',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions
set is_allowed=true,updated_at=now()
where role in('admin','manager','finance')
  and permission_key='procure_to_pay';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH CHECK
with checks as(
  select 'Goods receipts' n,to_regclass('public.ict_goods_receipts') is not null ok
  union all select 'Goods receipt items',to_regclass('public.ict_goods_receipt_items') is not null
  union all select 'Supplier reviews',to_regclass('public.ict_supplier_performance_reviews') is not null
  union all select '3-way match RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_three_way_match')
  union all select 'P2P snapshot RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_procure_to_pay_snapshot')
  union all select 'Supplier performance RPC',exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_supplier_performance_snapshot')
  union all select 'Admin permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='procure_to_pay' and is_allowed=true)
  union all select 'Finance permission',exists(select 1 from public.ict_admin_role_permissions where role='finance' and permission_key='procure_to_pay' and is_allowed=true)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- No auth-protected RPC executed here.
with safe_checks as(
  select 'PO amount column' n,
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_purchase_orders' and column_name='amount') ok
  union all select 'Supplier bill PO link',
    exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_supplier_bills' and column_name='purchase_order_id')
  union all select 'GRN PO FK',
    exists(select 1 from information_schema.table_constraints where table_schema='public' and table_name='ict_goods_receipts' and constraint_type='FOREIGN KEY')
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from safe_checks;

-- 05 FINAL RESULT
select 'SPRINT 31 ALL-IN-ONE' check_name,
case when
  to_regclass('public.ict_goods_receipts') is not null
  and to_regclass('public.ict_supplier_performance_reviews') is not null
  and exists(select 1 from information_schema.routines where routine_schema='public' and routine_name='ict_three_way_match')
  and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='procure_to_pay' and is_allowed=true)
then 'PASS ✅' else 'FAIL ❌' end result;
