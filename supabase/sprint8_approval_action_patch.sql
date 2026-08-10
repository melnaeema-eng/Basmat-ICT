create table if not exists public.ict_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  title text not null,
  message text,
  quotation_id uuid references public.ict_quotations(id) on delete cascade,
  customer_id uuid references public.ict_customers(id) on delete set null,
  approval_id uuid references public.ict_quotation_approvals(id) on delete set null,
  action_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_ict_admin_notifications_created
  on public.ict_admin_notifications(created_at desc);

create unique index if not exists ux_ict_admin_notification_approval
  on public.ict_admin_notifications(approval_id)
  where approval_id is not null;

alter table public.ict_admin_notifications enable row level security;

drop policy if exists "ICT admins read admin notifications" on public.ict_admin_notifications;
create policy "ICT admins read admin notifications"
on public.ict_admin_notifications
for select to authenticated
using (public.is_ict_admin());

drop policy if exists "ICT admins update admin notifications" on public.ict_admin_notifications;
create policy "ICT admins update admin notifications"
on public.ict_admin_notifications
for update to authenticated
using (public.is_ict_admin())
with check (public.is_ict_admin());

drop function if exists public.customer_decide_quotation(uuid,text,text,text,text,text,text);

create function public.customer_decide_quotation(
  p_quotation_id uuid,
  p_decision text,
  p_signer_name text,
  p_signer_email text default null,
  p_rejection_reason text default null,
  p_consent_text text default null,
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
  v_quotation_customer_id uuid;
  v_quotation_status text;
  v_quotation_no text;
  v_customer_name text;
begin
  select cpu.customer_id
  into v_customer_id
  from public.ict_customer_portal_users cpu
  where cpu.user_id = auth.uid()
    and cpu.is_active = true
  limit 1;

  if v_customer_id is null then
    raise exception 'Customer portal access required';
  end if;

  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Invalid quotation decision';
  end if;

  select q.customer_id, q.status, q.quotation_no,
         coalesce(q.company_name, q.customer_name, 'العميل')
  into v_quotation_customer_id, v_quotation_status, v_quotation_no, v_customer_name
  from public.ict_quotations q
  where q.id = p_quotation_id;

  if v_quotation_customer_id is null then
    raise exception 'Quotation not found';
  end if;

  if v_quotation_customer_id <> v_customer_id then
    raise exception 'Quotation access denied';
  end if;

  if v_quotation_status <> 'sent' then
    raise exception 'Quotation is not awaiting customer decision';
  end if;

  if p_decision = 'rejected' and nullif(trim(p_rejection_reason), '') is null then
    raise exception 'Rejection reason is required';
  end if;

  insert into public.ict_quotation_approvals (
    quotation_id, customer_id, portal_user_id, decision,
    signer_name, signer_email, rejection_reason, consent_text,
    user_agent, signed_at
  ) values (
    p_quotation_id, v_customer_id, auth.uid(), p_decision,
    trim(p_signer_name), nullif(trim(p_signer_email), ''),
    case when p_decision='rejected' then nullif(trim(p_rejection_reason), '') else null end,
    p_consent_text, p_user_agent, now()
  ) returning id into v_approval_id;

  update public.ict_quotations
  set status = p_decision, updated_at = now()
  where id = p_quotation_id;

  insert into public.ict_admin_notifications (
    notification_type, title, message, quotation_id,
    customer_id, approval_id, action_url
  ) values (
    case when p_decision='accepted' then 'quotation_accepted' else 'quotation_rejected' end,
    case when p_decision='accepted'
      then 'تم قبول عرض السعر ' || coalesce(v_quotation_no,'')
      else 'تم رفض عرض السعر ' || coalesce(v_quotation_no,'') end,
    case when p_decision='accepted'
      then v_customer_name || ' وافق على عرض السعر. العرض جاهز للمراجعة والتحويل إلى مشروع.'
      else v_customer_name || ' رفض عرض السعر. سبب الرفض: ' || coalesce(nullif(trim(p_rejection_reason), ''),'غير مذكور') end,
    p_quotation_id, v_customer_id, v_approval_id,
    case when p_decision='accepted' then '/admin/workflow' else '/admin/quotations/' || p_quotation_id::text end
  ) on conflict (approval_id) do nothing;

  return v_approval_id;
end;
$$;

grant execute on function public.customer_decide_quotation(uuid,text,text,text,text,text,text) to authenticated;
