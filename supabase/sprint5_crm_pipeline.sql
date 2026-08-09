-- =========================================================
-- BASMAT ICT — SPRINT 5
-- CRM + Sales Pipeline + Follow-ups
-- Run AFTER Sprint 4
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) CUSTOMERS
-- ---------------------------------------------------------

create table if not exists public.ict_customers (
  id uuid primary key default gen_random_uuid(),
  customer_type text not null default 'company'
    check (customer_type in ('individual', 'company')),
  name text not null,
  company_name text,
  email text,
  phone text,
  city text,
  source text,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'lead')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ict_customers_name
on public.ict_customers(name);

create index if not exists idx_ict_customers_email
on public.ict_customers(email);

alter table public.ict_customers enable row level security;

drop policy if exists "ICT admins manage customers"
on public.ict_customers;

create policy "ICT admins manage customers"
on public.ict_customers
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- ---------------------------------------------------------
-- 2) SALES OPPORTUNITIES
-- ---------------------------------------------------------

create table if not exists public.ict_sales_opportunities (
  id uuid primary key default gen_random_uuid(),
  opportunity_no text not null unique,
  customer_id uuid references public.ict_customers(id) on delete set null,
  rfq_id uuid references public.ict_rfq_requests(id) on delete set null,
  title text not null,
  description text,
  stage text not null default 'new'
    check (
      stage in (
        'new',
        'qualified',
        'proposal',
        'negotiation',
        'won',
        'lost'
      )
    ),
  probability integer not null default 10
    check (probability >= 0 and probability <= 100),
  estimated_value numeric(14,2) not null default 0,
  expected_close_date date,
  assigned_to uuid references public.ict_team_members(id) on delete set null,
  lost_reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ict_sales_opportunities_stage
on public.ict_sales_opportunities(stage);

create index if not exists idx_ict_sales_opportunities_customer
on public.ict_sales_opportunities(customer_id);

alter table public.ict_sales_opportunities enable row level security;

drop policy if exists "ICT admins manage sales opportunities"
on public.ict_sales_opportunities;

create policy "ICT admins manage sales opportunities"
on public.ict_sales_opportunities
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- ---------------------------------------------------------
-- 3) FOLLOW UPS
-- ---------------------------------------------------------

create table if not exists public.ict_sales_followups (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.ict_customers(id) on delete cascade,
  opportunity_id uuid references public.ict_sales_opportunities(id) on delete cascade,
  assigned_to uuid references public.ict_team_members(id) on delete set null,
  followup_type text not null default 'call'
    check (followup_type in ('call', 'email', 'meeting', 'visit', 'task')),
  subject text not null,
  notes text,
  due_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ict_sales_followups_due
on public.ict_sales_followups(due_at);

alter table public.ict_sales_followups enable row level security;

drop policy if exists "ICT admins manage sales followups"
on public.ict_sales_followups;

create policy "ICT admins manage sales followups"
on public.ict_sales_followups
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- ---------------------------------------------------------
-- 4) CRM ACTIVITY LOG
-- ---------------------------------------------------------

create table if not exists public.ict_crm_activities (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.ict_customers(id) on delete cascade,
  opportunity_id uuid references public.ict_sales_opportunities(id) on delete cascade,
  activity_type text not null,
  title text not null,
  details text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ict_crm_activities enable row level security;

drop policy if exists "ICT admins manage CRM activities"
on public.ict_crm_activities;

create policy "ICT admins manage CRM activities"
on public.ict_crm_activities
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- ---------------------------------------------------------
-- 5) OPTIONAL FUNCTION: Create customer from RFQ
-- ---------------------------------------------------------

create or replace function public.crm_create_customer_from_rfq(p_rfq_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rfq public.ict_rfq_requests%rowtype;
  v_customer_id uuid;
begin
  if not public.is_ict_admin() then
    raise exception 'Unauthorized';
  end if;

  select * into v_rfq
  from public.ict_rfq_requests
  where id = p_rfq_id;

  if not found then
    raise exception 'RFQ not found';
  end if;

  select id into v_customer_id
  from public.ict_customers
  where
    (
      v_rfq.email is not null
      and lower(email) = lower(v_rfq.email)
    )
    or
    (
      v_rfq.phone is not null
      and phone = v_rfq.phone
    )
  limit 1;

  if v_customer_id is null then
    insert into public.ict_customers (
      customer_type,
      name,
      company_name,
      email,
      phone,
      city,
      source,
      status,
      created_by
    )
    values (
      coalesce(v_rfq.customer_type, 'company'),
      coalesce(v_rfq.full_name, 'عميل'),
      v_rfq.company,
      v_rfq.email,
      v_rfq.phone,
      v_rfq.city,
      'RFQ',
      'lead',
      auth.uid()
    )
    returning id into v_customer_id;
  end if;

  return v_customer_id;
end;
$$;

revoke all on function public.crm_create_customer_from_rfq(uuid) from public;
grant execute on function public.crm_create_customer_from_rfq(uuid) to authenticated;
