-- BASMAT ICT — HR EMPLOYEE CODE + GLOBAL ANNOUNCEMENTS
-- Run once in Supabase SQL Editor. Safe to re-run.

create extension if not exists pgcrypto;

-- =========================================================
-- A) EMPLOYEE CODE: automatic EMP-0001, EMP-0002...
-- =========================================================
create or replace function public.ict_fill_employee_code()
returns trigger
language plpgsql
set search_path=public
as $$
declare v_next integer;
begin
  if new.employee_code is null or btrim(new.employee_code)='' then
    perform pg_advisory_xact_lock(hashtext('ict_hr_employees_employee_code'));
    select coalesce(max(nullif(regexp_replace(employee_code,'\D','','g'),'')::integer),0)+1
      into v_next
    from public.ict_hr_employees
    where employee_code is not null;
    new.employee_code := 'EMP-' || lpad(v_next::text,4,'0');
  end if;
  return new;
end $$;

drop trigger if exists trg_ict_fill_employee_code on public.ict_hr_employees;
create trigger trg_ict_fill_employee_code
before insert on public.ict_hr_employees
for each row execute function public.ict_fill_employee_code();

-- Backfill existing employees that have no number.
do $$
declare r record; v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext('ict_hr_employees_employee_code'));
  select coalesce(max(nullif(regexp_replace(employee_code,'\D','','g'),'')::integer),0)+1
  into v_next from public.ict_hr_employees where employee_code is not null;

  for r in select id from public.ict_hr_employees where employee_code is null or btrim(employee_code)='' order by created_at,id
  loop
    update public.ict_hr_employees set employee_code='EMP-'||lpad(v_next::text,4,'0') where id=r.id;
    v_next:=v_next+1;
  end loop;
end $$;

-- =========================================================
-- B) GLOBAL ANNOUNCEMENTS
-- =========================================================
create table if not exists public.ict_announcements(
 id uuid primary key default gen_random_uuid(),
 title text not null,
 message text not null,
 target_type text not null default 'all' check(target_type in('all','employees','customers','role')),
 target_role text,
 priority text not null default 'normal' check(priority in('normal','important')),
 expires_at timestamptz,
 send_email boolean not null default false,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);

create table if not exists public.ict_announcement_recipients(
 id uuid primary key default gen_random_uuid(),
 announcement_id uuid not null references public.ict_announcements(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 audience_type text not null check(audience_type in('employee','customer')),
 email text,
 is_read boolean not null default false,
 read_at timestamptz,
 email_sent_at timestamptz,
 created_at timestamptz not null default now(),
 unique(announcement_id,user_id)
);

create index if not exists idx_ict_announcement_recipient_user on public.ict_announcement_recipients(user_id,is_read,created_at desc);

alter table public.ict_announcements enable row level security;
alter table public.ict_announcement_recipients enable row level security;

drop policy if exists "Admins manage announcements" on public.ict_announcements;
create policy "Admins manage announcements" on public.ict_announcements for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "Recipients read announcements" on public.ict_announcements;
create policy "Recipients read announcements" on public.ict_announcements for select to authenticated
using(exists(select 1 from public.ict_announcement_recipients r where r.announcement_id=id and r.user_id=auth.uid()));

drop policy if exists "Admins manage announcement recipients" on public.ict_announcement_recipients;
create policy "Admins manage announcement recipients" on public.ict_announcement_recipients for all to authenticated
using(public.is_ict_admin()) with check(public.is_ict_admin());

drop policy if exists "Recipients read own announcement rows" on public.ict_announcement_recipients;
create policy "Recipients read own announcement rows" on public.ict_announcement_recipients for select to authenticated
using(user_id=auth.uid());

drop policy if exists "Recipients update own announcement rows" on public.ict_announcement_recipients;
create policy "Recipients update own announcement rows" on public.ict_announcement_recipients for update to authenticated
using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace view public.ict_announcement_inbox
with (security_invoker=true)
as
select r.id recipient_id,r.user_id,r.is_read,r.read_at,a.id announcement_id,a.title,a.message,a.priority,a.expires_at,a.created_at
from public.ict_announcement_recipients r
join public.ict_announcements a on a.id=r.announcement_id
where r.user_id=auth.uid() and (a.expires_at is null or a.expires_at>now());

grant select on public.ict_announcement_inbox to authenticated;

create or replace function public.ict_publish_announcement(
 p_title text,p_message text,p_target_type text default 'all',p_target_role text default null,
 p_priority text default 'normal',p_expires_at timestamptz default null,p_send_email boolean default false
)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare v_id uuid; v_count integer;
begin
 if not public.is_ict_admin() then raise exception 'Admin access required'; end if;
 if p_target_type not in('all','employees','customers','role') then raise exception 'Invalid target type'; end if;
 if p_target_type='role' and coalesce(btrim(p_target_role),'')='' then raise exception 'Role is required'; end if;

 insert into public.ict_announcements(title,message,target_type,target_role,priority,expires_at,send_email,created_by)
 values(btrim(p_title),btrim(p_message),p_target_type,p_target_role,p_priority,p_expires_at,p_send_email,auth.uid())
 returning id into v_id;

 insert into public.ict_announcement_recipients(announcement_id,user_id,audience_type,email)
 select v_id,x.user_id,x.audience_type,x.email
 from (
   select au.user_id,'employee'::text audience_type,au.email
   from public.ict_admin_users au
   where au.is_active=true
     and coalesce(au.is_archived,false)=false
     and p_target_type in('all','employees','role')
     and (p_target_type<>'role' or au.role=p_target_role)
   union
   select cpu.user_id,'customer'::text,cpu.email
   from public.ict_customer_portal_users cpu
   where cpu.is_active=true and p_target_type in('all','customers')
 ) x
 on conflict(announcement_id,user_id) do nothing;

 get diagnostics v_count=row_count;
 return jsonb_build_object('announcement_id',v_id,'recipient_count',v_count,'send_email',p_send_email);
end $$;

grant execute on function public.ict_publish_announcement(text,text,text,text,text,timestamptz,boolean) to authenticated;
notify pgrst,'reload schema';

-- HEALTH
select 'EMPLOYEE CODE TRIGGER' check_name,
 case when exists(select 1 from pg_trigger where tgname='trg_ict_fill_employee_code' and not tgisinternal) then 'PASS ✅' else 'FAIL ❌' end result
union all
select 'EMPLOYEES WITHOUT CODE',
 case when not exists(select 1 from public.ict_hr_employees where employee_code is null or btrim(employee_code)='') then 'PASS ✅' else 'FAIL ❌' end
union all
select 'ANNOUNCEMENTS TABLE',case when to_regclass('public.ict_announcements') is not null then 'PASS ✅' else 'FAIL ❌' end
union all
select 'ANNOUNCEMENT RECIPIENTS',case when to_regclass('public.ict_announcement_recipients') is not null then 'PASS ✅' else 'FAIL ❌' end;
