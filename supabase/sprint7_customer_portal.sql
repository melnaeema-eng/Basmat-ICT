
create extension if not exists pgcrypto;

create table if not exists public.ict_customer_portal_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  full_name text,
  email text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ict_customer_portal_users enable row level security;

drop policy if exists "Customer reads own portal profile" on public.ict_customer_portal_users;
create policy "Customer reads own portal profile"
on public.ict_customer_portal_users
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "ICT admins manage portal users" on public.ict_customer_portal_users;
create policy "ICT admins manage portal users"
on public.ict_customer_portal_users
for all to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

create or replace function public.current_customer_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select customer_id
  from public.ict_customer_portal_users
  where user_id = auth.uid()
    and is_active = true
  limit 1;
$$;

revoke all on function public.current_customer_id() from public;
grant execute on function public.current_customer_id() to authenticated;

create or replace function public.is_customer_portal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ict_customer_portal_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

revoke all on function public.is_customer_portal_user() from public;
grant execute on function public.is_customer_portal_user() to authenticated;

alter table public.ict_quotations
  add column if not exists customer_id uuid
  references public.ict_customers(id) on delete set null;

create index if not exists idx_ict_quotations_customer
on public.ict_quotations(customer_id);

create table if not exists public.ict_quotation_approvals (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.ict_quotations(id) on delete cascade,
  customer_id uuid not null references public.ict_customers(id) on delete cascade,
  portal_user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('accepted','rejected')),
  signer_name text not null,
  signer_email text,
  rejection_reason text,
  consent_text text not null,
  user_agent text,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.ict_quotation_approvals enable row level security;

drop policy if exists "Customer reads own quotation approvals" on public.ict_quotation_approvals;
create policy "Customer reads own quotation approvals"
on public.ict_quotation_approvals
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customer inserts own quotation approvals" on public.ict_quotation_approvals;
create policy "Customer inserts own quotation approvals"
on public.ict_quotation_approvals
for insert to authenticated
with check (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
  and portal_user_id = auth.uid()
);

drop policy if exists "ICT admins read quotation approvals" on public.ict_quotation_approvals;
create policy "ICT admins read quotation approvals"
on public.ict_quotation_approvals
for select to authenticated
using (public.is_ict_admin());

drop policy if exists "Customers read own quotations" on public.ict_quotations;
create policy "Customers read own quotations"
on public.ict_quotations
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers read own delivery projects" on public.ict_delivery_projects;
create policy "Customers read own delivery projects"
on public.ict_delivery_projects
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers read own delivery invoices" on public.ict_delivery_invoices;
create policy "Customers read own delivery invoices"
on public.ict_delivery_invoices
for select to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

drop policy if exists "Customers read own delivery payments" on public.ict_delivery_payments;
create policy "Customers read own delivery payments"
on public.ict_delivery_payments
for select to authenticated
using (
  public.is_customer_portal_user()
  and exists (
    select 1
    from public.ict_delivery_projects p
    where p.id = ict_delivery_payments.project_id
      and p.customer_id = public.current_customer_id()
  )
);

create or replace function public.customer_decide_quotation(
  p_quotation_id uuid,
  p_decision text,
  p_signer_name text,
  p_signer_email text default null,
  p_rejection_reason text default null,
  p_consent_text text default 'I confirm that I am authorized to make this decision on behalf of the customer.',
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_approval_id uuid;
begin
  v_customer_id := public.current_customer_id();

  if v_customer_id is null then
    raise exception 'Customer portal access required';
  end if;

  if p_decision not in ('accepted','rejected') then
    raise exception 'Invalid decision';
  end if;

  if not exists (
    select 1 from public.ict_quotations
    where id = p_quotation_id
      and customer_id = v_customer_id
  ) then
    raise exception 'Quotation not found or access denied';
  end if;

  insert into public.ict_quotation_approvals (
    quotation_id, customer_id, portal_user_id, decision,
    signer_name, signer_email, rejection_reason, consent_text, user_agent
  )
  values (
    p_quotation_id, v_customer_id, auth.uid(), p_decision,
    trim(p_signer_name), nullif(trim(p_signer_email),''),
    nullif(trim(p_rejection_reason),''), p_consent_text, p_user_agent
  )
  returning id into v_approval_id;

  update public.ict_quotations
  set status = case when p_decision='accepted' then 'accepted' else 'rejected' end,
      updated_at = now()
  where id = p_quotation_id;

  insert into public.ict_notifications (
    notification_type, title, message, entity_type, entity_id
  )
  values (
    'quotation_' || p_decision,
    case when p_decision='accepted' then 'تم قبول عرض سعر' else 'تم رفض عرض سعر' end,
    coalesce((select quotation_no from public.ict_quotations where id=p_quotation_id),'')
      || ' - ' || trim(p_signer_name),
    'quotation', p_quotation_id
  );

  return v_approval_id;
end;
$$;

revoke all on function public.customer_decide_quotation(uuid,text,text,text,text,text,text) from public;
grant execute on function public.customer_decide_quotation(uuid,text,text,text,text,text,text) to authenticated;

update public.ict_quotations q
set customer_id = c.id
from public.ict_customers c
where q.customer_id is null
  and q.customer_email is not null
  and c.email is not null
  and lower(q.customer_email)=lower(c.email);
