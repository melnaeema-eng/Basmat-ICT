-- =========================================================
-- BASMAT ICT — SPRINT 18B.1 HOTFIX
-- Existing employee detection + stable employee number
-- =========================================================

-- Ensure employee code is stable and unique.
create unique index if not exists ict_hr_employees_employee_code_uidx
  on public.ict_hr_employees(employee_code)
  where employee_code is not null;

-- Lookup an existing person AND existing HR employee by email.
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
    notes
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
    v_hr_notes
  from public.ict_hr_employees
  where lower(email) = v_email
     or (v_uid is not null and auth_user_id = v_uid)
  order by created_at desc
  limit 1;

  if to_regclass('public.ict_customers') is not null then
    begin
      execute '
        select id,
               coalesce(nullif(name, ), nullif(company_name, )),
               phone
        from public.ict_customers
        where lower(email) = $1
        limit 1'
      into v_customer_id, v_customer_name, v_customer_phone
      using v_email;
    exception when others then
      null;
    end;
  end if;

  return jsonb_build_object(
    'found', (v_uid is not null or v_hr_id is not null or v_customer_id is not null),
    'auth_user_id', v_uid,
    'customer_id', v_customer_id,

    'employee_exists', v_hr_id is not null,
    'employee_id', v_hr_id,
    'employee_code', v_employee_code,

    'full_name', coalesce(v_hr_name, v_customer_name, v_auth_name),
    'phone', case
      when length(coalesce(v_hr_phone,'')) >= 7 then v_hr_phone
      when length(coalesce(v_customer_phone,'')) >= 7 then v_customer_phone
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

-- Prevent duplicate HR profile creation.
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

  select id
  into v_uid
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
  order by created_at desc
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
    case when length(trim(coalesce(p_phone,''))) >= 7
         then trim(p_phone)
         else null end,
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

notify pgrst, 'reload schema';
