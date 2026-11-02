-- Migration: 202610280001_vapi_multi_tenant.sql
-- Multi-tenant workspace isolation, Vapi calls, leads management, team roles, and customer tracking.

begin;

-- 1. TEAM MEMBERS & WORKSPACE ACCESS
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  role text not null check(role in ('Owner', 'Admin', 'Employee')) default 'Employee',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  unique(business_id, email)
);

-- 2. CUSTOMERS (Cross-conversation identity)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  total_bookings integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. LEADS (Unbooked inquiries and prospective customers)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  requested_service text,
  enquiry text,
  status text not null check(status in ('New', 'Contacted', 'Converted', 'Lost')) default 'New',
  source text not null check(source in ('AI Assistant', 'Website Widget', 'Phone Call', 'Manual Entry')) default 'AI Assistant',
  conversation_id uuid,
  appointment_id uuid,
  notes jsonb not null default '[]'::jsonb,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. VAPI CALL LOGS & EVENTS
create table if not exists public.vapi_calls (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vapi_call_id text,
  caller_number text,
  duration_seconds integer not null default 0,
  channel text not null check(channel in ('web', 'phone', 'widget')) default 'web',
  outcome text not null check(outcome in ('booked', 'lead', 'inquiry', 'rescheduled', 'cancelled', 'missed', 'error')) default 'inquiry',
  transcript text,
  summary text,
  structured_data jsonb not null default '{}'::jsonb,
  lead_id uuid references public.leads(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

-- 5. EXTEND APPOINTMENTS FOR SOURCE & ASSIGNED STAFF
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='appointments' and column_name='source') then
    alter table public.appointments add column source text not null default 'AI Assistant';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='appointments' and column_name='assigned_staff_name') then
    alter table public.appointments add column assigned_staff_name text default 'Sarah Jenkins';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='appointments' and column_name='google_event_id') then
    alter table public.appointments add column google_event_id text;
  end if;
end $$;

-- 6. INDEXES
create index ifcast_leads_business on public.leads(business_id, status);
create index ifcast_customers_business on public.customers(business_id);
create index ifcast_vapi_calls_business on public.vapi_calls(business_id, created_at desc);
create index ifcast_members_business on public.members(business_id);

-- 7. ROW LEVEL SECURITY
alter table public.members enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.vapi_calls enable row level security;

-- Helper function: verify user has access to business as owner or member
create or replace function public.has_business_access(p_business uuid) returns boolean
language sql security definer set search_path=pg_catalog,public as $$
  select exists (
    select 1 from public.businesses b where b.id = p_business and b.owner_id = auth.uid()
    union
    select 1 from public.members m where m.business_id = p_business and m.user_id = auth.uid()
  );
$$;

create policy members_read on public.members for select to authenticated
  using (public.has_business_access(business_id));

create policy customers_all on public.customers for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy leads_all on public.leads for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

create policy vapi_calls_all on public.vapi_calls for all to authenticated
  using (public.has_business_access(business_id))
  with check (public.has_business_access(business_id));

grant select, insert, update on public.members to authenticated;
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.leads to authenticated;
grant select, insert, update, delete on public.vapi_calls to authenticated;

