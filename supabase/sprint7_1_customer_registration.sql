-- Sprint 7.1: Customer self-registration + RFQ ownership
alter table public.ict_rfq_requests
  add column if not exists customer_id uuid references public.ict_customers(id) on delete set null;

create index if not exists idx_ict_rfq_requests_customer_id
on public.ict_rfq_requests(customer_id);

-- Automatically create CRM customer + portal mapping after customer sign-up.
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

  insert into public.ict_customers (
    name,
    company_name,
    email,
    phone
  )
  values (
    nullif(trim(new.raw_user_meta_data->>'full_name'),''),
    nullif(trim(new.raw_user_meta_data->>'company_name'),''),
    lower(new.email),
    nullif(trim(new.raw_user_meta_data->>'phone'),'')
  )
  returning id into v_customer_id;

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

alter table public.ict_rfq_requests enable row level security;

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

-- Existing admin policies remain unchanged.
