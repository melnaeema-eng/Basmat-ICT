-- BASMAT ICT — Invoice verification + customer acceptance
-- Safe additive migration. No deletes and no changes to quotation/customer modules.

begin;

create extension if not exists pgcrypto;

create or replace function public.ict_generate_invoice_verification_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    v_code := 'INV-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (
      select 1 from public.ict_invoices where verification_code = v_code
    );
  end loop;
  return v_code;
end;
$$;

alter table public.ict_invoices
  add column if not exists verification_token uuid,
  add column if not exists verification_code text,
  add column if not exists customer_accepted_at timestamptz,
  add column if not exists customer_accepted_by uuid;

alter table public.ict_invoices
  alter column verification_token set default gen_random_uuid(),
  alter column verification_code set default public.ict_generate_invoice_verification_code();

update public.ict_invoices
set verification_token = gen_random_uuid()
where verification_token is null;

update public.ict_invoices
set verification_code = public.ict_generate_invoice_verification_code()
where verification_code is null or btrim(verification_code) = '';

alter table public.ict_invoices
  alter column verification_token set not null,
  alter column verification_code set not null;

create unique index if not exists ux_ict_invoices_verification_token
  on public.ict_invoices(verification_token);

create unique index if not exists ux_ict_invoices_verification_code
  on public.ict_invoices(verification_code);

create or replace function public.ict_customer_accept_invoice(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_customer_id uuid;
  v_invoice public.ict_invoices%rowtype;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  v_customer_id := public.current_customer_id();
  if v_customer_id is null then
    raise exception 'Customer account is not linked';
  end if;

  select * into v_invoice
  from public.ict_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.customer_id is distinct from v_customer_id then
    raise exception 'Invoice does not belong to this customer';
  end if;

  if lower(coalesce(v_invoice.status, '')) in ('draft', 'cancelled', 'canceled') then
    raise exception 'This invoice cannot be accepted in its current status';
  end if;

  if v_invoice.customer_accepted_at is null then
    update public.ict_invoices
    set customer_accepted_at = now(),
        customer_accepted_by = v_uid,
        updated_at = now()
    where id = p_invoice_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'invoice_id', p_invoice_id,
    'accepted_at', (select customer_accepted_at from public.ict_invoices where id = p_invoice_id)
  );
end;
$$;

revoke all on function public.ict_customer_accept_invoice(uuid) from public;
grant execute on function public.ict_customer_accept_invoice(uuid) to authenticated;

create or replace function public.ict_verify_invoice(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
begin
  select
    i.invoice_no,
    i.verification_code,
    i.issue_date,
    i.due_date,
    i.status,
    i.currency,
    i.total_amount,
    i.customer_accepted_at,
    c.name as customer_name,
    c.company_name
  into q
  from public.ict_invoices i
  left join public.ict_customers c on c.id = i.customer_id
  where i.verification_token = p_token;

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'invoice_no', q.invoice_no,
    'verification_code', q.verification_code,
    'issue_date', q.issue_date,
    'due_date', q.due_date,
    'status', q.status,
    'currency', q.currency,
    'total_amount', q.total_amount,
    'customer_accepted_at', q.customer_accepted_at,
    'customer_name', q.customer_name,
    'company_name', q.company_name
  );
end;
$$;

revoke all on function public.ict_verify_invoice(uuid) from public;
grant execute on function public.ict_verify_invoice(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;

-- Health check
select
  case
    when exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ict_invoices' and column_name='verification_token'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ict_invoices' and column_name='verification_code'
    )
    and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='ict_invoices' and column_name='customer_accepted_at'
    )
    and not exists (
      select 1 from public.ict_invoices
      where verification_token is null or verification_code is null or btrim(verification_code)=''
    )
    then 'PASS'
    else 'FAIL'
  end as invoice_v1_6_health;
