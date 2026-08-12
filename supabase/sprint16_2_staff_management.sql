-- =========================================================
-- BASMAT ICT — SPRINT 16.2
-- Staff archive fields
-- Safe to re-run.
-- =========================================================

alter table public.ict_admin_users
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

-- Allow Administrator to delete a staff profile.
-- This deletes staff access only, not the Supabase Auth user.
drop policy if exists "Super admin deletes admin profiles"
on public.ict_admin_users;

create policy "Super admin deletes admin profiles"
on public.ict_admin_users
for delete
to authenticated
using (public.is_ict_super_admin());
