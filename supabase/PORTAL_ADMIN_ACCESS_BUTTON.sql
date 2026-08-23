-- ============================================================
-- BASMAT ICT — PORTAL ADMIN ACCESS BUTTON
-- Shows Admin Panel button only to a logged-in portal user
-- who also has an active admin account.
-- Safe to re-run.
-- ============================================================

create or replace function public.ict_current_user_can_access_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ict_admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and coalesce(au.is_archived, false) = false
  );
$$;

revoke all on function public.ict_current_user_can_access_admin() from public;
grant execute on function public.ict_current_user_can_access_admin()
  to authenticated;

notify pgrst, 'reload schema';

select
  'PORTAL ADMIN ACCESS RPC' as check_name,
  case
    when to_regprocedure(
      'public.ict_current_user_can_access_admin()'
    ) is not null
    then 'PASS ✅'
    else 'FAIL ❌'
  end as result;
