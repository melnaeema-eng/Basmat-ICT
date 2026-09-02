-- BASMAT ICT — QUOTATION V3: Discount + Arabic/English
-- Safe additive migration. Existing quotation fields remain intact.

begin;

alter table public.ict_quotations
  add column if not exists discount_type text not null default 'percent',
  add column if not exists discount_value numeric(14,2) not null default 0,
  add column if not exists discount_amount numeric(14,2) not null default 0,
  add column if not exists net_before_vat numeric(14,2) not null default 0,
  add column if not exists subject_ar text,
  add column if not exists subject_en text,
  add column if not exists notes_ar text,
  add column if not exists notes_en text,
  add column if not exists terms_ar text,
  add column if not exists terms_en text;

update public.ict_quotations
set
  discount_type = coalesce(nullif(discount_type, ''), 'percent'),
  discount_value = coalesce(discount_value, 0),
  discount_amount = coalesce(discount_amount, 0),
  net_before_vat = case
    when coalesce(net_before_vat, 0) = 0 and coalesce(subtotal, 0) > 0
      then greatest(0, coalesce(subtotal, 0) - coalesce(discount_amount, 0))
    else coalesce(net_before_vat, 0)
  end,
  subject_ar = coalesce(subject_ar, subject),
  notes_ar = coalesce(notes_ar, notes),
  terms_ar = coalesce(terms_ar, terms);

alter table public.ict_quotations drop constraint if exists ict_quotations_discount_type_check;
alter table public.ict_quotations
  add constraint ict_quotations_discount_type_check
  check (discount_type in ('percent','amount'));

alter table public.ict_quotations drop constraint if exists ict_quotations_discount_value_check;
alter table public.ict_quotations
  add constraint ict_quotations_discount_value_check
  check (
    (discount_type = 'percent' and discount_value between 0 and 100)
    or (discount_type = 'amount' and discount_value >= 0)
  );

alter table public.ict_quotations drop constraint if exists ict_quotations_discount_amount_check;
alter table public.ict_quotations
  add constraint ict_quotations_discount_amount_check
  check (discount_amount >= 0 and discount_amount <= subtotal);

commit;

-- HEALTH CHECK: expect PASS
select
  case when count(*) = 10 then 'PASS' else 'FAIL' end as quotation_v3_columns,
  count(*) as found_columns
from information_schema.columns
where table_schema='public'
  and table_name='ict_quotations'
  and column_name in (
    'discount_type','discount_value','discount_amount','net_before_vat',
    'subject_ar','subject_en','notes_ar','notes_en','terms_ar','terms_en'
  );

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end as quotation_v3_data_integrity,
  count(*) as invalid_rows
from public.ict_quotations
where discount_type not in ('percent','amount')
   or discount_value < 0
   or (discount_type = 'percent' and discount_value > 100)
   or discount_amount < 0
   or discount_amount > subtotal;
