-- =========================================================
-- BASMAT ICT — SPRINT 12
-- Unified Notifications & Activity Center
-- Run AFTER Sprint 11.3.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1) Extend admin notifications for unified filtering
-- ---------------------------------------------------------
alter table public.ict_admin_notifications
  add column if not exists category text not null default 'general',
  add column if not exists priority text not null default 'normal';

create index if not exists idx_ict_admin_notifications_category
  on public.ict_admin_notifications(category, created_at desc);
create index if not exists idx_ict_admin_notifications_unread
  on public.ict_admin_notifications(is_read, created_at desc);

update public.ict_admin_notifications
set category = case
  when notification_type like 'support_%' then 'support'
  when notification_type like 'quotation_%' then 'sales'
  else coalesce(nullif(category, ''), 'general')
end
where category is null or category = 'general';

-- ---------------------------------------------------------
-- 2) Customer notification center
-- ---------------------------------------------------------
create table if not exists public.ict_customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  notification_type text not null,
  category text not null default 'general',
  priority text not null default 'normal',
  title text not null,
  message text,
  entity_type text,
  entity_id uuid,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_ict_customer_notifications_customer
  on public.ict_customer_notifications(customer_id, created_at desc);
create index if not exists idx_ict_customer_notifications_unread
  on public.ict_customer_notifications(customer_id, is_read, created_at desc);

alter table public.ict_customer_notifications enable row level security;

drop policy if exists "ICT admins manage customer notifications" on public.ict_customer_notifications;
create policy "ICT admins manage customer notifications"
on public.ict_customer_notifications
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "Customers read own notifications" on public.ict_customer_notifications;
create policy "Customers read own notifications"
on public.ict_customer_notifications
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers update own notifications" on public.ict_customer_notifications;
create policy "Customers update own notifications"
on public.ict_customer_notifications
for update to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
)
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

-- ---------------------------------------------------------
-- 3) Admin notifications: RFQ + Consultation
-- ---------------------------------------------------------
create or replace function public.s12_notify_admin_new_rfq()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_admin_notifications (
    notification_type, category, priority, title, message,
    customer_id, action_url
  ) values (
    'rfq_created', 'sales', 'high', 'طلب عرض سعر جديد',
    coalesce(new.request_no, '') || case when new.full_name is not null then ' - ' || new.full_name else '' end,
    new.customer_id, '/admin/rfqs'
  );
  return new;
end;
$$;

drop trigger if exists trg_s12_notify_admin_new_rfq on public.ict_rfq_requests;
create trigger trg_s12_notify_admin_new_rfq
after insert on public.ict_rfq_requests
for each row execute function public.s12_notify_admin_new_rfq();

create or replace function public.s12_notify_admin_new_consultation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_admin_notifications (
    notification_type, category, priority, title, message,
    customer_id, action_url
  ) values (
    'consultation_created', 'sales', 'normal', 'طلب استشارة جديد',
    coalesce(new.request_no, '') || case when new.full_name is not null then ' - ' || new.full_name else '' end,
    new.customer_id, '/admin/consultations'
  );
  return new;
end;
$$;

drop trigger if exists trg_s12_notify_admin_new_consultation on public.ict_consultation_requests;
create trigger trg_s12_notify_admin_new_consultation
after insert on public.ict_consultation_requests
for each row execute function public.s12_notify_admin_new_consultation();

-- ---------------------------------------------------------
-- 4) Customer: quotation becomes sent
-- ---------------------------------------------------------
create or replace function public.s12_notify_customer_quotation_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then return new; end if;

  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    insert into public.ict_customer_notifications (
      customer_id, notification_type, category, priority,
      title, message, entity_type, entity_id, action_url
    ) values (
      new.customer_id, 'quotation_sent', 'sales', 'high',
      'عرض سعر جديد ' || coalesce(new.quotation_no, ''),
      coalesce(new.subject, 'تم إصدار عرض سعر جديد لحسابك.'),
      'quotation', new.id, '/portal/quotations/' || new.id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_s12_customer_quotation_sent on public.ict_quotations;
create trigger trg_s12_customer_quotation_sent
after insert or update of status on public.ict_quotations
for each row execute function public.s12_notify_customer_quotation_sent();

-- ---------------------------------------------------------
-- 5) Customer: new project created
-- ---------------------------------------------------------
create or replace function public.s12_notify_customer_project_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then return new; end if;
  insert into public.ict_customer_notifications (
    customer_id, notification_type, category, title, message,
    entity_type, entity_id, action_url
  ) values (
    new.customer_id, 'project_created', 'projects',
    'تم إنشاء مشروعك ' || coalesce(new.project_no, ''),
    coalesce(new.project_name, 'تمت إضافة مشروع جديد إلى بوابتك.'),
    'project', new.id, '/portal/projects'
  );
  return new;
