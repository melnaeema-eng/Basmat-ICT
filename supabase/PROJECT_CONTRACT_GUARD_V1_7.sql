-- =============================================================
-- BASMAT ICT — PROJECT / CONTRACT GUARD V1.7
-- Purpose:
--   1) Make create_contract_from_project idempotent.
--   2) Prevent accidental duplicate live contracts per project.
--   3) Accept a draft contract and activate its project.
--   4) Safely archive duplicate contracts only when no FK-linked rows exist.
-- Safe: no automatic deletion of existing contracts/projects.
-- =============================================================

begin;

-- Precheck core tables.
do $$
begin
  if to_regclass('public.ict_delivery_projects') is null then
    raise exception 'PRECHECK FAIL: public.ict_delivery_projects is missing';
  end if;

  if to_regclass('public.ict_contracts') is null then
    raise exception 'PRECHECK FAIL: public.ict_contracts is missing';
  end if;
end $$;

alter table public.ict_contracts
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists idx_ict_contracts_project_live
  on public.ict_contracts(project_id, status, is_archived);

-- Idempotent creation: if a live contract already exists, return it.
create or replace function public.create_contract_from_project(
  p_project_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_project record;
  v_contract_no text;
begin
  if not public.is_ict_admin() then
    raise exception 'Admin access required';
  end if;

  -- Serialise attempts for the same project to stop double-click races.
  perform pg_advisory_xact_lock(hashtextextended(p_project_id::text, 0));

  select *
    into v_project
  from public.ict_delivery_projects
  where id = p_project_id;

  if not found then
    raise exception 'Project not found';
  end if;

  select c.id
    into v_contract_id
  from public.ict_contracts c
  where c.project_id = p_project_id
    and coalesce(c.is_archived, false) = false
    and coalesce(c.status, 'draft') <> 'cancelled'
  order by
    case when c.status = 'active' then 0 else 1 end,
    c.created_at asc
  limit 1;

  if v_contract_id is not null then
    return v_contract_id;
  end if;

  v_contract_no :=
    'CTR-' || extract(year from now())::int || '-' ||
    right(replace(gen_random_uuid()::text, '-', ''), 7);

  insert into public.ict_contracts (
    contract_no,
    project_id,
    customer_id,
    quotation_id,
    title,
    contract_value,
    start_date,
    end_date,
    status,
    created_by,
    updated_at
  )
  values (
    v_contract_no,
    v_project.id,
    v_project.customer_id,
    v_project.quotation_id,
    coalesce(nullif(trim(v_project.project_name), ''), 'Project Contract'),
    coalesce(v_project.contract_value, 0),
    v_project.start_date,
    v_project.target_end_date,
    'draft',
    auth.uid(),
    now()
  )
  returning id into v_contract_id;

  return v_contract_id;
end;
$$;

grant execute on function public.create_contract_from_project(uuid) to authenticated;

-- Hard guard for any insert path, not only the UI/RPC.
create or replace function public.guard_duplicate_project_contract()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.project_id is null
     or coalesce(new.is_archived, false)
     or coalesce(new.status, 'draft') = 'cancelled' then
    return new;
  end if;

  if exists (
    select 1
    from public.ict_contracts c
    where c.project_id = new.project_id
      and c.id is distinct from new.id
      and coalesce(c.is_archived, false) = false
      and coalesce(c.status, 'draft') <> 'cancelled'
  ) then
    raise exception 'A live contract already exists for this project. Open the existing contract instead of creating another one.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_duplicate_project_contract
  on public.ict_contracts;

create trigger trg_guard_duplicate_project_contract
before insert on public.ict_contracts
for each row
execute function public.guard_duplicate_project_contract();

-- Accept contract => contract active + operational project active.
create or replace function public.accept_project_contract(
  p_contract_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
begin
  if not public.is_ict_admin() then
    raise exception 'Admin access required';
  end if;

  select project_id, status
    into v_project_id, v_status
  from public.ict_contracts
  where id = p_contract_id
    and coalesce(is_archived, false) = false;

  if v_project_id is null then
    raise exception 'Contract not found or archived';
  end if;

  if exists (
    select 1
    from public.ict_contracts c
    where c.project_id = v_project_id
      and c.id <> p_contract_id
      and coalesce(c.is_archived, false) = false
      and c.status = 'active'
  ) then
    raise exception 'Another active contract already exists for this project.';
  end if;

  if v_status = 'cancelled' then
    raise exception 'Cancelled contract cannot be accepted.';
  end if;

  update public.ict_contracts
  set status = 'active',
      signed_date = coalesce(signed_date, current_date),
      updated_at = now()
  where id = p_contract_id;

  update public.ict_delivery_projects
  set status = 'active',
      start_date = coalesce(start_date, current_date),
      updated_at = now()
  where id = v_project_id;

  return v_project_id;
end;
$$;

grant execute on function public.accept_project_contract(uuid) to authenticated;

-- Safely archive only a duplicate, non-active contract with no FK-linked data.
create or replace function public.archive_duplicate_project_contract(
  p_contract_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_status text;
  v_fk record;
  v_has_rows boolean;
  v_other_count integer;
begin
  if not public.is_ict_admin() then
    raise exception 'Admin access required';
  end if;

  select project_id, status
    into v_project_id, v_status
  from public.ict_contracts
  where id = p_contract_id
    and coalesce(is_archived, false) = false;

  if v_project_id is null then
    raise exception 'Contract not found or already archived';
  end if;

  if v_status = 'active' then
    raise exception 'Active contract cannot be archived. Choose a duplicate draft/cancelled contract.';
  end if;

  select count(*)
    into v_other_count
  from public.ict_contracts c
  where c.project_id = v_project_id
    and c.id <> p_contract_id
    and coalesce(c.is_archived, false) = false
    and coalesce(c.status, 'draft') <> 'cancelled';

  if v_other_count < 1 then
    raise exception 'This is not a duplicate live contract; archive blocked.';
  end if;

  -- Check every real FK that references ict_contracts before archiving.
  for v_fk in
    select
      n.nspname as child_schema,
      cl.relname as child_table,
      a.attname as child_column
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join lateral unnest(con.conkey) with ordinality ck(attnum, ord) on true
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = ck.attnum
    where con.contype = 'f'
      and con.confrelid = 'public.ict_contracts'::regclass
  loop
    execute format(
      'select exists(select 1 from %I.%I where %I = $1)',
      v_fk.child_schema,
      v_fk.child_table,
      v_fk.child_column
    )
    into v_has_rows
    using p_contract_id;

    if v_has_rows then
      raise exception 'Archive blocked: contract has linked rows in %.%',
        v_fk.child_schema, v_fk.child_table;
    end if;
  end loop;

  update public.ict_contracts
  set is_archived = true,
      archived_at = now(),
      status = case when status = 'cancelled' then status else 'cancelled' end,
      updated_at = now()
  where id = p_contract_id;

  return true;
end;
$$;

grant execute on function public.archive_duplicate_project_contract(uuid) to authenticated;

commit;

-- =============================================================
-- HEALTH CHECK
-- =============================================================
select
  case
    when
      exists (
        select 1 from information_schema.columns
        where table_schema='public' and table_name='ict_contracts' and column_name='is_archived'
      )
      and to_regprocedure('public.create_contract_from_project(uuid)') is not null
      and to_regprocedure('public.accept_project_contract(uuid)') is not null
      and to_regprocedure('public.archive_duplicate_project_contract(uuid)') is not null
      and exists (
        select 1 from pg_trigger
        where tgname='trg_guard_duplicate_project_contract'
          and not tgisinternal
      )
    then 'PASS'
    else 'FAIL'
  end as project_contract_guard_v1_7_health;

-- Existing duplicates are intentionally NOT deleted automatically.
-- This report shows projects that need review/archiving from the UI.
select
  project_id,
  count(*) as live_contracts
from public.ict_contracts
where coalesce(is_archived, false) = false
  and coalesce(status, 'draft') <> 'cancelled'
group by project_id
having count(*) > 1
order by live_contracts desc;
