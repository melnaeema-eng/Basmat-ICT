-- ============================================================
-- BASMAT ICT — SPRINT 18 FINAL
-- HR + Admin Roles/Permissions + Attendance + Leave
-- Consolidated / Idempotent / Preflight Checked
--
-- VERIFIED AGAINST USER-PROVIDED SCHEMA:
-- public.ict_hr_employees
-- public.ict_admin_users
-- public.ict_admin_role_permissions
--
-- DOES NOT TOUCH:
-- auth password/reset flow
-- MFA/2FA
-- school_* tables
-- project/invoice duplicate tables
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 0) PRE-FLIGHT: fail BEFORE modifications if required schema
--    is not the schema we verified.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.ict_hr_employees') is null then
    raise exception 'PRE-FLIGHT FAILED: public.ict_hr_employees is missing';
  end if;

  if to_regclass('public.ict_admin_users') is null then
    raise exception 'PRE-FLIGHT FAILED: public.ict_admin_users is missing';
  end if;

  if to_regclass('public.ict_admin_role_permissions') is null then
    raise exception 'PRE-FLIGHT FAILED: public.ict_admin_role_permissions is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_hr_employees'
      and column_name='auth_user_id'
  ) then
    raise exception 'PRE-FLIGHT FAILED: ict_hr_employees.auth_user_id is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_hr_employees'
      and column_name='employee_code'
  ) then
    raise exception 'PRE-FLIGHT FAILED: ict_hr_employees.employee_code is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_admin_users'
      and column_name='user_id'
  ) then
    raise exception 'PRE-FLIGHT FAILED: ict_admin_users.user_id is missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public'
      and table_name='ict_admin_role_permissions'
      and column_name='permission_key'
  ) then
    raise exception 'PRE-FLIGHT FAILED: ict_admin_role_permissions.permission_key is missing';
  end if;
end $$;

-- ------------------------------------------------------------
-- 1) FIX EXISTING ROLE CHECK CONSTRAINTS
--    Existing verified constraint allowed only:
--    admin, manager, sales, engineer, support
--    We extend it safely to HR + Finance.
-- ------------------------------------------------------------
alter table public.ict_admin_role_permissions
  drop constraint if exists ict_admin_role_permissions_role_check;

alter table public.ict_admin_role_permissions
  add constraint ict_admin_role_permissions_role_check
  check (
    role = any (
      array[
        'admin'::text,
        'manager'::text,
        'sales'::text,
        'engineer'::text,
        'support'::text,
        'hr'::text,
        'finance'::text
      ]
    )
  );

alter table public.ict_admin_users
  drop constraint if exists ict_admin_users_role_check;

alter table public.ict_admin_users
  add constraint ict_admin_users_role_check
  check (
    role = any (
      array[
        'admin'::text,
        'manager'::text,
        'sales'::text,
        'engineer'::text,
        'support'::text,
        'hr'::text,
        'finance'::text
      ]
    )
  );

-- ------------------------------------------------------------
-- 2) EMPLOYEE NUMBER
-- ------------------------------------------------------------
create sequence if not exists public.ict_hr_employee_no_seq start 1;

create or replace function public.ict_next_employee_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  return 'EMP-' ||
    lpad(nextval('public.ict_hr_employee_no_seq')::text, 4, '0');
end;
$$;

alter table public.ict_hr_employees
  alter column employee_code
  set default public.ict_next_employee_code();

create unique index if not exists ict_hr_employees_employee_code_uidx
  on public.ict_hr_employees(employee_code)
  where employee_code is not null;

create unique index if not exists ict_hr_employees_auth_user_id_uidx
  on public.ict_hr_employees(auth_user_id)
  where auth_user_id is not null;

-- Backfill employee numbers only where missing.
update public.ict_hr_employees
set employee_code = public.ict_next_employee_code()
where employee_code is null
   or trim(employee_code) = '';

-- ------------------------------------------------------------
-- 3) PERMISSION KEYS / ROLES
-- ------------------------------------------------------------
insert into public.ict_admin_role_permissions(
  role, permission_key, is_allowed, updated_at
)
select r.role, p.permission_key, false, now()
from (
  values
    ('admin'),
    ('manager'),
    ('sales'),
    ('engineer'),
    ('support'),
    ('hr'),
    ('finance')
) as r(role)
cross join (
  values
    ('hr'),
    ('payroll'),
    ('finance')
) as p(permission_key)
on conflict (role, permission_key)
do nothing;

update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'admin'
  and permission_key in ('hr','payroll','finance');

update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'hr'
  and permission_key = 'hr';

update public.ict_admin_role_permissions
set is_allowed = true,
    updated_at = now()
where role = 'finance'
  and permission_key in ('finance','payroll');

