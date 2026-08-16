-- =========================================================
-- BASMAT ICT — SPRINT 18A HR
-- Employee master records
-- =========================================================

create table if not exists public.ict_hr_employees (
  id uuid primary key default gen_random_uuid(),
  employee_code text unique,
  auth_user_id uuid,
  team_member_id uuid,
  full_name text not null,
  email text,
  phone text,
  department text,
  job_title text,
  employment_type text not null default 'full_time'
    check (employment_type in ('full_time','part_time','contract','intern')),
  hire_date date,
  status text not null default 'active'
    check (status in ('active','inactive','archived')),
  archived_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ict_hr_employees_status_idx
  on public.ict_hr_employees(status);

create index if not exists ict_hr_employees_department_idx
  on public.ict_hr_employees(department);

alter table public.ict_hr_employees enable row level security;

drop policy if exists "ict_hr_employees_admin_select" on public.ict_hr_employees;
create policy "ict_hr_employees_admin_select"
on public.ict_hr_employees
for select
to authenticated
using (public.is_ict_admin());

drop policy if exists "ict_hr_employees_admin_insert" on public.ict_hr_employees;
create policy "ict_hr_employees_admin_insert"
on public.ict_hr_employees
for insert
to authenticated
with check (public.is_ict_admin());

drop policy if exists "ict_hr_employees_admin_update" on public.ict_hr_employees;
create policy "ict_hr_employees_admin_update"
on public.ict_hr_employees
for update
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

grant select, insert, update on public.ict_hr_employees to authenticated;
