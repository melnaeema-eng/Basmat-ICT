-- ============================================================
-- BASMAT ICT — SPRINT 18D SAFE
-- Attendance + Leave, linked ONLY to public.ict_hr_employees
-- Does not touch any school_* table.
-- ============================================================

create table if not exists public.ict_hr_attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ict_hr_employees(id) on delete restrict,
  attendance_date date not null default current_date,
  clock_in timestamptz,
  clock_out timestamptz,
  status text not null default 'present'
    check (status in ('present','late','absent','leave','remote')),
  late_minutes integer not null default 0 check (late_minutes >= 0),
  early_leave_minutes integer not null default 0 check (early_leave_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, attendance_date)
);

create index if not exists ict_hr_attendance_employee_date_idx
  on public.ict_hr_attendance(employee_id, attendance_date desc);

create table if not exists public.ict_hr_leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.ict_hr_employees(id) on delete restrict,
  leave_type text not null
    check (leave_type in ('annual','sick','emergency','unpaid','other')),
  start_date date not null,
  end_date date not null,
  days_count integer not null check (days_count > 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','cancelled')),
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

drop policy if exists "ict_hr_attendance_admin_read" on public.ict_hr_attendance;
create policy "ict_hr_attendance_admin_read"
on public.ict_hr_attendance for select
to authenticated
using (public.is_ict_admin());

drop policy if exists "ict_hr_leave_admin_read" on public.ict_hr_leave_requests;
create policy "ict_hr_leave_admin_read"
on public.ict_hr_leave_requests for select
to authenticated
using (public.is_ict_admin());

-- Current employee attendance for today.
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
      employee_id, attendance_date, clock_in, status
    )
    values(v_employee_id, current_date, now(), 'present')
    on conflict(employee_id, attendance_date)
    do update set
      clock_in = coalesce(public.ict_hr_attendance.clock_in, excluded.clock_in),
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

grant execute on function public.ict_hr_clock(text) to authenticated;

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
      join public.ict_hr_employees e on e.id = a.employee_id
      where e.auth_user_id = auth.uid()
        and a.attendance_date = current_date
      limit 1
    ),
    '{}'::jsonb
  );
$$;

grant execute on function public.ict_hr_my_today() to authenticated;

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

  if p_leave_type not in ('annual','sick','emergency','unpaid','other') then
    raise exception 'نوع الإجازة غير صحيح.';
  end if;

  v_days := (p_end_date - p_start_date) + 1;

  insert into public.ict_hr_leave_requests(
    employee_id, leave_type, start_date, end_date, days_count, reason
  )
  values(
    v_employee_id, p_leave_type, p_start_date, p_end_date, v_days,
    nullif(trim(coalesce(p_reason,'')), '')
  )
  returning id into v_id;

  return jsonb_build_object('success',true,'id',v_id,'days_count',v_days);
end;
$$;

grant execute on function public.ict_hr_submit_leave(text,date,date,text) to authenticated;

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
  select l.id,l.leave_type,l.start_date,l.end_date,l.days_count,
         l.reason,l.status,l.review_note,l.created_at
  from public.ict_hr_leave_requests l
  join public.ict_hr_employees e on e.id = l.employee_id
  where e.auth_user_id = auth.uid()
  order by l.created_at desc;
$$;

grant execute on function public.ict_hr_my_leaves() to authenticated;

-- HR/Admin review. Reuses existing HR permission model; no new role table.
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
  select role into v_role
  from public.ict_admin_users
  where user_id = auth.uid()
    and is_active = true
    and coalesce(is_archived,false) = false
  limit 1;

  if v_role is null then
    raise exception 'غير مصرح.';
  end if;

  if v_role <> 'admin' and not exists(
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

  return jsonb_build_object('success',true,'status',p_status);
end;
$$;

grant execute on function public.ict_hr_review_leave(uuid,text,text) to authenticated;

notify pgrst, 'reload schema';