-- ------------------------------------------------------------
-- 4) HR LOOKUP: existing Auth identity + existing employee.
--    No duplicate employee is created.
-- ------------------------------------------------------------
create or replace function public.ict_find_person_for_hiring(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := lower(trim(p_email));
  v_uid uuid;
  v_auth_name text;

  v_hr_id uuid;
  v_employee_code text;
  v_hr_name text;
  v_hr_phone text;
  v_hr_department text;
  v_hr_job_title text;
  v_hr_employment_type text;
  v_hr_hire_date date;
  v_hr_status text;
  v_hr_notes text;

  v_customer_id uuid;
  v_customer_name text;
  v_customer_phone text;

  v_team_id uuid;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح';
  end if;

  select
    id,
    coalesce(
      nullif(raw_user_meta_data->>'full_name',''),
      nullif(raw_user_meta_data->>'name','')
    )
  into v_uid, v_auth_name
  from auth.users
  where lower(email) = v_email
  limit 1;

  select
    id,
    employee_code,
    full_name,
    phone,
    department,
    job_title,
    employment_type,
    hire_date,
    status,
    notes,
    team_member_id
  into
    v_hr_id,
    v_employee_code,
    v_hr_name,
    v_hr_phone,
    v_hr_department,
    v_hr_job_title,
    v_hr_employment_type,
    v_hr_hire_date,
    v_hr_status,
    v_hr_notes,
    v_team_id
  from public.ict_hr_employees
  where lower(email) = v_email
     or (v_uid is not null and auth_user_id = v_uid)
  order by created_at
  limit 1;

  -- Verified current customer schema uses name/company_name/email/phone.
  if to_regclass('public.ict_customers') is not null then
    select
      id,
      coalesce(nullif(name,''), nullif(company_name,'')),
      phone
    into
      v_customer_id,
      v_customer_name,
      v_customer_phone
    from public.ict_customers
    where lower(email) = v_email
    limit 1;
  end if;

  return jsonb_build_object(
    'found', (
      v_uid is not null
      or v_hr_id is not null
      or v_customer_id is not null
    ),
    'auth_user_id', v_uid,
    'customer_id', v_customer_id,
    'team_member_id', v_team_id,

    'employee_exists', v_hr_id is not null,
    'employee_id', v_hr_id,
    'employee_code', v_employee_code,

    'full_name', coalesce(v_hr_name, v_customer_name, v_auth_name),
    'phone',
      case
        when length(regexp_replace(coalesce(v_hr_phone,''), '\D','','g')) >= 7
          then v_hr_phone
        when length(regexp_replace(coalesce(v_customer_phone,''), '\D','','g')) >= 7
          then v_customer_phone
        else null
      end,

    'department', v_hr_department,
    'job_title', v_hr_job_title,
    'employment_type', v_hr_employment_type,
    'hire_date', v_hr_hire_date,
    'status', v_hr_status,
    'notes', v_hr_notes,
    'email', v_email
  );
end;
$$;

grant execute
on function public.ict_find_person_for_hiring(text)
to authenticated;

-- ------------------------------------------------------------
-- 5) HIRE: only existing Auth user; stable employee number;
--    returns existing employee instead of duplicating.
-- ------------------------------------------------------------
create or replace function public.ict_hire_existing_person(
  p_email text,
  p_full_name text,
  p_phone text default null,
  p_department text default null,
  p_job_title text default null,
  p_employment_type text default 'full_time',
  p_hire_date date default current_date,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid;
  v_existing_id uuid;
  v_existing_code text;
  v_id uuid;
  v_code text;
  v_email text := lower(trim(p_email));
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح';
  end if;

  select id into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'لا يوجد حساب مستخدم بهذا البريد';
  end if;

  select id, employee_code
  into v_existing_id, v_existing_code
  from public.ict_hr_employees
  where auth_user_id = v_uid
     or lower(email) = v_email
  order by created_at
  limit 1;

  if v_existing_id is not null then
    return jsonb_build_object(
      'created', false,
      'employee_exists', true,
      'employee_id', v_existing_id,
      'employee_code', v_existing_code,
      'message', 'الموظف موجود بالفعل'
    );
  end if;

  insert into public.ict_hr_employees(
    auth_user_id,
    full_name,
    email,
    phone,
    department,
    job_title,
    employment_type,
    hire_date,
    status,
    notes
  )
  values(
    v_uid,
    trim(p_full_name),
    v_email,
    case
      when length(regexp_replace(trim(coalesce(p_phone,'')), '\D','','g')) >= 7
      then trim(p_phone)
      else null
    end,
    nullif(trim(coalesce(p_department,'')), ''),
    nullif(trim(coalesce(p_job_title,'')), ''),
    p_employment_type,
    p_hire_date,
    'active',
    nullif(trim(coalesce(p_notes,'')), '')
  )
  returning id, employee_code
  into v_id, v_code;

  return jsonb_build_object(
    'created', true,
    'employee_exists', false,
    'employee_id', v_id,
    'employee_code', v_code,
    'auth_user_id', v_uid
  );
end;
$$;

grant execute
on function public.ict_hire_existing_person(
  text,text,text,text,text,text,date,text
)
to authenticated;

-- ------------------------------------------------------------
-- 6) ADMIN ACCESS FOR EMPLOYEE
-- ------------------------------------------------------------
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

  if p_role not in (
    'admin','manager','sales','engineer','support','hr','finance'
  ) then
    raise exception 'الدور غير صحيح.';
  end if;

  insert into public.ict_admin_users(
    user_id,
    full_name,
    email,
    role,
    is_active,
    is_archived,
    archived_at
  )
  values(
    v_employee.auth_user_id,
    v_employee.full_name,
    v_employee.email,
    p_role,
    p_enabled,
    false,
    null
  )
  on conflict (user_id)
  do update set
    full_name = excluded.full_name,
    email = excluded.email,
    role = excluded.role,
    is_active = excluded.is_active,
    is_archived = false,
    archived_at = null,
    updated_at = now();

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

  select auth_user_id
  into v_uid
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

