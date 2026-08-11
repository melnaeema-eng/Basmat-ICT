alter table public.ict_admin_notifications
  add column if not exists action_completed boolean not null default false,
  add column if not exists action_completed_at timestamptz;

update public.ict_admin_notifications
set action_completed = false
where action_completed is null;
