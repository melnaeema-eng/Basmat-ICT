-- Basmat ICT - Admin Documents Visibility Hotfix
-- Temporary bridge until the full authenticated Admin Sprint is installed.
-- Does NOT delete or modify RFQ/consultation data.

-- 1) Allow the current web app to read the request rows that contain attachments.
alter table if exists public.ict_rfq_requests enable row level security;
alter table if exists public.ict_consultation_requests enable row level security;

drop policy if exists "Temporary read RFQ documents" on public.ict_rfq_requests;
create policy "Temporary read RFQ documents"
on public.ict_rfq_requests
for select
to anon, authenticated
using (true);

drop policy if exists "Temporary read consultation documents" on public.ict_consultation_requests;
create policy "Temporary read consultation documents"
on public.ict_consultation_requests
for select
to anon, authenticated
using (true);

-- 2) Allow reading files from the existing engineering-documents bucket.
-- This is temporary until Admin Authentication replaces it with admin-only access.
drop policy if exists "Temporary read engineering documents" on storage.objects;
create policy "Temporary read engineering documents"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'engineering-documents');
