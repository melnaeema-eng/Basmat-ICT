-- BASMAT ICT — SPRINT 6
-- Projects + Contracts + Tasks + Purchase Orders + Invoices/Payments
-- Run AFTER Sprint 5.

create extension if not exists pgcrypto;

create table if not exists public.ict_projects (
  id uuid primary key default gen_random_uuid(),
  project_no text not null unique,
  customer_id uuid references public.ict_customers(id) on delete set null,
  opportunity_id uuid references public.ict_sales_opportunities(id) on delete set null,
  quotation_id uuid references public.ict_quotations(id) on delete set null,
  project_name text not null,
  project_manager_id uuid references public.ict_team_members(id) on delete set null,
  status text not null default 'planning'
    check (status in ('planning','active','on_hold','completed','cancelled')),
  progress integer not null default 0 check (progress between 0 and 100),
  contract_value numeric(14,2) not null default 0,
  start_date date,
  target_end_date date,
  actual_end_date date,
  scope text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_no text not null unique,
  project_id uuid references public.ict_projects(id) on delete cascade,
  customer_id uuid references public.ict_customers(id) on delete set null,
  title text not null,
  contract_value numeric(14,2) not null default 0,
  signed_date date,
  start_date date,
  end_date date,
  status text not null default 'draft'
    check (status in ('draft','active','expired','closed','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ict_projects(id) on delete cascade,
  title text not null,
  description text,
  assigned_to uuid references public.ict_team_members(id) on delete set null,
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  status text not null default 'todo'
    check (status in ('todo','in_progress','blocked','done')),
  due_date date,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_no text not null unique,
  project_id uuid references public.ict_projects(id) on delete cascade,
  vendor_name text not null,
  description text,
  amount numeric(14,2) not null default 0,
  po_date date not null default current_date,
  expected_delivery_date date,
  status text not null default 'draft'
    check (status in ('draft','issued','partially_received','received','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_project_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  project_id uuid references public.ict_projects(id) on delete cascade,
  customer_id uuid references public.ict_customers(id) on delete set null,
  amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft'
    check (status in ('draft','issued','partially_paid','paid','overdue','cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_project_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.ict_project_invoices(id) on delete cascade,
  project_id uuid references public.ict_projects(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text,
  reference_no text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_ict_projects_customer on public.ict_projects(customer_id);
create index if not exists idx_ict_projects_status on public.ict_projects(status);
create index if not exists idx_ict_project_tasks_project on public.ict_project_tasks(project_id);
create index if not exists idx_ict_project_invoices_project on public.ict_project_invoices(project_id);
create index if not exists idx_ict_project_payments_invoice on public.ict_project_payments(invoice_id);

alter table public.ict_projects enable row level security;
alter table public.ict_contracts enable row level security;
alter table public.ict_project_tasks enable row level security;
alter table public.ict_purchase_orders enable row level security;
alter table public.ict_project_invoices enable row level security;
alter table public.ict_project_payments enable row level security;

drop policy if exists "ICT admins manage projects" on public.ict_projects;
create policy "ICT admins manage projects" on public.ict_projects for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());

drop policy if exists "ICT admins manage contracts" on public.ict_contracts;
create policy "ICT admins manage contracts" on public.ict_contracts for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());

drop policy if exists "ICT admins manage project tasks" on public.ict_project_tasks;
create policy "ICT admins manage project tasks" on public.ict_project_tasks for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());

drop policy if exists "ICT admins manage purchase orders" on public.ict_purchase_orders;
create policy "ICT admins manage purchase orders" on public.ict_purchase_orders for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());

drop policy if exists "ICT admins manage project invoices" on public.ict_project_invoices;
create policy "ICT admins manage project invoices" on public.ict_project_invoices for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());

drop policy if exists "ICT admins manage project payments" on public.ict_project_payments;
create policy "ICT admins manage project payments" on public.ict_project_payments for all to authenticated
using (public.is_ict_admin()) with check (public.is_ict_admin());
