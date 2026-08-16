-- BASMAT ICT — SPRINT 17D
-- Activity & Audit Log

create table if not exists public.ict_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text not null,
  module text,
  record_id uuid,
  details text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ict_activity_log_created_at_idx
  on public.ict_activity_log (created_at desc);

create index if not exists ict_activity_log_user_id_idx
  on public.ict_activity_log (user_id);

alter table public.ict_activity_log enable row level security;

drop policy if exists "ict_activity_log_admin_read" on public.ict_activity_log;
create policy "ict_activity_log_admin_read"
on public.ict_activity_log
for select
to authenticated
using (public.is_ict_admin());

-- Authenticated users may only log actions for their own auth.uid().
drop policy if exists "ict_activity_log_self_insert" on public.ict_activity_log;
create policy "ict_activity_log_self_insert"
on public.ict_activity_log
for insert
to authenticated
with check (user_id = auth.uid());

grant select, insert on public.ict_activity_log to authenticated;

create or replace function public.ict_log_activity(
  p_action text,
  p_module text default null,
  p_record_id uuid default null,
  p_details text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email into v_email
  from auth.users
  where id = auth.uid();

  insert into public.ict_activity_log(
    user_id, user_email, action, module, record_id, details, metadata
  )
  values (
    auth.uid(), v_email, p_action, p_module, p_record_id, p_details,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.ict_log_activity(text,text,uuid,text,jsonb) to authenticated;
