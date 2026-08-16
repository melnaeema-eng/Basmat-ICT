-- BASMAT ICT SPRINT 18B
create sequence if not exists public.ict_hr_employee_no_seq start 1;

create or replace function public.ict_next_employee_code()
returns text language plpgsql security definer set search_path=public as $$
begin
 return 'EMP-' || lpad(nextval('public.ict_hr_employee_no_seq')::text,4,'0');
end; $$;

alter table public.ict_hr_employees
 alter column employee_code set default public.ict_next_employee_code();

create unique index if not exists ict_hr_employees_auth_uidx
on public.ict_hr_employees(auth_user_id) where auth_user_id is not null;

create or replace function public.ict_find_person_for_hiring(p_email text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
 v_email text:=lower(trim(p_email));
 v_uid uuid; v_name text; v_phone text; v_team uuid; v_customer uuid;
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح'; end if;

 select id, coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name')
 into v_uid,v_name from auth.users where lower(email)=v_email limit 1;

 if to_regclass('public.ict_team_members') is not null then
   begin
     execute 'select id, coalesce(full_name,name), phone from public.ict_team_members where lower(email)=$1 limit 1'
     into v_team,v_name,v_phone using v_email;
   exception when others then null; end;
 end if;

 if to_regclass('public.ict_customers') is not null then
   begin
     execute 'select id from public.ict_customers where lower(email)=$1 limit 1'
     into v_customer using v_email;
   exception when others then null; end;
 end if;

 return jsonb_build_object('found',v_uid is not null,'auth_user_id',v_uid,
 'full_name',v_name,'phone',v_phone,'email',v_email,
 'team_member_id',v_team,'customer_id',v_customer);
end; $$;
grant execute on function public.ict_find_person_for_hiring(text) to authenticated;

create or replace function public.ict_hire_existing_person(
 p_email text,p_full_name text,p_phone text default null,p_department text default null,
 p_job_title text default null,p_employment_type text default 'full_time',
 p_hire_date date default current_date,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_uid uuid; v_id uuid; v_code text; v_email text:=lower(trim(p_email));
begin
 if not public.is_ict_admin() then raise exception 'غير مصرح'; end if;
 select id into v_uid from auth.users where lower(email)=v_email limit 1;
 if v_uid is null then raise exception 'لا يوجد حساب مستخدم بهذا البريد'; end if;
 if exists(select 1 from public.ict_hr_employees where auth_user_id=v_uid or lower(email)=v_email)
 then raise exception 'هذا المستخدم موظف بالفعل'; end if;

 insert into public.ict_hr_employees(auth_user_id,full_name,email,phone,department,job_title,
 employment_type,hire_date,status,notes)
 values(v_uid,trim(p_full_name),v_email,p_phone,p_department,p_job_title,
 p_employment_type,p_hire_date,'active',p_notes)
 returning id,employee_code into v_id,v_code;

 return jsonb_build_object('created',true,'employee_id',v_id,'employee_code',v_code,'auth_user_id',v_uid);
end; $$;
grant execute on function public.ict_hire_existing_person(text,text,text,text,text,text,date,text) to authenticated;
