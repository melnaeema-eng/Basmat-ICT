-- =========================================================
-- BASMAT ICT — SPRINT 18C
-- HR -> Admin Access + Module Permissions
-- =========================================================

-- Add default HR/Payroll/Finance permission rows for all existing roles.
insert into public.ict_admin_role_permissions(role, permission_key, is_allowed)
select r.role, p.permission_key, false
from (
  select distinct role
  from public.ict_admin_role_permissions
  union
  select unnest(array['admin','manager','sales','engineer','support','hr','finance'])
) r
cross join (
  values ('hr'), ('payroll'), ('finance')
) p(permission_key)
on conflict (role, permission_key)
do nothing;

-- Admin gets all new modules automatically.
update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'admin'
  and permission_key in ('hr','payroll','finance');

-- HR role gets HR module by default.
update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'hr'
  and permission_key = 'hr';

-- Finance role gets Finance + Payroll by default.
update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'finance'
  and permission_key in ('finance','payroll');

-- Link an HR employee to admin access using the SAME auth.user_id.
create or replace function public.ict_set_employee_admin_access(
  p_employee_id uuid,
  p_role text,
  p_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_employee public.ict_hr_employees%rowtype;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select *
  into v_employee
  from public.ict_hr_employees
  where id = p_employee_id;

  if not found then
    raise exception 'الموظف غير موجود.';
  end if;

  if v_employee.auth_user_id is null then
    raise exception 'الموظف غير مرتبط بحساب Auth.';
  end if;

  if p_role not in ('admin','manager','sales','engineer','support','hr','finance') then
    raise exception 'الدور غير صحيح.';
  end if;

  insert into public.ict_admin_users(
    user_id,
    full_name,
    email,
    role,
    is_active,
    is_archived
  )
  values(
    v_employee.auth_user_id,
    v_employee.full_name,
    v_employee.email,
    p_role,
    p_enabled,
    false
  )
  on conflict (user_id)
  do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    is_active = excluded.is_active,
    is_archived = false;

  return jsonb_build_object(
    'success', true,
    'user_id', v_employee.auth_user_id,
    'role', p_role,
    'is_active', p_enabled
  );
end;
$$;

grant execute
on function public.ict_set_employee_admin_access(uuid,text,boolean)
to authenticated;

-- Read current admin access for an HR employee.
create or replace function public.ict_get_employee_admin_access(
  p_employee_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_role text;
  v_active boolean;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  select auth_user_id into v_uid
  from public.ict_hr_employees
  where id = p_employee_id;

  select role, is_active
  into v_role, v_active
  from public.ict_admin_users
  where user_id = v_uid
  limit 1;

  return jsonb_build_object(
    'has_admin_access', v_role is not null,
    'role', v_role,
    'is_active', coalesce(v_active,false)
  );
end;
$$;

grant execute
on function public.ict_get_employee_admin_access(uuid)
to authenticated;

notify pgrst, 'reload schema';
