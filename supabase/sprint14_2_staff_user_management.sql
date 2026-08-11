-- =========================================================
-- BASMAT ICT - SPRINT 14.2
-- Staff User Management
-- Run after Sprint 14.1. Safe to re-run.
-- =========================================================

-- Keep staff roles aligned with Sprint 14.1.
alter table public.ict_admin_users
  drop constraint if exists ict_admin_users_role_check;

alter table public.ict_admin_users
  add constraint ict_admin_users_role_check
  check (role in ('admin','manager','sales','engineer','support'));

-- Store the staff email in the admin profile so Access Control can show it.
alter table public.ict_admin_users
  add column if not exists email text;

create unique index if not exists ux_ict_admin_users_email
  on public.ict_admin_users (lower(email))
  where email is not null;

-- Super admin can read all staff profiles; every staff member can read their own.
drop policy if exists "Super admin reads admin profiles" on public.ict_admin_users;
create policy "Super admin reads admin profiles"
on public.ict_admin_users
for select to authenticated
using (user_id = auth.uid() or public.is_ict_super_admin());

-- Only super admin can change role / activation / profile fields.
drop policy if exists "Super admin updates admin profiles" on public.ict_admin_users;
create policy "Super admin updates admin profiles"
on public.ict_admin_users
for update to authenticated
using (public.is_ict_super_admin())
with check (public.is_ict_super_admin());
