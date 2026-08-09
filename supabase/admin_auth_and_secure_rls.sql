-- =========================================================
-- BASMAT ICT - SPRINT 2
-- Admin Authentication + Secure RLS
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. ADMIN USERS
-- ---------------------------------------------------------

create table if not exists public.ict_admin_users (
  user_id uuid primary key
    references auth.users(id)
    on delete cascade,

  full_name text,

  role text not null default 'admin'
    check (
      role in (
        'admin',
        'manager',
        'sales',
        'engineer'
      )
    ),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ict_admin_users
enable row level security;

drop policy if exists
  "Admin reads own profile"
on public.ict_admin_users;

create policy
  "Admin reads own profile"
on public.ict_admin_users
for select
to authenticated
using (
  user_id = auth.uid()
);

-- ---------------------------------------------------------
-- 2. ADMIN CHECK FUNCTION
-- ---------------------------------------------------------

create or replace function
public.is_ict_admin()
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
  );
$$;

revoke all
on function public.is_ict_admin()
from public;

grant execute
on function public.is_ict_admin()
to authenticated;

-- ---------------------------------------------------------
-- 3. REMOVE TEMPORARY DOCUMENT HOTFIX POLICIES
-- ---------------------------------------------------------

drop policy if exists
  "Temporary read RFQ documents"
on public.ict_rfq_requests;

drop policy if exists
  "Temporary read consultation documents"
on public.ict_consultation_requests;

drop policy if exists
  "Temporary read engineering documents"
on storage.objects;

-- ---------------------------------------------------------
-- 4. CONTACT MESSAGES
-- Do NOT remove existing public INSERT policy.
-- ---------------------------------------------------------

alter table public.ict_contact_messages
enable row level security;

drop policy if exists
  "ICT admins read contact messages"
on public.ict_contact_messages;

create policy
  "ICT admins read contact messages"
on public.ict_contact_messages
for select
to authenticated
using (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins update contact messages"
on public.ict_contact_messages;

create policy
  "ICT admins update contact messages"
on public.ict_contact_messages
for update
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins delete contact messages"
on public.ict_contact_messages;

create policy
  "ICT admins delete contact messages"
on public.ict_contact_messages
for delete
to authenticated
using (
  public.is_ict_admin()
);

-- ---------------------------------------------------------
-- 5. RFQ
-- Do NOT remove existing public INSERT policy.
-- ---------------------------------------------------------

alter table public.ict_rfq_requests
enable row level security;

drop policy if exists
  "ICT admins read RFQs"
on public.ict_rfq_requests;

create policy
  "ICT admins read RFQs"
on public.ict_rfq_requests
for select
to authenticated
using (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins update RFQs"
on public.ict_rfq_requests;

create policy
  "ICT admins update RFQs"
on public.ict_rfq_requests
for update
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins delete RFQs"
on public.ict_rfq_requests;

create policy
  "ICT admins delete RFQs"
on public.ict_rfq_requests
for delete
to authenticated
using (
  public.is_ict_admin()
);

-- ---------------------------------------------------------
-- 6. CONSULTATIONS
-- Do NOT remove existing public INSERT policy.
-- ---------------------------------------------------------

alter table public.ict_consultation_requests
enable row level security;

drop policy if exists
  "ICT admins read consultations"
on public.ict_consultation_requests;

create policy
  "ICT admins read consultations"
on public.ict_consultation_requests
for select
to authenticated
using (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins update consultations"
on public.ict_consultation_requests;

create policy
  "ICT admins update consultations"
on public.ict_consultation_requests
for update
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "ICT admins delete consultations"
on public.ict_consultation_requests;

create policy
  "ICT admins delete consultations"
on public.ict_consultation_requests
for delete
to authenticated
using (
  public.is_ict_admin()
);

-- ---------------------------------------------------------
-- 7. ENGINEERING DOCUMENTS STORAGE
-- ---------------------------------------------------------

drop policy if exists
  "ICT admins read engineering documents"
on storage.objects;

create policy
  "ICT admins read engineering documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'engineering-documents'
  and public.is_ict_admin()
);

-- Existing public upload policies are intentionally untouched.

-- ---------------------------------------------------------
-- 8. CONTENT MANAGEMENT TABLES
-- ---------------------------------------------------------

alter table if exists public.ict_projects
enable row level security;

alter table if exists public.ict_services
enable row level security;

alter table if exists public.ict_partners
enable row level security;

alter table if exists public.ict_site_settings
enable row level security;

drop policy if exists
  "Authenticated manages projects"
on public.ict_projects;

drop policy if exists
  "ICT admins manage projects"
on public.ict_projects;

create policy
  "ICT admins manage projects"
on public.ict_projects
for all
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "Authenticated manages services"
on public.ict_services;

drop policy if exists
  "ICT admins manage services"
on public.ict_services;

create policy
  "ICT admins manage services"
on public.ict_services
for all
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "Authenticated manages partners"
on public.ict_partners;

drop policy if exists
  "ICT admins manage partners"
on public.ict_partners;

create policy
  "ICT admins manage partners"
on public.ict_partners
for all
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

drop policy if exists
  "Authenticated manages settings"
on public.ict_site_settings;

drop policy if exists
  "ICT admins manage settings"
on public.ict_site_settings;

create policy
  "ICT admins manage settings"
on public.ict_site_settings
for all
to authenticated
using (
  public.is_ict_admin()
)
with check (
  public.is_ict_admin()
);

-- =========================================================
-- بعد إنشاء مستخدم من:
-- Supabase > Authentication > Users
--
-- انسخ User UID وشغّل:
--
-- insert into public.ict_admin_users (
--   user_id,
--   full_name,
--   role,
--   is_active
-- )
-- values (
--   'PUT-USER-UUID-HERE',
--   'Administrator',
--   'admin',
--   true
-- )
-- on conflict (user_id)
-- do update set
--   full_name = excluded.full_name,
--   role = excluded.role,
--   is_active = excluded.is_active,
--   updated_at = now();
-- =========================================================
