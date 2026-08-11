-- =========================================================
-- BASMAT ICT — SPRINT 11
-- Customer Support Tickets & Replies
-- Safe to run after Sprint 10.
-- =========================================================

create extension if not exists pgcrypto;

create sequence if not exists public.ict_support_ticket_seq start 1;

create table if not exists public.ict_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_no text not null unique default (
    'TKT-' || to_char(now(), 'YYMM') || '-' || lpad(nextval('public.ict_support_ticket_seq')::text, 5, '0')
  ),
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  project_id uuid references public.ict_delivery_projects(id) on delete set null,
  subject text not null,
  category text not null default 'technical'
    check (category in ('technical','commercial','billing','project','general')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high','urgent')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_customer','resolved','closed')),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  assigned_to uuid references auth.users(id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ict_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.ict_support_tickets(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null default auth.uid(),
  sender_type text not null default 'customer'
    check (sender_type in ('customer','admin')),
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ict_support_tickets_customer
  on public.ict_support_tickets(customer_id);
create index if not exists idx_ict_support_tickets_project
  on public.ict_support_tickets(project_id);
create index if not exists idx_ict_support_tickets_status
  on public.ict_support_tickets(status);
create index if not exists idx_ict_support_messages_ticket
  on public.ict_support_messages(ticket_id, created_at);

alter table public.ict_support_tickets enable row level security;
alter table public.ict_support_messages enable row level security;

-- Admin: full access

drop policy if exists "ICT admins manage support tickets" on public.ict_support_tickets;
create policy "ICT admins manage support tickets"
on public.ict_support_tickets
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "ICT admins manage support messages" on public.ict_support_messages;
create policy "ICT admins manage support messages"
on public.ict_support_messages
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- Customer: own tickets only

drop policy if exists "Customers read own support tickets" on public.ict_support_tickets;
create policy "Customers read own support tickets"
on public.ict_support_tickets
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers create own support tickets" on public.ict_support_tickets;
create policy "Customers create own support tickets"
on public.ict_support_tickets
for insert to authenticated
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
  and (
    project_id is null
    or exists (
      select 1 from public.ict_delivery_projects p
      where p.id = project_id
        and p.customer_id = public.current_customer_id()
    )
  )
);

-- Customer messages: read non-internal messages and add replies to own tickets.

drop policy if exists "Customers read own support messages" on public.ict_support_messages;
create policy "Customers read own support messages"
on public.ict_support_messages
for select to authenticated
using (
  not is_internal
  and exists (
    select 1
    from public.ict_support_tickets t
    where t.id = ict_support_messages.ticket_id
      and t.customer_id = public.current_customer_id()
      and public.is_customer_portal_user()
  )
);

drop policy if exists "Customers create own support messages" on public.ict_support_messages;
create policy "Customers create own support messages"
on public.ict_support_messages
for insert to authenticated
with check (
  sender_type = 'customer'
  and is_internal = false
  and exists (
    select 1
    from public.ict_support_tickets t
    where t.id = ict_support_messages.ticket_id
      and t.customer_id = public.current_customer_id()
      and public.is_customer_portal_user()
  )
);

-- Keep ticket timestamps current.
create or replace function public.set_ict_support_ticket_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ict_support_ticket_updated_at on public.ict_support_tickets;
create trigger trg_ict_support_ticket_updated_at
before update on public.ict_support_tickets
for each row execute function public.set_ict_support_ticket_updated_at();

create or replace function public.touch_ict_support_ticket_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ict_support_tickets
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_ict_support_ticket_from_message on public.ict_support_messages;
create trigger trg_touch_ict_support_ticket_from_message
after insert on public.ict_support_messages
for each row execute function public.touch_ict_support_ticket_from_message();
