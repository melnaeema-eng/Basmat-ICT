-- =========================================================
-- BASMAT ICT — SPRINT 4
-- Quotations + Notifications + Analytics
-- Run AFTER Sprint 3.
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Quotations
create table if not exists public.ict_quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_no text not null unique,
  rfq_id uuid references public.ict_rfq_requests(id) on delete set null,
  customer_name text not null,
  company_name text,
  customer_email text,
  customer_phone text,
  subject text,
  currency text not null default 'SAR',
  tax_rate numeric(6,2) not null default 15,
  subtotal numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  validity_days integer not null default 15,
  items jsonb not null default '[]'::jsonb,
  notes text,
  terms text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired', 'cancelled')),
  sent_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ict_quotations_rfq
on public.ict_quotations(rfq_id);

create index if not exists idx_ict_quotations_created
on public.ict_quotations(created_at desc);

alter table public.ict_quotations enable row level security;

drop policy if exists "ICT admins manage quotations"
on public.ict_quotations;

create policy "ICT admins manage quotations"
on public.ict_quotations
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- 2) In-app notifications
create table if not exists public.ict_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  message text,
  entity_type text,
  entity_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ict_notifications_unread
on public.ict_notifications(is_read, created_at desc);

alter table public.ict_notifications enable row level security;

drop policy if exists "ICT admins manage notifications"
on public.ict_notifications;

create policy "ICT admins manage notifications"
on public.ict_notifications
for all
to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- 3) Notification triggers for new RFQ / Consultation
create or replace function public.notify_new_rfq()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_notifications (
    notification_type,
    title,
    message,
    entity_type,
    entity_id
  )
  values (
    'new_rfq',
    'طلب عرض سعر جديد',
    coalesce(new.request_no, '') || ' - ' || coalesce(new.full_name, ''),
    'rfq',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_new_rfq
on public.ict_rfq_requests;

create trigger trg_notify_new_rfq
after insert on public.ict_rfq_requests
for each row
execute function public.notify_new_rfq();

create or replace function public.notify_new_consultation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_notifications (
    notification_type,
    title,
    message,
    entity_type,
    entity_id
  )
  values (
    'new_consultation',
    'طلب استشارة جديد',
    coalesce(new.request_no, '') || ' - ' || coalesce(new.full_name, ''),
    'consultation',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_new_consultation
on public.ict_consultation_requests;

create trigger trg_notify_new_consultation
after insert on public.ict_consultation_requests
for each row
execute function public.notify_new_consultation();

-- 4) Trigger notification when quotation is created
create or replace function public.notify_new_quotation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ict_notifications (
    notification_type,
    title,
    message,
    entity_type,
    entity_id
  )
  values (
    'quotation_created',
    'تم إنشاء عرض سعر',
    new.quotation_no || ' - ' || new.customer_name,
    'quotation',
    new.id
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_new_quotation
on public.ict_quotations;

create trigger trg_notify_new_quotation
after insert on public.ict_quotations
for each row
execute function public.notify_new_quotation();
