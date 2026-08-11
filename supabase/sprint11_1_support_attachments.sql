-- =========================================================
-- BASMAT ICT — SPRINT 11.1
-- Support Ticket Attachments
-- Run after Sprint 11.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.ict_support_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.ict_support_tickets(id) on delete cascade,
  message_id uuid not null references public.ict_support_messages(id) on delete cascade,
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  file_size bigint,
  uploaded_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists idx_ict_support_attachments_ticket
  on public.ict_support_attachments(ticket_id, created_at);
create index if not exists idx_ict_support_attachments_message
  on public.ict_support_attachments(message_id);
create index if not exists idx_ict_support_attachments_customer
  on public.ict_support_attachments(customer_id);

alter table public.ict_support_attachments enable row level security;

drop policy if exists "ICT admins manage support attachments" on public.ict_support_attachments;
create policy "ICT admins manage support attachments"
on public.ict_support_attachments
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "Customers read own support attachments" on public.ict_support_attachments;
create policy "Customers read own support attachments"
on public.ict_support_attachments
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
  and exists (
    select 1 from public.ict_support_tickets t
    where t.id = ict_support_attachments.ticket_id
      and t.customer_id = public.current_customer_id()
  )
);

drop policy if exists "Customers create own support attachments" on public.ict_support_attachments;
create policy "Customers create own support attachments"
on public.ict_support_attachments
for insert to authenticated
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
  and exists (
    select 1 from public.ict_support_tickets t
    where t.id = ict_support_attachments.ticket_id
      and t.customer_id = public.current_customer_id()
  )
  and exists (
    select 1 from public.ict_support_messages m
    where m.id = ict_support_attachments.message_id
      and m.ticket_id = ict_support_attachments.ticket_id
      and m.sender_type = 'customer'
      and m.is_internal = false
  )
);

-- Private bucket. 25 MB max per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('support-attachments', 'support-attachments', false, 26214400)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "ICT admins manage support attachment files" on storage.objects;
create policy "ICT admins manage support attachment files"
on storage.objects
for all to authenticated
using (
  bucket_id = 'support-attachments'
  and public.is_ict_admin()
)
with check (
  bucket_id = 'support-attachments'
  and public.is_ict_admin()
);

drop policy if exists "Customers read own support attachment files" on storage.objects;
create policy "Customers read own support attachment files"
on storage.objects
for select to authenticated
using (
  bucket_id = 'support-attachments'
  and public.is_customer_portal_user()
  and (storage.foldername(name))[1] = public.current_customer_id()::text
);

drop policy if exists "Customers upload own support attachment files" on storage.objects;
create policy "Customers upload own support attachment files"
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'support-attachments'
  and public.is_customer_portal_user()
  and (storage.foldername(name))[1] = public.current_customer_id()::text
);
