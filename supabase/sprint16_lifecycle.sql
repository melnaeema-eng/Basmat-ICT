-- =========================================================
-- BASMAT ICT — SPRINT 16
-- Customer & Team Lifecycle Management
-- =========================================================

alter table public.ict_customers
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

alter table public.ict_team_members
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

-- Safe customer deletion:
-- Block permanent deletion whenever important business relations exist.
create or replace function public.ict_safe_delete_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blockers text[] := '{}';
  v_count bigint;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  if to_regclass('public.ict_sales_opportunities') is not null then
    execute 'select count(*) from public.ict_sales_opportunities where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'الفرص البيعية'); end if;
  end if;

  if to_regclass('public.ict_sales_followups') is not null then
    execute 'select count(*) from public.ict_sales_followups where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'المتابعات'); end if;
  end if;

  if to_regclass('public.ict_delivery_projects') is not null then
    execute 'select count(*) from public.ict_delivery_projects where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'المشاريع'); end if;
  end if;

  if to_regclass('public.ict_projects') is not null then
    execute 'select count(*) from public.ict_projects where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'المشاريع'); end if;
  end if;

  if to_regclass('public.ict_delivery_contracts') is not null then
    execute 'select count(*) from public.ict_delivery_contracts where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'العقود'); end if;
  end if;

  if to_regclass('public.ict_delivery_invoices') is not null then
    execute 'select count(*) from public.ict_delivery_invoices where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'الفواتير'); end if;
  end if;

  if to_regclass('public.ict_customer_portal_users') is not null then
    execute 'select count(*) from public.ict_customer_portal_users where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'حساب بوابة العميل'); end if;
  end if;

  if to_regclass('public.ict_quotations') is not null then
    execute 'select count(*) from public.ict_quotations where customer_id = $1'
      into v_count using p_customer_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'عروض الأسعار'); end if;
  end if;

  if cardinality(v_blockers) > 0 then
    return jsonb_build_object(
      'deleted', false,
      'blockers', to_jsonb(v_blockers),
      'message', 'لا يمكن الحذف النهائي لوجود معاملات مرتبطة. استخدم الأرشفة.'
    );
  end if;

  delete from public.ict_customers where id = p_customer_id;

  return jsonb_build_object('deleted', true, 'blockers', '[]'::jsonb);
end;
$$;

grant execute on function public.ict_safe_delete_customer(uuid) to authenticated;

-- Safe team-member deletion:
-- Assignment references use SET NULL in the current schema, but we deliberately
-- block permanent deletion when assignments exist to preserve history.
create or replace function public.ict_safe_delete_team_member(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_blockers text[] := '{}';
  v_count bigint;
begin
  if not public.is_ict_admin() then
    raise exception 'غير مصرح.';
  end if;

  if to_regclass('public.ict_rfq_requests') is not null then
    execute 'select count(*) from public.ict_rfq_requests where assigned_to = $1'
      into v_count using p_member_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'طلبات عرض السعر'); end if;
  end if;

  if to_regclass('public.ict_consultation_requests') is not null then
    execute 'select count(*) from public.ict_consultation_requests where assigned_to = $1'
      into v_count using p_member_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'الاستشارات'); end if;
  end if;

  if to_regclass('public.ict_sales_opportunities') is not null then
    execute 'select count(*) from public.ict_sales_opportunities where assigned_to = $1'
      into v_count using p_member_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'الفرص البيعية'); end if;
  end if;

  if to_regclass('public.ict_delivery_projects') is not null then
    execute 'select count(*) from public.ict_delivery_projects where project_manager_id = $1'
      into v_count using p_member_id;
    if v_count > 0 then v_blockers := array_append(v_blockers, 'إدارة المشاريع'); end if;
  end if;

  if cardinality(v_blockers) > 0 then
    return jsonb_build_object(
      'deleted', false,
      'blockers', to_jsonb(v_blockers),
      'message', 'لا يمكن الحذف النهائي لوجود معاملات مرتبطة. استخدم التعطيل أو الأرشفة.'
    );
  end if;

  delete from public.ict_team_members where id = p_member_id;
  return jsonb_build_object('deleted', true, 'blockers', '[]'::jsonb);
end;
$$;

grant execute on function public.ict_safe_delete_team_member(uuid) to authenticated;
