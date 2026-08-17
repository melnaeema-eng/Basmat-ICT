-- BASMAT ICT — PRODUCTION COMPLETION HOTFIX
-- IT Role + IT permissions + Employee Help permission
-- Safe to re-run after S35.

begin;

alter table public.ict_admin_role_permissions
  drop constraint if exists ict_admin_role_permissions_role_check;
alter table public.ict_admin_role_permissions
  add constraint ict_admin_role_permissions_role_check
  check (role in ('admin','manager','sales','engineer','support','hr','finance','it'));

alter table public.ict_admin_users
  drop constraint if exists ict_admin_users_role_check;
alter table public.ict_admin_users
  add constraint ict_admin_users_role_check
  check (role in ('admin','manager','sales','engineer','support','hr','finance','it'));

-- Ensure every current role can see the employee guide.
insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select r.role,'employee_help',true,now()
from (values ('admin'),('manager'),('sales'),('engineer'),('support'),('hr'),('finance'),('it')) r(role)
on conflict(role,permission_key) do update set is_allowed=true,updated_at=now();

-- IT is intentionally limited to system administration/health.
insert into public.ict_admin_role_permissions(role,permission_key,is_allowed,updated_at)
select 'it',p.permission_key,
       p.permission_key in ('dashboard','notifications','access_control','erp_health','employee_help'),
       now()
from (
 select distinct permission_key from public.ict_admin_role_permissions
 union all select 'dashboard'
 union all select 'notifications'
 union all select 'access_control'
 union all select 'erp_health'
 union all select 'employee_help'
) p
on conflict(role,permission_key) do update set is_allowed=excluded.is_allowed,updated_at=now();

-- If the account already exists in ict_admin_users, make it the IT account.
update public.ict_admin_users
set role='it',is_active=true,is_archived=false
where lower(email)=lower('it@basmat.com');

commit;

-- HEALTH
select check_name,result from (
 select 'IT role constraint' check_name,
        case when exists(select 1 from public.ict_admin_role_permissions where role='it') then 'PASS ✅' else 'FAIL ❌' end result
 union all
 select 'IT access control',case when exists(select 1 from public.ict_admin_role_permissions where role='it' and permission_key='access_control' and is_allowed) then 'PASS ✅' else 'FAIL ❌' end
 union all
 select 'IT ERP health',case when exists(select 1 from public.ict_admin_role_permissions where role='it' and permission_key='erp_health' and is_allowed) then 'PASS ✅' else 'FAIL ❌' end
 union all
 select 'Employee help permission',case when exists(select 1 from public.ict_admin_role_permissions where permission_key='employee_help' and is_allowed) then 'PASS ✅' else 'FAIL ❌' end
) q;
