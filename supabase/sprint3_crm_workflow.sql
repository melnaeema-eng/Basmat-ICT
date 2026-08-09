-- =========================================================
-- BASMAT ICT — SPRINT 3
-- CRM + Workflow for RFQ & Consultation
-- Run AFTER Sprint 2.
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Team members used for assignment.
create table if not exists public.ict_team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text,
  email text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.ict_team_members enable row level security;

drop policy if exists "ICT admins manage team members"
on public.ict_team_members;

create policy "ICT admins manage team members"
on public.ict_team_members
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- 2) Workflow columns on existing request tables.
alter table public.ict_rfq_requests
  add column if not exists assigned_to uuid
    references public.ict_team_members(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists internal_notes text,
  add column if not exists workflow_updated_at timestamptz not null default now();

alter table public.ict_consultation_requests
  add column if not exists assigned_to uuid
    references public.ict_team_members(id) on delete set null,
  add column if not exists priority text not null default 'normal',
  add column if not exists internal_notes text,
  add column if not exists workflow_updated_at timestamptz not null default now();

-- Existing status columns are reused. No customer data is deleted.

-- 3) Activity log.
create table if not exists public.ict_request_activities (
  id uuid primary key default gen_random_uuid(),
  request_type text not null
    check (request_type in ('rfq', 'consultation')),
  request_id uuid not null,
  action_type text not null,
  note text,
  old_value text,
  new_value text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists
  idx_ict_request_activities_request
on public.ict_request_activities(request_type, request_id, created_at desc);

alter table public.ict_request_activities enable row level security;

drop policy if exists "ICT admins manage request activities"
on public.ict_request_activities;

create policy "ICT admins manage request activities"
on public.ict_request_activities
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- Optional starter team member:
-- insert into public.ict_team_members
-- (full_name, job_title, email, department)
-- values
-- ('اسم الموظف', 'Sales Engineer', 'user@example.com', 'Sales');
