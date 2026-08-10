
-- =========================================================
-- BASMAT ICT — SPRINT 8 UNIFIED CUSTOMER & PROJECT WORKFLOW
-- Builds on Sprint 6 + 7 + 7.1
-- =========================================================

create extension if not exists pgcrypto;

-- 1) Customer ownership on requests
alter table public.ict_rfq_requests
  add column if not exists customer_id uuid references public.ict_customers(id) on delete set null;

alter table public.ict_consultation_requests
  add column if not exists customer_id uuid references public.ict_customers(id) on delete set null;

create index if not exists idx_rfq_customer_id
  on public.ict_rfq_requests(customer_id);

create index if not exists idx_consultation_customer_id
  on public.ict_consultation_requests(customer_id);

-- 2) Operational project source tracking
alter table public.ict_delivery_projects
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists rfq_id uuid references public.ict_rfq_requests(id) on delete set null,
  add column if not exists consultation_id uuid references public.ict_consultation_requests(id) on delete set null;

create index if not exists idx_delivery_project_quotation
  on public.ict_delivery_projects(quotation_id);

-- 3) NDA workflow
create table if not exists public.ict_nda_requests (
  id uuid primary key default gen_random_uuid(),
  nda_no text not null unique,
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  source_type text not null check (source_type in ('rfq','consultation')),
  source_id uuid not null,
  request_no text,
  recipient_email text not null,
  recipient_name text,
  status text not null default 'pending'
    check (status in ('pending','sent','accepted','declined','cancelled')),
  nda_text text not null,
  sent_at timestamptz,
  accepted_at timestamptz,
  signer_name text,
  signer_email text,
  consent_text text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nda_customer on public.ict_nda_requests(customer_id);
create index if not exists idx_nda_source on public.ict_nda_requests(source_type, source_id);

alter table public.ict_nda_requests enable row level security;

drop policy if exists "Customers read own NDAs" on public.ict_nda_requests;
create policy "Customers read own NDAs"
on public.ict_nda_requests
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "ICT admins manage NDAs" on public.ict_nda_requests;
create policy "ICT admins manage NDAs"
on public.ict_nda_requests
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

-- 4) Existing Auth user -> CRM/Portal profile automatically.
create or replace function public.ensure_customer_portal_profile()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_customer_id uuid;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  select lower(email),
         nullif(trim(raw_user_meta_data->>'full_name'),'')
  into v_email, v_name
  from auth.users
  where id = v_uid;

  if v_email is null then
    raise exception 'Authenticated user has no email';
  end if;

  select customer_id into v_customer_id
  from public.ict_customer_portal_users
  where user_id = v_uid
    and is_active = true
  limit 1;

  if v_customer_id is not null then
    return v_customer_id;
  end if;

  select id into v_customer_id
  from public.ict_customers
  where lower(email) = v_email
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.ict_customers (
      name, company_name, email, phone
    )
    select
      coalesce(v_name, split_part(v_email,'@',1)),
      nullif(trim(raw_user_meta_data->>'company_name'),''),
      v_email,
      nullif(trim(raw_user_meta_data->>'phone'),'')
    from auth.users
    where id = v_uid
    returning id into v_customer_id;
  end if;

  insert into public.ict_customer_portal_users (
    user_id, customer_id, full_name, email, is_active
  )
  values (
    v_uid,
    v_customer_id,
    coalesce(v_name, split_part(v_email,'@',1)),
    v_email,
    true
  )
  on conflict (user_id) do update
  set customer_id = excluded.customer_id,
      full_name = coalesce(public.ict_customer_portal_users.full_name, excluded.full_name),
      email = excluded.email,
      is_active = true,
      updated_at = now();

  return v_customer_id;
end;
$$;

revoke all on function public.ensure_customer_portal_profile() from public;
grant execute on function public.ensure_customer_portal_profile() to authenticated;

