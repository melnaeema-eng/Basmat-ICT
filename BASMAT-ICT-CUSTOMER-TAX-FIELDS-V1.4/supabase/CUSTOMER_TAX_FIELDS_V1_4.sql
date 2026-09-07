-- BASMAT ICT - CUSTOMER TAX FIELDS V1.4
-- Safe / idempotent migration

begin;

alter table public.ict_customers
  add column if not exists vat_number text,
  add column if not exists cr_number text,
  add column if not exists billing_address text;

comment on column public.ict_customers.vat_number is 'Customer VAT registration number (Saudi VAT numbers are 15 digits when provided).';
comment on column public.ict_customers.cr_number is 'Customer commercial registration number.';
comment on column public.ict_customers.billing_address is 'Customer billing / registered address.';

commit;

notify pgrst, 'reload schema';

-- HEALTH CHECK
select
  case when count(*) = 3 then 'PASS' else 'FAIL' end as customer_tax_fields_health,
  string_agg(column_name, ', ' order by column_name) as detected_columns
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ict_customers'
  and column_name in ('vat_number', 'cr_number', 'billing_address');