-- ------------------------------------------------------------
-- 7) ATTENDANCE TABLE
--    Confirmed missing from ICT schema.
-- ------------------------------------------------------------
create table if not exists public.ict_hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null
    references public.ict_hr_employees(id)
    on delete restrict,
  attendance_date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  status text not null default 'present'
    check (status in ('present','late','absent','leave','remote')),
  late_minutes integer not null default 0
    check (late_minutes >= 0),
  early_leave_minutes integer not null default 0
    check (early_leave_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create index if not exists ict_hr_attendance_employee_date_idx
  on public.ict_hr_attendance(employee_id, attendance_date desc);

-- ------------------------------------------------------------
-- 8) LEAVE TABLE
--    Confirmed missing from ICT schema.
-- ------------------------------------------------------------
create table if not exists public.ict_hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null
    references public.ict_hr_employees(id)
    on delete restrict,
  leave_type text not null
    check (
      leave_type in ('annual','sick','emergency','unpaid','other')
    ),
  start_date date not null,
  end_date date not null,
  days_count integer not null check (days_count > 0),
  reason text,
  status text not null default 'pending'
    check (
      status in ('pending','approved','rejected','cancelled')
    ),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists ict_hr_leave_employee_created_idx
  on public.ict_hr_leave_requests(employee_id, created_at desc);

alter table public.ict_hr_attendance enable row level security;
alter table public.ict_hr_leave_requests enable row level security;

drop policy if exists "ict_hr_attendance_admin_read"
  on public.ict_hr_attendance;

create policy "ict_hr_attendance_admin_read"
on public.ict_hr_attendance
for select
to authenticated
using (public.is_ict_admin());

drop policy if exists "ict_hr_leave_admin_read"
  on public.ict_hr_leave_requests;

create policy "ict_hr_leave_admin_read"
on public.ict_hr_leave_requests
for select
to authenticated
using (public.is_ict_admin());

-- ------------------------------------------------------------
-- 9) EMPLOYEE SELF-SERVICE: CLOCK
-- ------------------------------------------------------------
create or replace function public.ict_hr_clock(p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_row public.ict_hr_attendance%rowtype;
begin
  select id into v_employee_id
  from public.ict_hr_employees
  where auth_user_id = auth.uid()
    and status = 'active'
  order by created_at
  limit 1;

  if v_employee_id is null then
    raise exception 'لا يوجد ملف موظف نشط مرتبط بهذا الحساب.';
  end if;

  if p_action = 'in' then
    insert into public.ict_hr_attendance(
      employee_id,
      attendance_date,
      clock_in,
      status
    )
    values(
      v_employee_id,
      current_date,
      now(),
      'present'
    )
    on conflict(employee_id, attendance_date)
    do update set
      clock_in = coalesce(
        public.ict_hr_attendance.clock_in,
        excluded.clock_in
      ),
      updated_at = now()
    returning * into v_row;

  elsif p_action = 'out' then
    update public.ict_hr_attendance
    set clock_out = coalesce(clock_out, now()),
        updated_at = now()
    where employee_id = v_employee_id
      and attendance_date = current_date
      and clock_in is not null
    returning * into v_row;

    if v_row.id is null then
      raise exception 'يجب تسجيل الحضور أولاً.';
    end if;
  else
    raise exception 'الإجراء غير صحيح.';
  end if;

  return to_jsonb(v_row);
end;
$$;

grant execute
on function public.ict_hr_clock(text)
to authenticated;

create or replace function public.ict_hr_my_today()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select to_jsonb(a)
      from public.ict_hr_attendance a
      join public.ict_hr_employees e
        on e.id = a.employee_id
      where e.auth_user_id = auth.uid()
        and a.attendance_date = current_date
      limit 1
    ),
    '{}'::jsonb
  );
