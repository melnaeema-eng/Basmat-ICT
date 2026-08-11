-- =========================================================
-- BASMAT ICT - SPRINT 14
-- Admin Roles & Permissions
-- =========================================================

create table if not exists public.ict_admin_role_permissions (
  role text not null,
  permission_key text not null,
  is_allowed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role, permission_key),
  constraint ict_admin_role_permissions_role_check
    check (role in ('admin','manager','sales','engineer'))
);

alter table public.ict_admin_role_permissions enable row level security;

create or replace function public.is_ict_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ict_admin_users
    where user_id = auth.uid()
      and is_active = true
      and role = 'admin'
  );
$$;

revoke all on function public.is_ict_super_admin() from public;
grant execute on function public.is_ict_super_admin() to authenticated;

drop policy if exists "ICT admins read role permissions" on public.ict_admin_role_permissions;
create policy "ICT admins read role permissions"
on public.ict_admin_role_permissions
for select to authenticated
using (public.is_ict_admin());

drop policy if exists "Super admin manages role permissions" on public.ict_admin_role_permissions;
create policy "Super admin manages role permissions"
on public.ict_admin_role_permissions
for all to authenticated
using (public.is_ict_super_admin())
with check (public.is_ict_super_admin());

-- Admin can see all admin profiles for access management.
drop policy if exists "Super admin reads admin profiles" on public.ict_admin_users;
create policy "Super admin reads admin profiles"
on public.ict_admin_users
for select to authenticated
using (user_id = auth.uid() or public.is_ict_super_admin());

-- Only super admin may change roles / activation.
drop policy if exists "Super admin updates admin profiles" on public.ict_admin_users;
create policy "Super admin updates admin profiles"
on public.ict_admin_users
for update to authenticated
using (public.is_ict_super_admin())
with check (public.is_ict_super_admin());

insert into public.ict_admin_role_permissions (role, permission_key, is_allowed)
values
  ('admin','dashboard',true),('admin','requests',true),('admin','crm',true),('admin','quotations',true),
  ('admin','operations',true),('admin','documents',true),('admin','support',true),('admin','reports',true),
  ('admin','content',true),('admin','access_control',true),

  ('manager','dashboard',true),('manager','requests',true),('manager','crm',true),('manager','quotations',true),
  ('manager','operations',true),('manager','documents',true),('manager','support',true),('manager','reports',true),
  ('manager','content',false),('manager','access_control',false),

  ('sales','dashboard',true),('sales','requests',true),('sales','crm',true),('sales','quotations',true),
  ('sales','operations',false),('sales','documents',false),('sales','support',true),('sales','reports',true),
  ('sales','content',false),('sales','access_control',false),

  ('engineer','dashboard',true),('engineer','requests',true),('engineer','crm',false),('engineer','quotations',false),
  ('engineer','operations',true),('engineer','documents',true),('engineer','support',true),('engineer','reports',true),
  ('engineer','content',false),('engineer','access_control',false)
on conflict (role, permission_key)
do nothing;
