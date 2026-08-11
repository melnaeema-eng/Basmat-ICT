-- =========================================================
-- BASMAT ICT — SPRINT 11.2
-- Support Activity -> Admin Notifications + Dashboard
-- Run after Sprint 11.1.
-- =========================================================

-- Extend the existing admin notification log so support activity can be linked.
alter table public.ict_admin_notifications
  add column if not exists ticket_id uuid references public.ict_support_tickets(id) on delete cascade,
  add column if not exists support_message_id uuid references public.ict_support_messages(id) on delete cascade,
  add column if not exists support_attachment_id uuid references public.ict_support_attachments(id) on delete cascade;

create index if not exists idx_ict_admin_notifications_ticket
  on public.ict_admin_notifications(ticket_id, created_at desc);

-- ---------------------------------------------------------
-- 1) Customer opens a new support ticket
-- ---------------------------------------------------------
create or replace function public.notify_admin_support_ticket_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_name text;
begin
  -- Only customer-created tickets should raise this activity notification.
  if not exists (
    select 1 from public.ict_customer_portal_users cpu
    where cpu.user_id = new.created_by
      and cpu.customer_id = new.customer_id
      and cpu.is_active = true
  ) then
    return new;
  end if;

  select coalesce(c.company_name, c.name, 'عميل')
    into v_customer_name
  from public.ict_customers c
  where c.id = new.customer_id;

  insert into public.ict_admin_notifications (
    notification_type, title, message, customer_id, ticket_id, action_url
  ) values (
    'support_ticket_created',
    'طلب دعم جديد ' || coalesce(new.ticket_no, ''),
    coalesce(v_customer_name, 'عميل') || ' فتح طلب دعم: ' || coalesce(new.subject, ''),
    new.customer_id,
    new.id,
    '/admin/support'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_support_ticket_created on public.ict_support_tickets;
create trigger trg_notify_admin_support_ticket_created
after insert on public.ict_support_tickets
for each row execute function public.notify_admin_support_ticket_created();

-- ---------------------------------------------------------
-- 2) Customer replies to a support ticket
-- ---------------------------------------------------------
create or replace function public.notify_admin_support_customer_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
  v_customer_name text;
begin
  if new.sender_type <> 'customer' or new.is_internal then
    return new;
  end if;

  select t.id, t.ticket_no, t.customer_id, t.subject
    into v_ticket
  from public.ict_support_tickets t
  where t.id = new.ticket_id;

  if v_ticket.id is null then
    return new;
  end if;

  select coalesce(c.company_name, c.name, 'عميل')
    into v_customer_name
  from public.ict_customers c
  where c.id = v_ticket.customer_id;

  insert into public.ict_admin_notifications (
    notification_type, title, message, customer_id,
    ticket_id, support_message_id, action_url
  ) values (
    'support_customer_reply',
    'رد جديد على ' || coalesce(v_ticket.ticket_no, 'طلب الدعم'),
    coalesce(v_customer_name, 'عميل') || ' أضاف ردًا على: ' || coalesce(v_ticket.subject, ''),
    v_ticket.customer_id,
    v_ticket.id,
    new.id,
    '/admin/support'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_support_customer_reply on public.ict_support_messages;
create trigger trg_notify_admin_support_customer_reply
after insert on public.ict_support_messages
for each row execute function public.notify_admin_support_customer_reply();

-- ---------------------------------------------------------
-- 3) Customer uploads a support attachment
-- ---------------------------------------------------------
create or replace function public.notify_admin_support_attachment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_sender text;
  v_ticket_no text;
begin
  select m.sender_type into v_message_sender
  from public.ict_support_messages m
  where m.id = new.message_id;

  if v_message_sender <> 'customer' then
    return new;
  end if;

  select t.ticket_no into v_ticket_no
  from public.ict_support_tickets t
  where t.id = new.ticket_id;

  insert into public.ict_admin_notifications (
    notification_type, title, message, customer_id,
    ticket_id, support_message_id, support_attachment_id, action_url
  ) values (
    'support_attachment_uploaded',
    'مرفق جديد في ' || coalesce(v_ticket_no, 'طلب الدعم'),
    'رفع العميل مستندًا للمراجعة: ' || coalesce(new.file_name, 'مرفق'),
    new.customer_id,
    new.ticket_id,
    new.message_id,
    new.id,
    '/admin/support'
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_admin_support_attachment on public.ict_support_attachments;
create trigger trg_notify_admin_support_attachment
after insert on public.ict_support_attachments
for each row execute function public.notify_admin_support_attachment();