$$;

grant execute
on function public.ict_hr_my_today()
to authenticated;

-- ------------------------------------------------------------
-- 10) EMPLOYEE SELF-SERVICE: LEAVE
-- ------------------------------------------------------------
create or replace function public.ict_hr_submit_leave(
  p_leave_type text,
  p_start_date date,
  p_end_date date,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_id uuid;
  v_id uuid;
  v_days integer;
begin
  select id into v_employee_id
  from public.ict_hr_employees
  where auth_user_id = auth.uid()
    and status = 'active'
  order by created_at
  limit 1;

  if v_employee_id is null then
    raise exception 'لا يوجد ملف موظف نشط مرتبط بهذا الحساب.';
  end if;

  if p_end_date < p_start_date then
    raise exception 'تاريخ النهاية يجب أن يكون بعد أو مساويًا لتاريخ البداية.';
  end if;

  if p_leave_type not in (
    'annual','sick','emergency','unpaid','other'
  ) then
    raise exception 'نوع الإجازة غير صحيح.';
  end if;

  v_days := (p_end_date - p_start_date) + 1;

  insert into public.ict_hr_leave_requests(
    employee_id,
    leave_type,
    start_date,
    end_date,
    days_count,
    reason
  )
  values(
    v_employee_id,
    p_leave_type,
    p_start_date,
    p_end_date,
    v_days,
    nullif(trim(coalesce(p_reason,'')), '')
  )
  returning id into v_id;

  return jsonb_build_object(
    'success', true,
    'id', v_id,
    'days_count', v_days
  );
end;
$$;

grant execute
on function public.ict_hr_submit_leave(text,date,date,text)
to authenticated;

create or replace function public.ict_hr_my_leaves()
returns table(
  id uuid,
  leave_type text,
  start_date date,
  end_date date,
  days_count integer,
  reason text,
  status text,
  review_note text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.leave_type,
    l.start_date,
    l.end_date,
    l.days_count,
    l.reason,
    l.status,
    l.review_note,
    l.created_at
  from public.ict_hr_leave_requests l
  join public.ict_hr_employees e
    on e.id = l.employee_id
  where e.auth_user_id = auth.uid()
  order by l.created_at desc;
$$;

grant execute
on function public.ict_hr_my_leaves()
to authenticated;

-- ------------------------------------------------------------
-- 11) HR/ADMIN LEAVE REVIEW
-- ------------------------------------------------------------
create or replace function public.ict_hr_review_leave(
  p_request_id uuid,
  p_status text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role
  into v_role
  from public.ict_admin_users
  where user_id = auth.uid()
    and is_active = true
    and coalesce(is_archived,false) = false
  limit 1;

  if v_role is null then
    raise exception 'غير مصرح.';
  end if;

  if v_role <> 'admin'
     and not exists(
       select 1
       from public.ict_admin_role_permissions
       where role = v_role
         and permission_key = 'hr'
         and is_allowed = true
     ) then
    raise exception 'لا توجد صلاحية موارد بشرية.';
  end if;

  if p_status not in ('approved','rejected') then
    raise exception 'الحالة غير صحيحة.';
  end if;

  update public.ict_hr_leave_requests
  set status = p_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = nullif(trim(coalesce(p_review_note,'')), ''),
      updated_at = now()
  where id = p_request_id;

  if not found then
    raise exception 'طلب الإجازة غير موجود.';
  end if;

  return jsonb_build_object(
    'success', true,
    'status', p_status
  );
end;
$$;

grant execute
on function public.ict_hr_review_leave(uuid,text,text)
to authenticated;

notify pgrst, 'reload schema';

commit;

-- ============================================================
-- POST-CHECKS (read only)
-- ============================================================
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid in (
  'public.ict_admin_users'::regclass,
  'public.ict_admin_role_permissions'::regclass
)
and contype = 'c'
order by conname;

select table_name
from information_schema.tables
where table_schema='public'
  and table_name in (
    'ict_hr_employees',
    'ict_hr_attendance',
    'ict_hr_leave_requests',
    'ict_admin_users',
    'ict_admin_role_permissions'
  )
order by table_name;

select routine_name
from information_schema.routines
where routine_schema='public'
  and routine_name in (
    'ict_next_employee_code',
    'ict_find_person_for_hiring',
    'ict_hire_existing_person',
    'ict_set_employee_admin_access',
    'ict_get_employee_admin_access',
    'ict_hr_clock',
    'ict_hr_my_today',
    'ict_hr_submit_leave',
    'ict_hr_my_leaves',
    'ict_hr_review_leave'
  )
order by routine_name;
