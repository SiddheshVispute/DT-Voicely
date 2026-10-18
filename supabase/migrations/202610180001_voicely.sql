-- Apply to a fresh Supabase project. All application mutation RPCs are tenant-scoped.
begin;
create extension if not exists btree_gist;
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  config jsonb not null check (jsonb_typeof(config)='object'),
  created_at timestamptz not null default now()
);
create table public.conversations (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data->'messages')='array' and data->>'id'=id::text),
  unique(id,business_id)
);
create table public.appointments (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  conversation_id uuid,
  idempotency_key text not null check(length(idempotency_key) between 1 and 128),
  start_at timestamptz not null,
  end_at timestamptz not null,
  buffer_minutes integer not null check(buffer_minutes between 0 and 120),
  status text not null check(status in ('confirmed','cancelled')),
  data jsonb not null check(data->>'id'=id::text and data->>'status'=status),
  check(end_at>start_at),
  unique(business_id,idempotency_key), unique(id,business_id),
  foreign key(conversation_id,business_id) references public.conversations(id,business_id),
  -- Atomic hard constraint for core overlap. Buffer checks also run under a tenant row lock.
  exclude using gist (business_id with =, tstzrange(start_at,end_at,'[)') with &&) where (status='confirmed')
);
create table public.confirmations (
  id uuid primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null unique,
  data jsonb not null check(data->>'status'='Simulated — Not Sent' and data->>'id'=id::text),
  foreign key(appointment_id,business_id) references public.appointments(id,business_id)
);
create index appointments_business_start on public.appointments(business_id,start_at);
create index conversations_business on public.conversations(business_id);
create index confirmations_business on public.confirmations(business_id);
alter table public.businesses enable row level security;
alter table public.conversations enable row level security;
alter table public.appointments enable row level security;
alter table public.confirmations enable row level security;
create policy business_read on public.businesses for select to authenticated using(owner_id=(select auth.uid()));
create policy conversations_read on public.conversations for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy appointments_read on public.appointments for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy confirmations_read on public.confirmations for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid())));
create policy conversations_insert on public.conversations for insert to authenticated with check(
  exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=(select auth.uid()))
  and data->>'outcome'='inquiry' and data->'appointmentIds'='[]'::jsonb
);
revoke all on public.businesses,public.conversations,public.appointments,public.confirmations from anon,authenticated;
grant select on public.businesses,public.conversations,public.appointments,public.confirmations to authenticated;
grant insert on public.conversations to authenticated;

create function public.validate_business_config(p_config jsonb) returns void
language plpgsql set search_path=pg_catalog,public as $$
declare k text; s jsonb; h jsonb; d integer;
begin
  if nullif(trim(p_config->>'name'),'') is null or length(p_config->>'name')>100 then raise exception 'Business name is required (up to 100 characters).'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_config->>'timezone') then raise exception 'Invalid timezone.'; end if;
  foreach k in array array['duration','buffer','minNotice','advanceDays','cancelNotice'] loop
    if coalesce(p_config->>k,'') !~ '^\d+$' then raise exception 'Invalid setting: %',k; end if;
  end loop;
  if (p_config->>'duration')::int not between 5 and 480 or (p_config->>'buffer')::int not between 0 and 120
    or (p_config->>'minNotice')::int not between 0 and 10080 or (p_config->>'advanceDays')::int not between 1 and 365
    or (p_config->>'cancelNotice')::int not between 0 and 10080 then raise exception 'Booking preferences are out of range.'; end if;
  if jsonb_typeof(p_config->'services') is distinct from 'array' or jsonb_array_length(p_config->'services')=0 then raise exception 'At least one service is required.'; end if;
  if exists(select 1 from jsonb_array_elements(p_config->'services') x group by x->>'id' having count(*)>1) then raise exception 'Service IDs must be unique.'; end if;
  for s in select * from jsonb_array_elements(p_config->'services') loop
    if nullif(trim(s->>'id'),'') is null or nullif(trim(s->>'name'),'') is null or coalesce(s->>'duration','') !~ '^\d+$' or coalesce(s->>'price','') !~ '^\d+(\.\d+)?$' then raise exception 'Invalid service.'; end if;
    if (s->>'duration')::int not between 5 and 480 then raise exception 'Invalid service duration.'; end if;
  end loop;
  for d in 0..6 loop
    h:=p_config->'hours'->d::text;
    if h is null or jsonb_typeof(h->'open') is distinct from 'boolean' or coalesce(h->>'start','') !~ '^([01]\d|2[0-3]):[0-5]\d$' or coalesce(h->>'end','') !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'Invalid working hours.'; end if;
    if (h->>'open')::boolean and (h->>'start')::time >= (h->>'end')::time then raise exception 'Opening time must precede closing time.'; end if;
  end loop;
  if nullif(trim(p_config->'agent'->>'name'),'') is null or nullif(trim(p_config->'agent'->>'greeting'),'') is null then raise exception 'Receptionist name and greeting are required.'; end if;
