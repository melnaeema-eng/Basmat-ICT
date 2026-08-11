-- =========================================================
-- BASMAT ICT - SPRINT 14.1
-- Support Role + Fine-Grained Admin Route Permissions
-- Run after Sprint 14.
-- Safe to re-run.
-- =========================================================

-- 1) Allow SUPPORT in admin users.
alter table public.ict_admin_users
  drop constraint if exists ict_admin_users_role_check;

alter table public.ict_admin_users
  add constraint ict_admin_users_role_check
  check (role in ('admin','manager','sales','engineer','support'));

-- 2) Allow SUPPORT in permissions matrix.
alter table public.ict_admin_role_permissions
  drop constraint if exists ict_admin_role_permissions_role_check;

alter table public.ict_admin_role_permissions
  add constraint ict_admin_role_permissions_role_check
  check (role in ('admin','manager','sales','engineer','support'));

-- 3) Add/refine permission keys for notifications and team.
insert into public.ict_admin_role_permissions (role, permission_key, is_allowed)
values
  -- ADMIN: unrestricted in the app; rows kept for a complete matrix.
  ('admin','dashboard',true),
  ('admin','requests',true),
  ('admin','crm',true),
  ('admin','quotations',true),
  ('admin','operations',true),
  ('admin','documents',true),
  ('admin','support',true),
  ('admin','notifications',true),
  ('admin','reports',true),
  ('admin','team',true),
  ('admin','content',true),
  ('admin','access_control',true),

  -- MANAGER: all business/operational areas except super-admin access control.
  ('manager','dashboard',true),
  ('manager','requests',true),
  ('manager','crm',true),
  ('manager','quotations',true),
  ('manager','operations',true),
  ('manager','documents',true),
  ('manager','support',true),
  ('manager','notifications',true),
  ('manager','reports',true),
  ('manager','team',true),
  ('manager','content',true),
  ('manager','access_control',false),

  -- SALES: lead-to-quotation workflow + business reporting.
  ('sales','dashboard',true),
  ('sales','requests',true),
  ('sales','crm',true),
  ('sales','quotations',true),
  ('sales','operations',false),
  ('sales','documents',false),
  ('sales','support',false),
  ('sales','notifications',true),
  ('sales','reports',true),
  ('sales','team',false),
  ('sales','content',false),
  ('sales','access_control',false),

  -- ENGINEER: delivery, project documents, support collaboration.
  ('engineer','dashboard',true),
  ('engineer','requests',false),
  ('engineer','crm',false),
  ('engineer','quotations',false),
  ('engineer','operations',true),
  ('engineer','documents',true),
  ('engineer','support',true),
  ('engineer','notifications',true),
  ('engineer','reports',true),
  ('engineer','team',false),
  ('engineer','content',false),
  ('engineer','access_control',false),

  -- SUPPORT: support desk + its notifications only.
  ('support','dashboard',true),
  ('support','requests',false),
  ('support','crm',false),
  ('support','quotations',false),
  ('support','operations',false),
  ('support','documents',false),
  ('support','support',true),
  ('support','notifications',true),
  ('support','reports',false),
  ('support','team',false),
  ('support','content',false),
  ('support','access_control',false)
on conflict (role, permission_key)
do update set
  is_allowed = excluded.is_allowed,
  updated_at = now();
