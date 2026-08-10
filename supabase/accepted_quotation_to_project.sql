-- =========================================================
-- BASMAT ICT — Accepted Quotation -> Delivery Project
-- =========================================================

alter table public.ict_delivery_projects
  add column if not exists rfq_id uuid
    references public.ict_rfq_requests(id)
    on delete set null,
  add column if not exists consultation_id uuid
    references public.ict_consultation_requests(id)
    on delete set null,
  add column if not exists source_type text,
  add column if not exists source_id uuid;

create index if not exists idx_delivery_projects_customer
  on public.ict_delivery_projects(customer_id);

create index if not exists idx_delivery_projects_quotation
  on public.ict_delivery_projects(quotation_id);

-- Prevent the same quotation from becoming two operational projects.
create unique index if not exists ux_delivery_projects_quotation
  on public.ict_delivery_projects(quotation_id)
  where quotation_id is not null;

alter table public.ict_delivery_projects enable row level security;

drop policy if exists "Customers read own delivery projects"
  on public.ict_delivery_projects;

create policy "Customers read own delivery projects"
on public.ict_delivery_projects
for select
to authenticated
using (
  public.is_customer_portal_user()
  and customer_id = public.current_customer_id()
);

-- Admin conversion RPC.
drop function if exists public.convert_quotation_to_project(uuid);

create function public.convert_quotation_to_project(
  p_quotation_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_customer_id uuid;
  v_rfq_id uuid;
  v_consultation_id uuid;
  v_quotation_no text;
  v_subject text;
  v_notes text;
  v_total numeric;
  v_status text;
begin
  if not public.is_ict_admin() then
    raise exception 'Admin access required';
  end if;

  select
    q.customer_id,
    q.rfq_id,
    q.consultation_id,
    q.quotation_no,
    q.subject,
    q.notes,
    q.total_amount,
    q.status
  into
    v_customer_id,
    v_rfq_id,
    v_consultation_id,
    v_quotation_no,
    v_subject,
    v_notes,
    v_total,
    v_status
  from public.ict_quotations q
  where q.id = p_quotation_id;

  if v_quotation_no is null then
    raise exception 'Quotation not found';
  end if;

  if v_status <> 'accepted' then
    raise exception 'Only accepted quotations can be converted to projects';
  end if;

  if v_customer_id is null then
    raise exception 'Accepted quotation must be linked to a CRM customer';
  end if;

  select id
  into v_project_id
  from public.ict_delivery_projects
  where quotation_id = p_quotation_id
  limit 1;

  if v_project_id is not null then
    return v_project_id;
  end if;

  insert into public.ict_delivery_projects (
    project_no,
    project_name,
    customer_id,
    quotation_id,
    rfq_id,
    consultation_id,
    source_type,
    source_id,
    contract_value,
    status,
    progress,
    scope,
    created_by
  )
  values (
    'PRJ-' ||
      extract(year from now())::int ||
      '-' ||
      right(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        7
      ),
    coalesce(
      nullif(trim(v_subject), ''),
      'مشروع ' || v_quotation_no
    ),
    v_customer_id,
    p_quotation_id,
    v_rfq_id,
    v_consultation_id,
    case
      when v_rfq_id is not null
        then 'rfq'
      when v_consultation_id is not null
        then 'consultation'
      else 'quotation'
    end,
    coalesce(
      v_rfq_id,
      v_consultation_id,
      p_quotation_id
    ),
    coalesce(v_total, 0),
    'planning',
    0,
    v_notes,
    auth.uid()
  )
  returning id
  into v_project_id;

  return v_project_id;
end;
$$;

grant execute
on function public.convert_quotation_to_project(uuid)
to authenticated;
