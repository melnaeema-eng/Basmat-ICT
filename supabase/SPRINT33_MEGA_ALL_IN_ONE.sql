-- ============================================================
-- BASMAT ERP — SPRINT 33 MEGA
-- OPERATIONS & RESOURCES ERP
-- INVENTORY + WAREHOUSES + ASSETS + CUSTODY + HR + ATTENDANCE
-- + LEAVE + PAYROLL + PROJECT/FINANCE INTEGRATION
-- ONE FILE: PRECHECK -> MIGRATION -> HEALTH -> SAFE VALIDATION
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regclass('public.ict_hr_employees') is null then raise exception 'PRECHECK FAIL: ict_hr_employees missing'; end if;
  if to_regclass('public.ict_delivery_projects') is null then raise exception 'PRECHECK FAIL: ict_delivery_projects missing'; end if;
  if to_regclass('public.ict_purchase_orders') is null then raise exception 'PRECHECK FAIL: ict_purchase_orders missing'; end if;
  if to_regclass('public.ict_goods_receipts') is null then raise exception 'PRECHECK FAIL: ict_goods_receipts missing. Sprint 31 required'; end if;
  if to_regclass('public.ict_admin_role_permissions') is null then raise exception 'PRECHECK FAIL: ict_admin_role_permissions missing'; end if;
  if to_regprocedure('public.is_ict_admin()') is null then raise exception 'PRECHECK FAIL: is_ict_admin() missing'; end if;
end $$;
select '01 PRECHECK' check_name,'PASS ✅' result;

-- 02 MIGRATION
begin;

create sequence if not exists public.ict_warehouse_no_seq start 1;
create sequence if not exists public.ict_item_no_seq start 1;
create sequence if not exists public.ict_asset_no_seq start 1;
create sequence if not exists public.ict_custody_no_seq start 1;
create sequence if not exists public.ict_payroll_run_no_seq start 1;

