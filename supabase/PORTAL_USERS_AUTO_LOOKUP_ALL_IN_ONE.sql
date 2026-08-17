-- ============================================================
-- BASMAT ICT — PORTAL USER EMAIL LOOKUP
-- Existing admin links customer portal account by EMAIL.
-- UID stays internal and is never typed in the UI.
-- ============================================================

-- 01 PRECHECK
do $$
begin
  if to_regprocedure('public.is_ict_admin()') is null then
    raise exception 'PRECHECK FAIL: is_ict_admin() missing';
  end if;

  if to_regclass('public.ict_customer_portal_users') is null then
    raise exception 'PRECHECK FAIL: ict_customer_portal_users missing';
  end if;

  if to_regclass('public.ict_customers') is null then
    raise exception 'PRECHECK FAIL: ict_customers missing';
  end if;
end $$;

select 'PORTAL USER LOOKUP PRECHECK' check_name,'PASS ✅' result;

-- 02 LOOKUP RPC
create or replace function public.ict_lookup_portal_auth_user_by_email(p_email text)
returns table(
  user_id uuid,
  email text,
  full_name text
)
language plpgsql
security definer
set search_path=public,auth
as $$
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(
      nullif(trim(u.raw_user_meta_data->>'full_name'),''),
      nullif(trim(u.raw_user_meta_data->>'name'),''),
      split_part(u.email,'@',1)
    )::text
  from auth.users u
  where lower(u.email)=lower(trim(p_email))
  limit 1;
end $$;

revoke all on function public.ict_lookup_portal_auth_user_by_email(text) from public;
grant execute on function public.ict_lookup_portal_auth_user_by_email(text) to authenticated;

notify pgrst,'reload schema';

-- 03 HEALTH
select
  'PORTAL USER LOOKUP RPC' check_name,
  case when to_regprocedure('public.ict_lookup_portal_auth_user_by_email(text)') is not null
    then 'PASS ✅' else 'FAIL ❌' end result;

-- 04 FINAL
select
  'PORTAL USERS AUTO LOOKUP HOTFIX' check_name,
  case when
    to_regprocedure('public.ict_lookup_portal_auth_user_by_email(text)') is not null
    and has_function_privilege(
      'authenticated',
      'public.ict_lookup_portal_auth_user_by_email(text)',
      'EXECUTE'
    )
  then 'PASS ✅' else 'FAIL ❌' end result;