-- 5) Keep self-registration trigger idempotent.
create or replace function public.handle_portal_customer_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_is_portal boolean;
begin
  v_is_portal := coalesce((new.raw_user_meta_data->>'portal_customer')::boolean, false);

  if not v_is_portal then
    return new;
  end if;

  select id into v_customer_id
  from public.ict_customers
  where lower(email) = lower(new.email)
  order by created_at asc
  limit 1;

  if v_customer_id is null then
    insert into public.ict_customers (name, company_name, email, phone)
    values (
      nullif(trim(new.raw_user_meta_data->>'full_name'),''),
      nullif(trim(new.raw_user_meta_data->>'company_name'),''),
      lower(new.email),
      nullif(trim(new.raw_user_meta_data->>'phone'),'')
    )
    returning id into v_customer_id;
  end if;

  insert into public.ict_customer_portal_users (
    user_id, customer_id, full_name, email, is_active
  )
  values (
    new.id,
    v_customer_id,
    nullif(trim(new.raw_user_meta_data->>'full_name'),''),
    lower(new.email),
    true
  )
  on conflict (user_id) do update
  set customer_id = excluded.customer_id,
      full_name = excluded.full_name,
      email = excluded.email,
      is_active = true,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_portal_customer_signup on auth.users;
create trigger on_portal_customer_signup
after insert on auth.users
for each row execute function public.handle_portal_customer_signup();

-- 6) Customer RLS on RFQ and consultations
alter table public.ict_rfq_requests enable row level security;
alter table public.ict_consultation_requests enable row level security;

drop policy if exists "Customers insert own RFQs" on public.ict_rfq_requests;
create policy "Customers insert own RFQs"
on public.ict_rfq_requests
for insert to authenticated
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers read own RFQs" on public.ict_rfq_requests;
create policy "Customers read own RFQs"
on public.ict_rfq_requests
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers insert own consultations" on public.ict_consultation_requests;
create policy "Customers insert own consultations"
on public.ict_consultation_requests
for insert to authenticated
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers read own consultations" on public.ict_consultation_requests;
create policy "Customers read own consultations"
on public.ict_consultation_requests
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

