-- Immutable person-owned events make offline retries safe and preserve concurrent play.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9][a-z0-9_-]{2,31}$'),
  display_name text not null check (char_length(display_name) between 1 and 60),
  role text not null check (role in ('child', 'grownup'))
);
create table public.guardians (
  adult_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  primary key(adult_id, child_id), check (adult_id <> child_id)
);
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60)
);
create table public.class_children (
  class_id uuid not null references public.classes(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  primary key(class_id, child_id)
);
create index guardians_child_idx on public.guardians(child_id);
create index classes_owner_idx on public.classes(owner_id);
create index class_children_child_idx on public.class_children(child_id);

-- These private lookups avoid policy recursion; each derives its caller from auth.uid().
create function private.is_grownup() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'grownup');
$$;
create function private.can_access_person(person uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (person = (select auth.uid()) or exists (
    select 1 from public.guardians where adult_id = (select auth.uid()) and child_id = person));
$$;
revoke all on function private.is_grownup(), private.can_access_person(uuid) from public;
grant execute on function private.is_grownup(), private.can_access_person(uuid) to authenticated;

create function private.valid_event(event_kind text, data jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare field text; value jsonb;
begin
  if jsonb_typeof(data) <> 'object' then return false; end if;
  if event_kind = 'round' then
    return data ?& array['world','letter','misses'] and data - array['world','letter','misses'] = '{}'::jsonb
      and data->>'world' in ('post','space','silk') and data->>'letter' ~ '^[A-Z]$'
      and jsonb_typeof(data->'misses') = 'number' and data->>'misses' ~ '^[0-9]+$'
      and (data->>'misses')::numeric <= 100000;
  elsif event_kind = 'setting' then
    if not (data ?& array['field','value']) or data - array['field','value'] <> '{}'::jsonb then return false; end if;
    field := data->>'field'; value := data->'value';
    if field in ('voice','effects','calm','kidControls') then return jsonb_typeof(value) = 'boolean';
    elsif field = 'volume' then return jsonb_typeof(value) = 'number' and value::text ~ '^[0-9]+$' and value::text::numeric between 0 and 100;
    elsif field = 'hintAfter' then return value in ('0'::jsonb,'1'::jsonb,'2'::jsonb);
    elsif field = 'letters' then
      return jsonb_typeof(value) = 'array' and jsonb_array_length(value) between 1 and 26 and not exists (
        select 1 from jsonb_array_elements(value) x where jsonb_typeof(x) <> 'string' or x #>> '{}' !~ '^[A-Z]$');
    elsif field = 'games' then
      return jsonb_typeof(value) = 'array' and jsonb_array_length(value) between 1 and 3 and not exists (
        select 1 from jsonb_array_elements(value) x where x not in ('"post"'::jsonb,'"space"'::jsonb,'"silk"'::jsonb));
    elsif field in ('theme.post','theme.space','theme.silk') then
      return value in ('0'::jsonb,'1'::jsonb,'2'::jsonb);
    end if;
  end if;
  return false;
exception when others then return false;
end;
$$;
revoke all on function private.valid_event(text,jsonb) from public;
grant execute on function private.valid_event(text,jsonb) to authenticated, service_role;
create table public.operations (
  id uuid primary key,
  seq bigint generated always as identity unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('round','setting')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint operations_valid_payload check (coalesce(private.valid_event(kind,payload),false))
);
create index operations_user_seq_idx on public.operations(user_id,seq);

alter table public.profiles enable row level security;
alter table public.guardians enable row level security;
alter table public.classes enable row level security;
alter table public.class_children enable row level security;
alter table public.operations enable row level security;
revoke all on public.profiles, public.guardians, public.classes, public.class_children, public.operations from anon, authenticated;
grant select on public.profiles, public.guardians to authenticated;
grant select, insert, update, delete on public.classes, public.class_children to authenticated;
grant select on public.operations to authenticated;
grant insert(id,user_id,kind,payload) on public.operations to authenticated;
grant usage, select on sequence public.operations_seq_seq to authenticated;
grant all on public.profiles, public.guardians, public.classes, public.class_children, public.operations to service_role;
grant all on sequence public.operations_seq_seq to service_role;

create policy profiles_read on public.profiles for select to authenticated using (private.can_access_person(id));
create policy guardians_read on public.guardians for select to authenticated using (adult_id = (select auth.uid()) or child_id = (select auth.uid()));
create policy classes_read on public.classes for select to authenticated using (owner_id = (select auth.uid()));
create policy classes_insert on public.classes for insert to authenticated with check (owner_id = (select auth.uid()) and private.is_grownup());
create policy classes_update on public.classes for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and private.is_grownup());
create policy classes_delete on public.classes for delete to authenticated using (owner_id = (select auth.uid()));
create policy class_children_read on public.class_children for select to authenticated using (exists(select 1 from public.classes c where c.id = class_id and c.owner_id = (select auth.uid())));
create policy class_children_insert on public.class_children for insert to authenticated with check (private.can_access_person(child_id) and child_id <> (select auth.uid()) and exists(select 1 from public.classes c where c.id = class_id and c.owner_id = (select auth.uid())));
create policy class_children_delete on public.class_children for delete to authenticated using (exists(select 1 from public.classes c where c.id = class_id and c.owner_id = (select auth.uid())));
create policy operations_read on public.operations for select to authenticated using (private.can_access_person(user_id));
create policy operations_insert on public.operations for insert to authenticated with check (private.can_access_person(user_id));

create function public.sync_batch(p_owner uuid, p_events jsonb) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare item jsonb; event_id uuid; existing public.operations; acknowledged jsonb := '[]'::jsonb;
begin
  if not private.can_access_person(p_owner) then raise exception 'Person access denied' using errcode = '42501'; end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 100 then raise exception 'Expected at most 100 events'; end if;
  for item in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['id','kind','payload']) or item - array['id','kind','payload'] <> '{}'::jsonb then raise exception 'Invalid event'; end if;
    event_id := (item->>'id')::uuid;
    insert into public.operations(id,user_id,kind,payload) values(event_id,p_owner,item->>'kind',item->'payload') on conflict(id) do nothing;
    select * into existing from public.operations where id = event_id;
    if not found or existing.user_id <> p_owner or existing.kind <> item->>'kind' or existing.payload <> item->'payload' then
      raise exception 'Event ID conflicts with an existing event' using errcode = '23505';
    end if;
    acknowledged := acknowledged || jsonb_build_array(event_id);
  end loop;
  return jsonb_build_object('acknowledged',acknowledged);
end;
$$;
revoke all on function public.sync_batch(uuid,jsonb) from public, anon;
grant execute on function public.sync_batch(uuid,jsonb) to authenticated;

-- Only the Edge Function service credential can provision profiles and guardian links.
create function public.provision_account(p_id uuid,p_handle text,p_display_name text,p_role text,p_adult uuid default null,p_class uuid default null) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_role = 'child' then
    if p_adult is null or not exists(select 1 from public.profiles where id = p_adult and role = 'grownup') then raise exception 'A grown-up is required'; end if;
  elsif p_role <> 'grownup' or p_adult is not null then raise exception 'Invalid account role'; end if;
  if p_class is not null and (p_role <> 'child' or not exists(select 1 from public.classes where id = p_class and owner_id = p_adult)) then raise exception 'Class access denied' using errcode = '42501'; end if;
  insert into public.profiles(id,handle,display_name,role) values(p_id,p_handle,p_display_name,p_role) on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id = p_id and handle = p_handle and role = p_role) then raise exception 'Account conflicts'; end if;
  if p_adult is not null then insert into public.guardians(adult_id,child_id) values(p_adult,p_id) on conflict do nothing; end if;
  if p_class is not null then insert into public.class_children(class_id,child_id) values(p_class,p_id) on conflict do nothing; end if;
end;
$$;
revoke all on function public.provision_account(uuid,text,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.provision_account(uuid,text,text,text,uuid,uuid) to service_role;
