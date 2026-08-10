-- =========================================================
-- BASMAT ICT — Consultation to Quotation Patch
-- =========================================================

alter table public.ict_quotations
  add column if not exists consultation_id uuid
  references public.ict_consultation_requests(id)
  on delete set null;

create index if not exists idx_ict_quotations_consultation_id
  on public.ict_quotations(consultation_id);

-- One active quotation per consultation.
-- Allows historical duplicates only if already existing; run the duplicate check below first.
-- If duplicates exist, clean them before creating this unique index.

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'ux_ict_quotations_consultation_id'
  ) then
    execute '
      create unique index ux_ict_quotations_consultation_id
      on public.ict_quotations(consultation_id)
      where consultation_id is not null
    ';
  end if;
end $$;

-- Add quoted status support for consultations if your application uses strict checks elsewhere.
-- No DB enum change is required because the current column is text in the existing app.