-- 7) Create NDA from a customer-owned request
create or replace function public.create_customer_nda(
  p_source_type text,
  p_source_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.current_customer_id();
  v_email text;
  v_name text;
  v_request_no text;
  v_required boolean;
  v_nda_id uuid;
  v_existing uuid;
begin
  if v_customer_id is null then
    raise exception 'Customer portal access required';
  end if;

  if p_source_type = 'rfq' then
    select email, full_name, request_no, nda_required
    into v_email, v_name, v_request_no, v_required
    from public.ict_rfq_requests
    where id = p_source_id and customer_id = v_customer_id;
  elsif p_source_type = 'consultation' then
    select email, full_name, request_no, nda_required
    into v_email, v_name, v_request_no, v_required
    from public.ict_consultation_requests
    where id = p_source_id and customer_id = v_customer_id;
  else
    raise exception 'Invalid NDA source type';
  end if;

  if v_request_no is null then
    raise exception 'Request not found or access denied';
  end if;

  if not coalesce(v_required,false) then
    raise exception 'NDA was not requested';
  end if;

  select id into v_existing
  from public.ict_nda_requests
  where source_type = p_source_type and source_id = p_source_id
  order by created_at desc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  insert into public.ict_nda_requests (
    nda_no,
    customer_id,
    source_type,
    source_id,
    request_no,
    recipient_email,
    recipient_name,
    nda_text
  )
  values (
    'NDA-' || extract(year from now())::int || '-' || right(replace(gen_random_uuid()::text,'-',''),8),
    v_customer_id,
    p_source_type,
    p_source_id,
    v_request_no,
    lower(v_email),
    v_name,
    'اتفاقية عدم الإفصاح وسرية المعلومات: يلتزم الطرفان بالمحافظة على سرية جميع المعلومات والمخططات والمستندات والبيانات الفنية والتجارية المتبادلة لغرض دراسة الطلب أو تنفيذ الأعمال، وعدم إفشائها أو استخدامها لغير الغرض المتفق عليه إلا بموافقة خطية أو إذا تطلب النظام ذلك. يستمر الالتزام بالسرية بعد انتهاء التعامل وفق ما يتم الاتفاق عليه بين الطرفين.'
  )
  returning id into v_nda_id;

  return v_nda_id;
end;
$$;

revoke all on function public.create_customer_nda(text,uuid) from public;
grant execute on function public.create_customer_nda(text,uuid) to authenticated;

-- 8) Customer accepts NDA
create or replace function public.accept_customer_nda(
  p_nda_id uuid,
  p_signer_name text,
  p_user_agent text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid := public.current_customer_id();
  v_email text;
begin
  if v_customer_id is null then
    raise exception 'Customer portal access required';
  end if;

  select recipient_email into v_email
  from public.ict_nda_requests
  where id = p_nda_id
    and customer_id = v_customer_id
    and status in ('pending','sent');

  if v_email is null then
    raise exception 'NDA not found, already processed, or access denied';
  end if;

  update public.ict_nda_requests
  set status = 'accepted',
      accepted_at = now(),
      signer_name = trim(p_signer_name),
      signer_email = v_email,
      consent_text = 'أقر بأنني مخول بالموافقة على اتفاقية عدم الإفصاح وأن إدخال اسمي والضغط على زر الموافقة يمثل قبولي الإلكتروني لمحتوى الاتفاقية.',
      user_agent = p_user_agent,
      updated_at = now()
  where id = p_nda_id;

  return true;
end;
$$;

revoke all on function public.accept_customer_nda(uuid,text,text) from public;
grant execute on function public.accept_customer_nda(uuid,text,text) to authenticated;

-- 9) Admin converts an accepted quotation to an operational project
create or replace function public.convert_quotation_to_project(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_q public.ict_quotations%rowtype;
  v_rfq_id uuid;
begin
  if not public.is_ict_admin() then
    raise exception 'Admin access required';
  end if;

  select * into v_q
  from public.ict_quotations
  where id = p_quotation_id;

  if v_q.id is null then
    raise exception 'Quotation not found';
  end if;

  if v_q.status <> 'accepted' then
    raise exception 'Only accepted quotations can be converted to projects';
  end if;

  if v_q.customer_id is null then
    raise exception 'Quotation must be linked to a CRM customer';
  end if;

  select id into v_project_id
  from public.ict_delivery_projects
  where quotation_id = p_quotation_id
  limit 1;

  if v_project_id is not null then
    return v_project_id;
  end if;

  v_rfq_id := v_q.rfq_id;

  insert into public.ict_delivery_projects (
    project_no,
    customer_id,
    quotation_id,
    rfq_id,
    source_type,
    source_id,
    project_name,
    status,
    progress,
    contract_value,
    scope,
    created_by
  )
  values (
    'PRJ-' || extract(year from now())::int || '-' || right(replace(gen_random_uuid()::text,'-',''),7),
    v_q.customer_id,
    v_q.id,
    v_rfq_id,
    case when v_rfq_id is not null then 'rfq' else 'quotation' end,
    coalesce(v_rfq_id, v_q.id),
    coalesce(v_q.subject, 'مشروع ' || v_q.quotation_no),
    'planning',
    0,
    coalesce(v_q.total_amount,0),
    v_q.notes,
    auth.uid()
  )
  returning id into v_project_id;

  return v_project_id;
end;
$$;

revoke all on function public.convert_quotation_to_project(uuid) from public;
grant execute on function public.convert_quotation_to_project(uuid) to authenticated;

-- 10) Backfill ownership by email where safe
update public.ict_rfq_requests r
set customer_id = c.id
from public.ict_customers c
where r.customer_id is null
  and r.email is not null
  and c.email is not null
  and lower(r.email)=lower(c.email);

update public.ict_consultation_requests r
set customer_id = c.id
from public.ict_customers c
where r.customer_id is null
  and r.email is not null
  and c.email is not null
  and lower(r.email)=lower(c.email);

update public.ict_quotations q
set customer_id = r.customer_id
from public.ict_rfq_requests r
where q.rfq_id = r.id
  and q.customer_id is null
  and r.customer_id is not null;
