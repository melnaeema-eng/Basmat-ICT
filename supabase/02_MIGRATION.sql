-- BASMAT ERP — SPRINT 24 BIG
-- 02 MIGRATION — Project Cost Control + Profitability
begin;

create table if not exists public.ict_project_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique,
  revenue_budget numeric(16,2) not null default 0 check (revenue_budget>=0),
  material_budget numeric(16,2) not null default 0 check (material_budget>=0),
  labor_budget numeric(16,2) not null default 0 check (labor_budget>=0),
  subcontractor_budget numeric(16,2) not null default 0 check (subcontractor_budget>=0),
  other_cost_budget numeric(16,2) not null default 0 check (other_cost_budget>=0),
  contingency_budget numeric(16,2) not null default 0 check (contingency_budget>=0),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.ict_timesheet_no_seq start 1;
create or replace function public.ict_next_timesheet_no()
returns text language plpgsql security definer set search_path=public as $$
begin
 return 'TS-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.ict_timesheet_no_seq')::text,6,'0');
end $$;

create table if not exists public.ict_project_timesheets (
  id uuid primary key default gen_random_uuid(),
  timesheet_no text not null unique default public.ict_next_timesheet_no(),
  project_id uuid not null,
  employee_id uuid not null references public.ict_hr_employees(id) on delete restrict,
  work_date date not null default current_date,
  hours numeric(8,2) not null check(hours>0 and hours<=24),
  hourly_cost numeric(14,2) not null default 0 check(hourly_cost>=0),
  description text,
  status text not null default 'approved' check(status in('draft','submitted','approved','rejected')),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.ict_change_order_no_seq start 1;
create or replace function public.ict_next_change_order_no()
returns text language plpgsql security definer set search_path=public as $$
begin
 return 'CO-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('public.ict_change_order_no_seq')::text,5,'0');
end $$;

create table if not exists public.ict_project_change_orders (
  id uuid primary key default gen_random_uuid(),
  change_order_no text not null unique default public.ict_next_change_order_no(),
  project_id uuid not null,
  title text not null,
  description text,
  revenue_impact numeric(16,2) not null default 0,
  cost_impact numeric(16,2) not null default 0,
  status text not null default 'pending' check(status in('draft','pending','approved','rejected','cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_project_timesheets_project_idx on public.ict_project_timesheets(project_id,work_date desc);
create index if not exists ict_change_orders_project_idx on public.ict_project_change_orders(project_id,created_at desc);

create or replace function public.ict_project_financial_snapshot(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 p record; b record;
 invoice_revenue numeric:=0; collections numeric:=0; expenses numeric:=0;
 po_value numeric:=0; stock_cost numeric:=0; labor_cost numeric:=0;
 co_rev numeric:=0; co_cost numeric:=0; total_cost numeric:=0;
 revenue numeric:=0; margin numeric:=0; margin_pct numeric:=0; budget_cost numeric:=0;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;

 select id,project_no,project_name,contract_value,progress,status into p
 from public.ict_delivery_projects where id=p_project_id;
 if p.id is null then raise exception 'المشروع غير موجود.'; end if;

 select * into b from public.ict_project_budgets where project_id=p_project_id;

 select coalesce(sum(total_amount),0) into invoice_revenue
 from public.ict_invoices where project_id=p_project_id and status not in('draft','cancelled');

 select coalesce(sum(amount),0) into collections
 from public.ict_payments where project_id=p_project_id and status not in('reversed','cancelled');

 select coalesce(sum(amount+tax_amount),0) into expenses
 from public.ict_expenses where project_id=p_project_id and status not in('cancelled','draft');

 select coalesce(sum(amount),0) into po_value
 from public.ict_purchase_orders where project_id=p_project_id and status not in('cancelled','rejected');

 select coalesce(sum(quantity*unit_cost),0) into stock_cost
 from public.ict_stock_transactions where project_id=p_project_id and transaction_type in('issue','adjustment_out','transfer_out');

 select coalesce(sum(hours*hourly_cost),0) into labor_cost
 from public.ict_project_timesheets where project_id=p_project_id and status='approved';

 select coalesce(sum(revenue_impact),0),coalesce(sum(cost_impact),0) into co_rev,co_cost
 from public.ict_project_change_orders where project_id=p_project_id and status='approved';

 revenue:=greatest(coalesce(invoice_revenue,0),coalesce(p.contract_value,0))+coalesce(co_rev,0);
 total_cost:=coalesce(expenses,0)+coalesce(stock_cost,0)+coalesce(labor_cost,0)+coalesce(co_cost,0);
 margin:=revenue-total_cost;
 if revenue>0 then margin_pct:=round((margin/revenue)*100,2); end if;

 budget_cost:=coalesce(b.material_budget,0)+coalesce(b.labor_budget,0)+coalesce(b.subcontractor_budget,0)+coalesce(b.other_cost_budget,0)+coalesce(b.contingency_budget,0);

 return jsonb_build_object(
  'project_id',p.id,'project_no',p.project_no,'project_name',p.project_name,'status',p.status,'progress',p.progress,
  'contract_value',coalesce(p.contract_value,0),'budget_revenue',coalesce(b.revenue_budget,0),'budget_cost',budget_cost,
  'invoice_revenue',invoice_revenue,'collections',collections,'expenses',expenses,'po_committed',po_value,
  'stock_cost',stock_cost,'labor_cost',labor_cost,'change_order_revenue',co_rev,'change_order_cost',co_cost,
  'total_actual_cost',total_cost,'recognized_revenue',revenue,'gross_margin',margin,'gross_margin_pct',margin_pct,
  'cost_variance',budget_cost-total_cost
 );
end $$;
grant execute on function public.ict_project_financial_snapshot(uuid) to authenticated;

create or replace function public.ict_project_profitability_portfolio()
returns table(project_id uuid,project_no text,project_name text,status text,progress integer,revenue numeric,actual_cost numeric,margin numeric,margin_pct numeric,collections numeric)
language plpgsql security definer set search_path=public as $$
declare r record; s jsonb;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح.'; end if;
 for r in select id from public.ict_delivery_projects order by created_at desc loop
   s:=public.ict_project_financial_snapshot(r.id);
   project_id:=(s->>'project_id')::uuid; project_no:=s->>'project_no'; project_name:=s->>'project_name';
   status:=s->>'status'; progress:=coalesce((s->>'progress')::integer,0);
   revenue:=coalesce((s->>'recognized_revenue')::numeric,0);
   actual_cost:=coalesce((s->>'total_actual_cost')::numeric,0);
   margin:=coalesce((s->>'gross_margin')::numeric,0);
   margin_pct:=coalesce((s->>'gross_margin_pct')::numeric,0);
   collections:=coalesce((s->>'collections')::numeric,0);
   return next;
 end loop;
end $$;
grant execute on function public.ict_project_profitability_portfolio() to authenticated;

alter table public.ict_project_budgets enable row level security;
alter table public.ict_project_timesheets enable row level security;
alter table public.ict_project_change_orders enable row level security;

drop policy if exists "ERP admins manage project budgets" on public.ict_project_budgets;
create policy "ERP admins manage project budgets" on public.ict_project_budgets for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());
drop policy if exists "ERP admins manage project timesheets" on public.ict_project_timesheets;
create policy "ERP admins manage project timesheets" on public.ict_project_timesheets for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());
drop policy if exists "ERP admins manage project change orders" on public.ict_project_change_orders;
create policy "ERP admins manage project change orders" on public.ict_project_change_orders for all to authenticated using(public.is_ict_admin()) with check(public.is_ict_admin());

grant select,insert,update on public.ict_project_budgets to authenticated;
grant select,insert,update on public.ict_project_timesheets to authenticated;
grant select,insert,update on public.ict_project_change_orders to authenticated;

insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select r.role,'project_cost_control',false,now()
from (values('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance')) r(role)
on conflict(role,permission_key) do nothing;

update public.ict_admin_role_permissions set is_allowed=true,updated_at=now()
where role in('admin','manager','engineer','finance') and permission_key='project_cost_control';

notify pgrst,'reload schema';
commit;
