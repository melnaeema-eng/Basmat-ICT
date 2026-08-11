-- =========================================================
-- BASMAT ICT — SPRINT 10
-- Project Documents & Deliverables
-- Safe to run after Sprints 1–9.2.
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists public.ict_project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ict_delivery_projects(id) on delete cascade,
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  title text not null,
  document_type text not null default 'other'
    check (document_type in ('drawing','report','boq','method_statement','invoice_attachment','other')),
  revision text not null default 'R0',
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','rejected')),
  file_name text not null,
  file_path text not null unique,
  mime_type text,
  file_size bigint,
  notes text,
  issue_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ict_project_documents_project
  on public.ict_project_documents(project_id);
create index if not exists idx_ict_project_documents_customer
  on public.ict_project_documents(customer_id);
create index if not exists idx_ict_project_documents_status
  on public.ict_project_documents(status);

alter table public.ict_project_documents enable row level security;

drop policy if exists "ICT admins manage project documents" on public.ict_project_documents;
create policy "ICT admins manage project documents"
on public.ict_project_documents
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop policy if exists "Customers read own project documents" on public.ict_project_documents;
create policy "Customers read own project documents"
on public.ict_project_documents
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
  and exists (
    select 1
    from public.ict_delivery_projects p
    where p.id = ict_project_documents.project_id
      and p.customer_id = public.current_customer_id()
  )
);

-- Private bucket for project deliverables.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-documents', 'project-documents', false, 52428800)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

-- Admins can upload/read/update/delete all objects in this bucket.
drop policy if exists "ICT admins manage project document files" on storage.objects;
create policy "ICT admins manage project document files"
on storage.objects
for all to authenticated
using (
  bucket_id = 'project-documents'
  and public.is_ict_admin()
)
with check (
  bucket_id = 'project-documents'
  and public.is_ict_admin()
);

-- Customers can only download files under their customer UUID folder.
drop policy if exists "Customers read own project document files" on storage.objects;
create policy "Customers read own project document files"
on storage.objects
for select to authenticated
using (
  bucket_id = 'project-documents'
  and public.is_customer_portal_user()
  and (storage.foldername(name))[1] = public.current_customer_id()::text
);

-- Keep updated_at current.
create or replace function public.set_ict_project_documents_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ict_project_documents_updated_at on public.ict_project_documents;
create trigger trg_ict_project_documents_updated_at
before update on public.ict_project_documents
for each row execute function public.set_ict_project_documents_updated_at();