end $$;

create function public.create_business(p_config jsonb) returns uuid
language plpgsql security definer set search_path=pg_catalog,public as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required.'; end if;
  perform public.validate_business_config(p_config);
  insert into public.businesses(owner_id,config) values(auth.uid(),p_config) on conflict(owner_id) do nothing;
  select id into result from public.businesses where owner_id=auth.uid();return result;
end $$;

create function public.save_business_config(p_business uuid,p_config jsonb) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
  perform 1 from public.businesses where id=p_business and owner_id=auth.uid() for update;
  if not found then raise exception 'Unauthorized business.'; end if;
  perform public.validate_business_config(p_config);
  update public.businesses set config=p_config where id=p_business;
end $$;

create function public.save_conversation(p_business uuid,p_conversation jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_data jsonb; messages jsonb; result jsonb;
begin
  perform 1 from public.businesses where id=p_business and owner_id=auth.uid() for update;
  if not found then raise exception 'Unauthorized business.'; end if;
  select data into current_data from public.conversations where business_id=p_business and id=(p_conversation->>'id')::uuid for update;
  if not found then raise exception 'Conversation not found.'; end if;
  if jsonb_typeof(p_conversation->'messages') is distinct from 'array' then raise exception 'Messages must be an array.'; end if;
  select coalesce(jsonb_agg(m order by ord),'[]'::jsonb) into messages from (
    select distinct on (m->>'id') m,ord from jsonb_array_elements((current_data->'messages')||(p_conversation->'messages')) with ordinality as x(m,ord)
    order by m->>'id',ord
  ) dedup;
  result:=current_data||jsonb_build_object('messages',messages);
  if p_conversation->>'endedAt' is not null then result:=result||jsonb_build_object('endedAt',p_conversation->'endedAt'); end if;
  if jsonb_array_length(current_data->'appointmentIds')=0 then result:=result||jsonb_build_object('summary',p_conversation->'summary','outcome','inquiry'); end if;
  update public.conversations set data=result where id=(p_conversation->>'id')::uuid and business_id=p_business;return result;
end $$;

create function public.book_appointment(p_business uuid,p_input jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c jsonb; service jsonb; h jsonb; a jsonb; sms jsonb; existing jsonb;
  local_start timestamp; local_end timestamp; starts timestamptz; ends timestamptz; zone text;
  day date; clock time; duration integer; buffer integer; appt_id uuid:=gen_random_uuid(); sms_id uuid:=gen_random_uuid(); call_id uuid;
  reference text; customer text:=trim(p_input->>'customer'); phone text:=coalesce(p_input->>'phone',''); key text:=p_input->>'idempotencyKey';
begin
  -- Serializes bookings, cancellations, and config changes for the same single-receptionist business.
  select config into c from public.businesses where id=p_business and owner_id=auth.uid() for update;
  if not found then raise exception 'Unauthorized business.'; end if;
  if key is null or length(key) not between 1 and 128 then raise exception 'Invalid request identifier.'; end if;
  select data into existing from public.appointments where business_id=p_business and idempotency_key=key;
  if found then return existing; end if;
  if customer is null or customer !~ '^[[:alpha:]][[:alpha:] .’''-]{1,79}$' then raise exception 'Provide a valid customer name (2–80 letters).'; end if;
  if phone<>'' and phone !~ '^\+?[0-9 ()-]{7,20}$' then raise exception 'Invalid phone number.'; end if;
  select value into service from jsonb_array_elements(c->'services') where value->>'id'=p_input->>'serviceId';
  if service is null then raise exception 'Invalid service.'; end if;
  if coalesce(p_input->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_input->>'time','') !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'Invalid date or time.'; end if;
  zone:=c->>'timezone';day:=(p_input->>'date')::date;clock:=(p_input->>'time')::time;
  local_start:=day+clock;starts:=local_start at time zone zone;
  -- Reject DST gaps and repeated local times rather than guessing an offset.
  if starts at time zone zone <> local_start or exists(select 1 from unnest(array[-120,-60,-30,30,60,120]) n where (starts+n*interval '1 minute') at time zone zone=local_start) then raise exception 'Ambiguous or nonexistent local time. Choose another slot.'; end if;
  if starts<=now() then raise exception 'Past appointments are not allowed.'; end if;
  if starts<now()+(c->>'minNotice')::int*interval '1 minute' then raise exception 'Minimum booking notice is not met.'; end if;
  if day>(now() at time zone zone)::date+(c->>'advanceDays')::int then raise exception 'Beyond advance booking window.'; end if;
  duration:=(service->>'duration')::int;buffer:=(c->>'buffer')::int;
  h:=c->'hours'->extract(dow from day)::int::text;
  if not (h->>'open')::boolean then raise exception 'Business is closed on that day.'; end if;
  local_end:=local_start+duration*interval '1 minute';ends:=starts+duration*interval '1 minute';
  if clock<(h->>'start')::time or local_end>day+(h->>'end')::time then raise exception 'Outside working hours.'; end if;
  if exists(select 1 from public.appointments x where x.business_id=p_business and x.status='confirmed' and starts<x.end_at+greatest(buffer,x.buffer_minutes)*interval '1 minute' and ends+greatest(buffer,x.buffer_minutes)*interval '1 minute'>x.start_at) then raise exception 'Slot unavailable: appointment or buffer conflict.'; end if;
  call_id:=(p_input->>'conversationId')::uuid;
  if call_id is not null then perform 1 from public.conversations where id=call_id and business_id=p_business;if not found then raise exception 'Conversation not found.';end if;end if;
  reference:='VC-'||upper(substr(appt_id::text,1,8));
  a:=jsonb_build_object('id',appt_id,'reference',reference,'customer',customer,'phone',phone,'serviceId',service->>'id','serviceName',service->>'name','start',starts,'end',ends,'buffer',buffer,'status','confirmed','conversationId',call_id,'idempotencyKey',key,'createdAt',now(),'sample',false);
  insert into public.appointments(id,business_id,conversation_id,idempotency_key,start_at,end_at,buffer_minutes,status,data) values(appt_id,p_business,call_id,key,starts,ends,buffer,'confirmed',a);
  sms:=jsonb_build_object('id',sms_id,'appointmentId',appt_id,'recipient',case when phone='' then customer||' (phone not provided)' else phone end,'message','Hi '||customer||', your '||(service->>'name')||' at '||(c->>'name')||' is confirmed for '||to_char(local_start,'Dy DD Mon HH24:MI')||' ('||zone||'). Reference: '||reference||'. '||(c->>'address')||'. To cancel, contact '||(c->>'phone')||'.','createdAt',now(),'status','Simulated — Not Sent');
  insert into public.confirmations(id,business_id,appointment_id,data) values(sms_id,p_business,appt_id,sms);
  if call_id is not null then update public.conversations set data=data||jsonb_build_object('appointmentIds',(data->'appointmentIds')||to_jsonb(appt_id),'outcome','booked','summary',customer||' booked '||(service->>'name')||' for '||to_char(local_start,'YYYY-MM-DD HH24:MI')||' ('||zone||').') where id=call_id and business_id=p_business;end if;
  return a;
end $$;

create function public.cancel_appointment(p_business uuid,p_id uuid) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare c jsonb; a public.appointments%rowtype; result jsonb;
begin
  select config into c from public.businesses where id=p_business and owner_id=auth.uid() for update;
  if not found then raise exception 'Unauthorized business.'; end if;
  select * into a from public.appointments where id=p_id and business_id=p_business for update;
  if not found then raise exception 'Appointment not found.'; end if;
  if a.status='cancelled' then return a.data;end if;
  if a.start_at<=now()+(c->>'cancelNotice')::int*interval '1 minute' then raise exception 'Cancellation cutoff has passed.';end if;
  result:=a.data||jsonb_build_object('status','cancelled','cancelledAt',now());
  update public.appointments set status='cancelled',data=result where id=p_id;
  if a.conversation_id is not null then update public.conversations set data=data||jsonb_build_object('outcome','cancelled','summary',(a.data->>'customer')||' cancelled '||(a.data->>'reference')||'. The slot has been released.') where id=a.conversation_id and business_id=p_business;end if;
  return result;
end $$;

revoke all on function public.validate_business_config(jsonb) from public,anon,authenticated;
revoke all on function public.create_business(jsonb),public.save_business_config(uuid,jsonb),public.save_conversation(uuid,jsonb),public.book_appointment(uuid,jsonb),public.cancel_appointment(uuid,uuid) from public,anon;
grant execute on function public.create_business(jsonb),public.save_business_config(uuid,jsonb),public.save_conversation(uuid,jsonb),public.book_appointment(uuid,jsonb),public.cancel_appointment(uuid,uuid) to authenticated;
commit;