-- 8. SECURE RPC: CREATE LEAD
create or replace function public.create_lead(p_business uuid, p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_lead_id uuid := gen_random_uuid();
  v_lead_record jsonb;
begin
  if not public.has_business_access(p_business) then
    raise exception 'Unauthorized business access.';
  end if;

  insert into public.leads (
    id,
    business_id,
    customer_name,
    customer_phone,
    customer_email,
    requested_service,
    enquiry,
    status,
    source,
    conversation_id,
    data
  ) values (
    v_lead_id,
    p_business,
    coalesce(trim(p_input->>'customerName'), 'Prospective Customer'),
    coalesce(trim(p_input->>'customerPhone'), ''),
    coalesce(trim(p_input->>'customerEmail'), ''),
    coalesce(trim(p_input->>'requestedService'), ''),
    coalesce(trim(p_input->>'enquiry'), ''),
    'New',
    coalesce(trim(p_input->>'source'), 'AI Assistant'),
    case when p_input->>'conversationId' ~ '^[0-9a-fA-F-]{36}$' then (p_input->>'conversationId')::uuid else null end,
    p_input
  );

  select row_to_json(l)::jsonb into v_lead_record from public.leads l where l.id = v_lead_id;
  return v_lead_record;
end $$;

-- 9. SECURE RPC: RESCHEDULE APPOINTMENT
create or replace function public.reschedule_appointment(
  p_business uuid,
  p_id uuid,
  p_new_date text,
  p_new_time text
) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  c jsonb;
  a public.appointments%rowtype;
  zone text;
  local_start timestamp;
  local_end timestamp;
  starts timestamptz;
  ends timestamptz;
  duration integer;
  buffer integer;
  h jsonb;
  day date;
  clock time;
  result jsonb;
begin
  select config into c from public.businesses where id = p_business for update;
  if not found or not public.has_business_access(p_business) then
    raise exception 'Unauthorized business access.';
  end if;

  select * into a from public.appointments where id = p_id and business_id = p_business for update;
  if not found then
    raise exception 'Appointment not found.';
  end if;

  if a.status = 'cancelled' then
    raise exception 'Cannot reschedule a cancelled appointment.';
  end if;

  zone := c->>'timezone';
  day := p_new_date::date;
  clock := p_new_time::time;
  local_start := day + clock;
  starts := local_start at time zone zone;

  if starts <= now() then
    raise exception 'Cannot reschedule to a past time.';
  end if;

  duration := ((extract(epoch from (a.end_at - a.start_at))) / 60)::integer;
  buffer := a.buffer_minutes;

  h := c->'hours'->extract(dow from day)::int::text;
  if not (h->>'open')::boolean then
    raise exception 'Business is closed on that day.';
  end if;

  local_end := local_start + duration * interval '1 minute';
  ends := starts + duration * interval '1 minute';

  if clock < (h->>'start')::time or local_end > day + (h->>'end')::time then
    raise exception 'Selected time is outside operating hours.';
  end if;

  if exists (
    select 1 from public.appointments x
    where x.business_id = p_business
      and x.id <> p_id
      and x.status = 'confirmed'
      and starts < x.end_at + greatest(buffer, x.buffer_minutes) * interval '1 minute'
      and ends + greatest(buffer, x.buffer_minutes) * interval '1 minute' > x.start_at
  ) then
    raise exception 'Selected slot conflicts with another booking or buffer.';
  end if;

  result := a.data || jsonb_build_object(
    'start', starts,
    'end', ends,
    'rescheduledAt', now()
  );

  update public.appointments
  set start_at = starts, end_at = ends, data = result
  where id = p_id;

  return result;
end $$;

-- 10. SECURE RPC: SAVE CALL SUMMARY (from Vapi webhook or widget)
create or replace function public.save_call_summary(p_business uuid, p_call_data jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
  v_call_id uuid := gen_random_uuid();
  v_lead_id uuid;
  v_appt_id uuid;
  v_record jsonb;
begin
  if case when p_call_data->>'leadId' ~ '^[0-9a-fA-F-]{36}$' then true else false end then
    v_lead_id := (p_call_data->>'leadId')::uuid;
  end if;

  if case when p_call_data->>'appointmentId' ~ '^[0-9a-fA-F-]{36}$' then true else false end then
    v_appt_id := (p_call_data->>'appointmentId')::uuid;
  end if;

  insert into public.vapi_calls (
    id,
    business_id,
    vapi_call_id,
    caller_number,
    duration_seconds,
    channel,
    outcome,
    transcript,
    summary,
    structured_data,
    lead_id,
    appointment_id,
    status
  ) values (
    v_call_id,
    p_business,
    p_call_data->>'vapiCallId',
    coalesce(p_call_data->>'caller', 'Website Visitor'),
    coalesce((p_call_data->>'durationSeconds')::integer, 0),
    coalesce(p_call_data->>'channel', 'web'),
    coalesce(p_call_data->>'outcome', 'inquiry'),
    p_call_data->>'transcript',
    p_call_data->>'summary',
    p_call_data,
    v_lead_id,
    v_appt_id,
    'completed'
  );

  select row_to_json(c)::jsonb into v_record from public.vapi_calls c where c.id = v_call_id;
  return v_record;
end $$;

grant execute on function public.has_business_access(uuid) to authenticated;
grant execute on function public.create_lead(uuid, jsonb) to authenticated;
grant execute on function public.reschedule_appointment(uuid, uuid, text, text) to authenticated;
grant execute on function public.save_call_summary(uuid, jsonb) to authenticated;

commit;