end;
$$;

drop trigger if exists trg_s12_customer_project_created on public.ict_delivery_projects;
create trigger trg_s12_customer_project_created
after insert on public.ict_delivery_projects
for each row execute function public.s12_notify_customer_project_created();

-- ---------------------------------------------------------
-- 6) Customer: new project document
-- ---------------------------------------------------------
create or replace function public.s12_notify_customer_project_document()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_customer_notifications (
    customer_id, notification_type, category, title, message,
    entity_type, entity_id, action_url
  ) values (
    new.customer_id, 'project_document_added', 'projects',
    'مستند مشروع جديد',
    coalesce(new.title, new.file_name, 'تمت إضافة مستند جديد للمشروع.') || ' — ' || coalesce(new.revision, 'R0'),
    'project_document', new.id, '/portal/documents'
  );
  return new;
end;
$$;

drop trigger if exists trg_s12_customer_project_document on public.ict_project_documents;
create trigger trg_s12_customer_project_document
after insert on public.ict_project_documents
for each row execute function public.s12_notify_customer_project_document();

-- ---------------------------------------------------------
-- 7) Customer: invoice issued
-- ---------------------------------------------------------
create or replace function public.s12_notify_customer_invoice_issued()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null then return new; end if;

  if new.status = 'issued' and (tg_op = 'INSERT' or old.status is distinct from 'issued') then
    insert into public.ict_customer_notifications (
      customer_id, notification_type, category, priority,
      title, message, entity_type, entity_id, action_url
    ) values (
      new.customer_id, 'invoice_issued', 'finance', 'high',
      'فاتورة جديدة ' || coalesce(new.invoice_no, ''),
      'تم إصدار فاتورة جديدة بقيمة ' || coalesce(new.total_amount::text, '0') || ' ' || coalesce(new.currency, 'SAR'),
      'invoice', new.id, '/portal/invoices'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_s12_customer_invoice_issued on public.ict_invoices;
create trigger trg_s12_customer_invoice_issued
after insert or update of status on public.ict_invoices
for each row execute function public.s12_notify_customer_invoice_issued();

-- ---------------------------------------------------------
-- 8) Customer: admin reply to support ticket
-- ---------------------------------------------------------
create or replace function public.s12_notify_customer_support_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket record;
begin
  if new.sender_type <> 'admin' or new.is_internal then return new; end if;

  select id, customer_id, ticket_no, subject
    into v_ticket
  from public.ict_support_tickets
  where id = new.ticket_id;

  if v_ticket.id is null then return new; end if;

  insert into public.ict_customer_notifications (
    customer_id, notification_type, category, priority,
    title, message, entity_type, entity_id, action_url
  ) values (
    v_ticket.customer_id, 'support_admin_reply', 'support', 'high',
    'رد جديد على ' || coalesce(v_ticket.ticket_no, 'طلب الدعم'),
    coalesce(v_ticket.subject, 'لديك رد جديد من فريق الدعم.'),
    'support_ticket', v_ticket.id, '/portal/support'
  );

  return new;
end;
$$;

drop trigger if exists trg_s12_customer_support_reply on public.ict_support_messages;
create trigger trg_s12_customer_support_reply
after insert on public.ict_support_messages
for each row execute function public.s12_notify_customer_support_reply();

-- ---------------------------------------------------------
-- 9) Helpful grants
-- ---------------------------------------------------------
grant select, update on public.ict_customer_notifications to authenticated;