create table if not exists public.ict_warehouses(
 id uuid primary key default gen_random_uuid(),
 warehouse_no text not null unique default ('WH-'||lpad(nextval('public.ict_warehouse_no_seq')::text,4,'0')),
 name text not null,
 location text,
 manager_employee_id uuid references public.ict_hr_employees(id) on delete set null,
 status text not null default 'active' check(status in('active','inactive')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_inventory_items(
 id uuid primary key default gen_random_uuid(),
 item_no text not null unique default ('ITM-'||lpad(nextval('public.ict_item_no_seq')::text,6,'0')),
 sku text unique,
 name text not null,
 category text,
 unit text not null default 'pcs',
 item_type text not null default 'stock' check(item_type in('stock','consumable','asset','spare_part')),
 standard_cost numeric(16,2) not null default 0 check(standard_cost>=0),
 reorder_level numeric(16,3) not null default 0 check(reorder_level>=0),
 serial_tracking boolean not null default false,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_inventory_balances(
 id uuid primary key default gen_random_uuid(),
 warehouse_id uuid not null references public.ict_warehouses(id) on delete cascade,
 item_id uuid not null references public.ict_inventory_items(id) on delete cascade,
 quantity_on_hand numeric(16,3) not null default 0,
 quantity_reserved numeric(16,3) not null default 0,
 updated_at timestamptz not null default now(),
 unique(warehouse_id,item_id)
);

create table if not exists public.ict_inventory_transactions(
 id uuid primary key default gen_random_uuid(),
 warehouse_id uuid not null references public.ict_warehouses(id) on delete restrict,
 item_id uuid not null references public.ict_inventory_items(id) on delete restrict,
 transaction_type text not null check(transaction_type in('receipt','issue','transfer_in','transfer_out','adjustment_in','adjustment_out','return')),
 quantity numeric(16,3) not null check(quantity>0),
 unit_cost numeric(16,2) not null default 0,
 project_id uuid references public.ict_delivery_projects(id) on delete set null,
 goods_receipt_id uuid references public.ict_goods_receipts(id) on delete set null,
 reference_no text,
 notes text,
 transacted_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.ict_inventory_serials(
 id uuid primary key default gen_random_uuid(),
 item_id uuid not null references public.ict_inventory_items(id) on delete cascade,
 warehouse_id uuid references public.ict_warehouses(id) on delete set null,
 serial_no text not null unique,
 status text not null default 'in_stock' check(status in('in_stock','issued','assigned','repair','retired')),
 project_id uuid references public.ict_delivery_projects(id) on delete set null,
 employee_id uuid references public.ict_hr_employees(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_assets(
 id uuid primary key default gen_random_uuid(),
 asset_no text not null unique default ('AST-'||lpad(nextval('public.ict_asset_no_seq')::text,6,'0')),
 item_id uuid references public.ict_inventory_items(id) on delete set null,
 serial_no text,
 asset_name text not null,
 category text,
 purchase_date date,
 purchase_cost numeric(16,2) not null default 0,
 useful_life_months integer,
 residual_value numeric(16,2) not null default 0,
 current_employee_id uuid references public.ict_hr_employees(id) on delete set null,
 project_id uuid references public.ict_delivery_projects(id) on delete set null,
 location text,
 status text not null default 'available' check(status in('available','assigned','maintenance','retired','disposed')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_asset_custodies(
 id uuid primary key default gen_random_uuid(),
 custody_no text not null unique default ('CUS-'||lpad(nextval('public.ict_custody_no_seq')::text,6,'0')),
 asset_id uuid not null references public.ict_assets(id) on delete restrict,
 employee_id uuid not null references public.ict_hr_employees(id) on delete restrict,
 issued_at timestamptz not null default now(),
 returned_at timestamptz,
 condition_on_issue text,
 condition_on_return text,
 status text not null default 'issued' check(status in('issued','returned','lost','damaged')),
 notes text,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.ict_hr_attendance(
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.ict_hr_employees(id) on delete cascade,
 attendance_date date not null,
 check_in timestamptz,
 check_out timestamptz,
 status text not null default 'present' check(status in('present','absent','late','remote','leave','holiday')),
 overtime_hours numeric(8,2) not null default 0,
 notes text,
 created_at timestamptz not null default now(),
 unique(employee_id,attendance_date)
);

create table if not exists public.ict_hr_leave_requests(
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null references public.ict_hr_employees(id) on delete cascade,
 leave_type text not null check(leave_type in('annual','sick','emergency','unpaid','other')),
 start_date date not null,
 end_date date not null,
 days numeric(8,2) not null check(days>0),
 reason text,
 status text not null default 'pending' check(status in('pending','approved','rejected','cancelled')),
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check(end_date>=start_date)
);

create table if not exists public.ict_hr_compensation(
 id uuid primary key default gen_random_uuid(),
 employee_id uuid not null unique references public.ict_hr_employees(id) on delete cascade,
 basic_salary numeric(16,2) not null default 0,
 housing_allowance numeric(16,2) not null default 0,
 transport_allowance numeric(16,2) not null default 0,
 other_allowances numeric(16,2) not null default 0,
 social_insurance_employee numeric(16,2) not null default 0,
 other_deductions numeric(16,2) not null default 0,
 effective_from date not null default current_date,
 updated_at timestamptz not null default now()
);

create table if not exists public.ict_payroll_runs(
 id uuid primary key default gen_random_uuid(),
 run_no text not null unique default ('PAY-'||to_char(current_date,'YYYYMM')||'-'||lpad(nextval('public.ict_payroll_run_no_seq')::text,4,'0')),
 period_start date not null,
 period_end date not null,
 status text not null default 'draft' check(status in('draft','calculated','approved','posted','cancelled')),
 gross_total numeric(16,2) not null default 0,
 deductions_total numeric(16,2) not null default 0,
 net_total numeric(16,2) not null default 0,
 created_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 check(period_end>=period_start)
);

create table if not exists public.ict_payroll_lines(
 id uuid primary key default gen_random_uuid(),
 payroll_run_id uuid not null references public.ict_payroll_runs(id) on delete cascade,
 employee_id uuid not null references public.ict_hr_employees(id) on delete restrict,
 basic_salary numeric(16,2) not null default 0,
 allowances numeric(16,2) not null default 0,
 overtime_amount numeric(16,2) not null default 0,
 deductions numeric(16,2) not null default 0,
 gross_amount numeric(16,2) not null default 0,
 net_amount numeric(16,2) not null default 0,
 created_at timestamptz not null default now(),
 unique(payroll_run_id,employee_id)
);

create or replace function public.ict_post_inventory_transaction(
 p_warehouse_id uuid,p_item_id uuid,p_type text,p_quantity numeric,p_unit_cost numeric default 0,
 p_project_id uuid default null,p_goods_receipt_id uuid default null,p_reference_no text default null,p_notes text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_delta numeric; v_user uuid:=auth.uid();
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 if p_quantity<=0 then raise exception 'الكمية يجب أن تكون أكبر من صفر.'; end if;
 if p_type in('receipt','transfer_in','adjustment_in','return') then v_delta:=p_quantity;
 elsif p_type in('issue','transfer_out','adjustment_out') then v_delta:=-p_quantity;
 else raise exception 'نوع حركة غير صالح.'; end if;

 insert into public.ict_inventory_balances(warehouse_id,item_id,quantity_on_hand)
 values(p_warehouse_id,p_item_id,v_delta)
 on conflict(warehouse_id,item_id) do update
 set quantity_on_hand=public.ict_inventory_balances.quantity_on_hand+excluded.quantity_on_hand,updated_at=now();

 if exists(select 1 from public.ict_inventory_balances where warehouse_id=p_warehouse_id and item_id=p_item_id and quantity_on_hand<0) then
   raise exception 'الرصيد غير كاف.';
 end if;

 insert into public.ict_inventory_transactions(warehouse_id,item_id,transaction_type,quantity,unit_cost,project_id,goods_receipt_id,reference_no,notes,transacted_by)
 values(p_warehouse_id,p_item_id,p_type,p_quantity,coalesce(p_unit_cost,0),p_project_id,p_goods_receipt_id,p_reference_no,p_notes,v_user);

 return jsonb_build_object('success',true);
end $$;

create or replace function public.ict_calculate_payroll(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r record; v_gross numeric; v_ded numeric; v_net numeric; v_count integer:=0;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 delete from public.ict_payroll_lines where payroll_run_id=p_run_id;

 for r in
   select e.id employee_id,c.*,
     coalesce((select sum(a.overtime_hours) from public.ict_hr_attendance a join public.ict_payroll_runs pr on pr.id=p_run_id
       where a.employee_id=e.id and a.attendance_date between pr.period_start and pr.period_end),0) overtime_hours
   from public.ict_hr_employees e
   join public.ict_hr_compensation c on c.employee_id=e.id
   where e.status='active'
 loop
   v_gross:=coalesce(r.basic_salary,0)+coalesce(r.housing_allowance,0)+coalesce(r.transport_allowance,0)+coalesce(r.other_allowances,0);
   v_ded:=coalesce(r.social_insurance_employee,0)+coalesce(r.other_deductions,0);
   v_net:=v_gross-v_ded;
   insert into public.ict_payroll_lines(payroll_run_id,employee_id,basic_salary,allowances,overtime_amount,deductions,gross_amount,net_amount)
   values(p_run_id,r.employee_id,r.basic_salary,coalesce(r.housing_allowance,0)+coalesce(r.transport_allowance,0)+coalesce(r.other_allowances,0),0,v_ded,v_gross,v_net);
   v_count:=v_count+1;
 end loop;

 update public.ict_payroll_runs pr set
 gross_total=(select coalesce(sum(gross_amount),0) from public.ict_payroll_lines where payroll_run_id=p_run_id),
 deductions_total=(select coalesce(sum(deductions),0) from public.ict_payroll_lines where payroll_run_id=p_run_id),
 net_total=(select coalesce(sum(net_amount),0) from public.ict_payroll_lines where payroll_run_id=p_run_id),
 status='calculated'
 where pr.id=p_run_id;

 return jsonb_build_object('success',true,'employees',v_count);
end $$;

create or replace function public.ict_operations_resources_snapshot()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_wh int;v_items int;v_stock numeric;v_low int;v_assets int;v_assigned int;v_employees int;v_present int;v_leave int;v_payroll numeric;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 select count(*) into v_wh from public.ict_warehouses where status='active';
 select count(*) into v_items from public.ict_inventory_items where active;
 select coalesce(sum(b.quantity_on_hand*i.standard_cost),0) into v_stock from public.ict_inventory_balances b join public.ict_inventory_items i on i.id=b.item_id;
 select count(*) into v_low from public.ict_inventory_balances b join public.ict_inventory_items i on i.id=b.item_id where b.quantity_on_hand<=i.reorder_level;
 select count(*),count(*) filter(where status='assigned') into v_assets,v_assigned from public.ict_assets where status<>'disposed';
 select count(*) into v_employees from public.ict_hr_employees where status='active';
 select count(*) into v_present from public.ict_hr_attendance where attendance_date=current_date and status in('present','late','remote');
 select count(*) into v_leave from public.ict_hr_leave_requests where status='approved' and current_date between start_date and end_date;
 select coalesce(sum(net_total),0) into v_payroll from public.ict_payroll_runs where status in('calculated','approved','posted');
 return jsonb_build_object('warehouses',v_wh,'inventory_items',v_items,'stock_value',v_stock,'low_stock_items',v_low,'assets',v_assets,'assigned_assets',v_assigned,'active_employees',v_employees,'present_today',v_present,'on_leave_today',v_leave,'payroll_value',v_payroll);
end $$;

grant execute on function public.ict_post_inventory_transaction(uuid,uuid,text,numeric,numeric,uuid,uuid,text,text) to authenticated;
grant execute on function public.ict_calculate_payroll(uuid) to authenticated;
grant execute on function public.ict_operations_resources_snapshot() to authenticated;

alter table public.ict_warehouses enable row level security;
alter table public.ict_inventory_items enable row level security;
alter table public.ict_inventory_balances enable row level security;
alter table public.ict_inventory_transactions enable row level security;
alter table public.ict_inventory_serials enable row level security;
alter table public.ict_assets enable row level security;
alter table public.ict_asset_custodies enable row level security;
alter table public.ict_hr_attendance enable row level security;
alter table public.ict_hr_leave_requests enable row level security;
alter table public.ict_hr_compensation enable row level security;
alter table public.ict_payroll_runs enable row level security;
alter table public.ict_payroll_lines enable row level security;

do $$
declare t text;
begin
 foreach t in array array['ict_warehouses','ict_inventory_items','ict_inventory_balances','ict_inventory_transactions','ict_inventory_serials','ict_assets','ict_asset_custodies','ict_hr_attendance','ict_hr_leave_requests','ict_hr_compensation','ict_payroll_runs','ict_payroll_lines']
 loop
   execute format('drop policy if exists "ERP admins %s" on public.%I',t,t);
   execute format('create policy "ERP admins %s" on public.%I for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin())',t,t);
   execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select role,'operations_resources',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) x(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions set is_allowed=true,updated_at=now()
where role in('admin','manager','engineer','hr','finance') and permission_key='operations_resources';

notify pgrst,'reload schema';
commit;

-- 03 HEALTH
with checks as(
 select 'Warehouses' n,to_regclass('public.ict_warehouses') is not null ok
 union all select 'Inventory Items',to_regclass('public.ict_inventory_items') is not null
 union all select 'Inventory Balances',to_regclass('public.ict_inventory_balances') is not null
 union all select 'Inventory Transactions',to_regclass('public.ict_inventory_transactions') is not null
 union all select 'Serial Tracking',to_regclass('public.ict_inventory_serials') is not null
 union all select 'Assets',to_regclass('public.ict_assets') is not null
 union all select 'Custodies',to_regclass('public.ict_asset_custodies') is not null
 union all select 'Attendance',to_regclass('public.ict_hr_attendance') is not null
 union all select 'Leave',to_regclass('public.ict_hr_leave_requests') is not null
 union all select 'Compensation',to_regclass('public.ict_hr_compensation') is not null
 union all select 'Payroll Runs',to_regclass('public.ict_payroll_runs') is not null
 union all select 'Payroll Lines',to_regclass('public.ict_payroll_lines') is not null
 union all select 'Inventory RPC',to_regprocedure('public.ict_post_inventory_transaction(uuid,uuid,text,numeric,numeric,uuid,uuid,text,text)') is not null
 union all select 'Payroll RPC',to_regprocedure('public.ict_calculate_payroll(uuid)') is not null
 union all select 'Snapshot RPC',to_regprocedure('public.ict_operations_resources_snapshot()') is not null
 union all select 'Admin Permission',exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='operations_resources' and is_allowed)
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks order by n;

-- 04 SAFE SQL EDITOR VALIDATION
-- Protected RPCs are NOT executed here.
with checks as(
 select 'S31 GRN preserved' n,to_regclass('public.ict_goods_receipts') is not null ok
 union all select 'HR employee master preserved',to_regclass('public.ict_hr_employees') is not null
 union all select 'Project integration',exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_inventory_transactions' and column_name='project_id')
 union all select 'GRN integration',exists(select 1 from information_schema.columns where table_schema='public' and table_name='ict_inventory_transactions' and column_name='goods_receipt_id')
)
select n check_name,case when ok then 'PASS ✅' else 'FAIL ❌' end result from checks;

-- 05 FINAL
select 'SPRINT 33 MEGA ALL-IN-ONE' check_name,
case when
 to_regclass('public.ict_warehouses') is not null
 and to_regclass('public.ict_assets') is not null
 and to_regclass('public.ict_payroll_runs') is not null
 and to_regprocedure('public.ict_operations_resources_snapshot()') is not null
 and exists(select 1 from public.ict_admin_role_permissions where role='admin' and permission_key='operations_resources' and is_allowed)
then 'PASS ✅' else 'FAIL ❌' end result;
