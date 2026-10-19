-- Accounts for children, teachers and parents.
-- Play progress is a CRDT: letters and achievements are add-only, play counts
-- are a per-device G-counter, and each setting is its own last-write-wins
-- register. Merge never deletes a letter or a play that is already stored.
-- Role lives in auth app_metadata. Callers cannot change it.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('child', 'teacher', 'parent')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text not null default 'pup' check (avatar in ('pup', 'fox', 'bear', 'owl', 'fish', 'star', 'moon', 'boat')),
  login_name text unique check (login_name is null or login_name ~ '^[a-z0-9]{2,20}$'),
  classroom_id uuid,
  created_at timestamptz not null default now()
);

create table public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{4,10}$'),
  teacher_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_classroom_fk
  foreign key (classroom_id) references public.classrooms (id) on delete set null;

create index profiles_classroom_id_idx on public.profiles (classroom_id);

create table public.guardians (
  parent_id uuid not null references public.profiles (id) on delete cascade,
  child_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, child_id)
);

create index guardians_child_id_idx on public.guardians (child_id);

create table public.learner_state (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  achievements jsonb not null default '{}'::jsonb,
  themes jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.guardians enable row level security;
alter table public.learner_state enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.classrooms from public, anon, authenticated;
revoke all on table public.guardians from public, anon, authenticated;
revoke all on table public.learner_state from public, anon, authenticated;
grant all on table public.profiles, public.classrooms, public.guardians, public.learner_state to service_role;

create or replace function private.jwt_role()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function private.sane_time(t text)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  ts timestamptz;
begin
  if t is null or t !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}' then
    return false;
  end if;
  ts := t::timestamptz;
  return ts >= '2020-01-01'::timestamptz and ts <= now() + interval '2 days';
exception when others then
  return false;
end;
$$;

create or replace function private.canon(j jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  kind text;
  item jsonb;
  parts text[] := '{}';
begin
  if j is null or jsonb_typeof(j) = 'null' then
    return 'null';
  end if;
  kind := jsonb_typeof(j);
  if kind = 'string' then
    return to_json(j #>> '{}')::text;
  elsif kind = 'number' or kind = 'boolean' then
    return j::text;
  elsif kind = 'array' then
    for item in select value from jsonb_array_elements(j) loop
      parts := parts || private.canon(item);
    end loop;
    return '[' || array_to_string(parts, ',') || ']';
  else
    return j::text;
  end if;
end;
$$;

create or replace function private.pick_register(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  a_ok boolean := a is not null and private.sane_time(a->>'t') and a ? 'v';
  b_ok boolean := b is not null and private.sane_time(b->>'t') and b ? 'v';
begin
  if not a_ok then
    if b_ok then return jsonb_build_object('v', b->'v', 't', b->>'t'); end if;
    return null;
  end if;
  if not b_ok then
    return jsonb_build_object('v', a->'v', 't', a->>'t');
  end if;
  if (a->>'t') > (b->>'t') or ((a->>'t') = (b->>'t') and private.canon(a->'v') >= private.canon(b->'v')) then
    return jsonb_build_object('v', a->'v', 't', a->>'t');
  end if;
  return jsonb_build_object('v', b->'v', 't', b->>'t');
end;
$$;

create or replace function private.merge_registers(a jsonb, b jsonb, keys text[])
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  key text;
  picked jsonb;
  result jsonb := '{}'::jsonb;
begin
  foreach key in array keys loop
    picked := private.pick_register(a->key, b->key);
    if picked is not null then
      result := result || jsonb_build_object(key, picked);
    end if;
  end loop;
  return result;
end;
$$;

create or replace function private.merge_letters(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  letter text;
  result jsonb := '{}'::jsonb;
  candidate text;
begin
  for letter in
    select distinct key
    from (
      select jsonb_object_keys(coalesce(a, '{}'::jsonb)) as key
      union
      select jsonb_object_keys(coalesce(b, '{}'::jsonb))
    ) keys
  loop
    if letter !~ '^[A-Z]$' then continue; end if;
    candidate := null;
    if private.sane_time(a->>letter) then candidate := a->>letter; end if;
    if private.sane_time(b->>letter) and (candidate is null or (b->>letter) < candidate) then
      candidate := b->>letter;
    end if;
    if candidate is not null then
      result := result || jsonb_build_object(letter, candidate);
    end if;
  end loop;
  return result;
end;
$$;

create or replace function private.merge_counts(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  replica text;
  left_n int;
  right_n int;
  result jsonb := '{}'::jsonb;
begin
  for replica in
    select distinct key
    from (
      select jsonb_object_keys(coalesce(a, '{}'::jsonb)) as key
      union
      select jsonb_object_keys(coalesce(b, '{}'::jsonb))
    ) keys
  loop
    if replica !~ '^[0-9a-f-]{36}$' then continue; end if;
    left_n := case when coalesce(a->>replica, '') ~ '^[0-9]+$' then least(1000000, (a->>replica)::int) else 0 end;
    right_n := case when coalesce(b->>replica, '') ~ '^[0-9]+$' then least(1000000, (b->>replica)::int) else 0 end;
    if greatest(left_n, right_n) > 0 then
      result := result || jsonb_build_object(replica, greatest(left_n, right_n));
    end if;
  end loop;
  return result;
end;
$$;

create or replace function private.merge_progress(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  world text;
  worlds text[] := array['post', 'space', 'silk'];
  result jsonb := '{}'::jsonb;
begin
  foreach world in array worlds loop
    result := result || jsonb_build_object(world, jsonb_build_object(
      'letters', private.merge_letters(a->world->'letters', b->world->'letters'),
      'counts', private.merge_counts(a->world->'counts', b->world->'counts')
    ));
  end loop;
  return result;
end;
$$;

create or replace function private.merge_achievements(a jsonb, b jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  id text;
  result jsonb := '{}'::jsonb;
  candidate text;
begin
  for id in
    select distinct key
    from (
      select jsonb_object_keys(coalesce(a, '{}'::jsonb)) as key
      union
      select jsonb_object_keys(coalesce(b, '{}'::jsonb))
    ) keys
  loop
    if id !~ '^[a-z0-9-]{1,40}$' then continue; end if;
    candidate := null;
    if private.sane_time(a->>id) then candidate := a->>id; end if;
    if private.sane_time(b->>id) and (candidate is null or (b->>id) < candidate) then
      candidate := b->>id;
    end if;
    if candidate is not null then
      result := result || jsonb_build_object(id, candidate);
    end if;
  end loop;
  return result;
end;
$$;

create or replace function private.can_manage(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.profiles child
      join public.classrooms room on room.id = child.classroom_id
      where child.id = p_user_id
        and child.role = 'child'
        and room.teacher_id = (select auth.uid())
        and private.jwt_role() = 'teacher'
    )
    or exists (
      select 1
      from public.guardians link
      where link.child_id = p_user_id
        and link.parent_id = (select auth.uid())
        and private.jwt_role() = 'parent'
    );
$$;

create or replace function private.can_learn(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) = p_user_id or private.can_manage(p_user_id);
$$;

-- GoTrue inserts the user, then writes app_metadata. The insert trigger
-- therefore sees no role. The update trigger applies the role and class
-- once that metadata lands, and never downgrades a role that is already set
-- if a later write omits it.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_role boolean := new.raw_app_meta_data ? 'role';
  has_class boolean := new.raw_app_meta_data ? 'classroom_id';
  new_role text := coalesce(new.raw_app_meta_data->>'role', 'parent');
  new_avatar text := coalesce(new.raw_user_meta_data->>'avatar', 'pup');
  new_login text := nullif(lower(coalesce(new.raw_user_meta_data->>'login_name', '')), '');
  new_class uuid;
begin
  if new_role not in ('child', 'teacher', 'parent') then
    new_role := 'parent';
  end if;
  if new_avatar not in ('pup', 'fox', 'bear', 'owl', 'fish', 'star', 'moon', 'boat') then
    new_avatar := 'pup';
  end if;
  if new_login is not null and new_login !~ '^[a-z0-9]{2,20}$' then
    new_login := null;
  end if;
  begin
    new_class := nullif(new.raw_app_meta_data->>'classroom_id', '')::uuid;
  exception when others then
    new_class := null;
  end;
  if new_class is not null and not exists (select 1 from public.classrooms where id = new_class) then
    new_class := null;
  end if;
  insert into public.profiles (id, role, display_name, avatar, login_name, classroom_id)
  values (
    new.id,
    new_role,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Grown-up'), 40),
    new_avatar,
    new_login,
    new_class
  )
  on conflict (id) do update set
    role = case when has_role then excluded.role else public.profiles.role end,
    display_name = excluded.display_name,
    avatar = excluded.avatar,
    login_name = coalesce(excluded.login_name, public.profiles.login_name),
    classroom_id = case when has_class then excluded.classroom_id else public.profiles.classroom_id end;
  insert into public.learner_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

drop trigger if exists on_auth_user_app_meta on auth.users;
create trigger on_auth_user_app_meta
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function private.handle_new_user();

create or replace function private.lookup_classroom(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room public.classrooms;
  kids jsonb;
begin
  select * into room from public.classrooms where code = upper(coalesce(p_code, ''));
  if not found then
    return jsonb_build_object('found', false);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'display_name', profile.display_name,
    'avatar', profile.avatar,
    'login_name', profile.login_name
  ) order by profile.display_name), '[]'::jsonb)
  into kids
  from public.profiles profile
  where profile.classroom_id = room.id and profile.role = 'child';
  return jsonb_build_object('found', true, 'name', room.name, 'code', room.code, 'children', kids);
end;
$$;

create or replace function private.my_roster()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.profiles;
  room public.classrooms;
  room_json jsonb := null;
  kids jsonb;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if not found then
    return jsonb_build_object('role', '', 'children', '[]'::jsonb);
  end if;
  if me.role = 'teacher' then
    select * into room from public.classrooms where teacher_id = me.id;
    if found then
      room_json := jsonb_build_object('id', room.id, 'name', room.name, 'code', room.code);
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', profile.id, 'display_name', profile.display_name,
        'avatar', profile.avatar, 'login_name', profile.login_name
      ) order by profile.display_name), '[]'::jsonb)
      into kids
      from public.profiles profile
      where profile.classroom_id = room.id and profile.role = 'child';
    else
      kids := '[]'::jsonb;
    end if;
  elsif me.role = 'parent' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', profile.id, 'display_name', profile.display_name,
      'avatar', profile.avatar, 'login_name', profile.login_name
    ) order by profile.display_name), '[]'::jsonb)
    into kids
    from public.guardians link
    join public.profiles profile on profile.id = link.child_id
    where link.parent_id = me.id;
  else
    kids := '[]'::jsonb;
  end if;
  return jsonb_build_object(
    'role', me.role,
    'display_name', me.display_name,
    'classroom', room_json,
    'children', kids
  );
end;
$$;

create or replace function private.create_classroom(p_name text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.classrooms;
  made_code text := upper(coalesce(p_code, ''));
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt int := 0;
  slot int;
  created public.classrooms;
begin
  if private.jwt_role() <> 'teacher' then
    raise exception 'Only a teacher can create a class' using errcode = '42501';
  end if;
  select * into existing from public.classrooms where teacher_id = (select auth.uid());
  if found then
    return jsonb_build_object('id', existing.id, 'name', existing.name, 'code', existing.code);
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'The class needs a name' using errcode = '22023';
  end if;
  if made_code = '' then
    while attempt < 8 loop
      made_code := '';
      for slot in 1..6 loop
        made_code := made_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from public.classrooms where code = made_code);
      attempt := attempt + 1;
    end loop;
  end if;
  if made_code !~ '^[A-HJ-NP-Z2-9]{4,10}$' then
    raise exception 'Use 4 to 10 letters or numbers, skipping I, O, 0 and 1' using errcode = '22023';
  end if;
  insert into public.classrooms (name, code, teacher_id)
  values (left(trim(p_name), 60), made_code, (select auth.uid()))
  returning * into created;
  return jsonb_build_object('id', created.id, 'name', created.name, 'code', created.code);
end;
$$;

create or replace function private.merge_learner_state(p_user_id uuid, p_state jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.learner_state;
  incoming jsonb := coalesce(p_state, '{}'::jsonb);
  next_settings jsonb;
  next_progress jsonb;
  next_achievements jsonb;
  next_themes jsonb;
  setting_keys text[] := array['voice', 'volume', 'effects', 'calm', 'letters', 'hintAfter', 'games', 'kidControls'];
  theme_keys text[] := array['post', 'space', 'silk'];
begin
  if not private.can_learn(p_user_id) then
    raise exception 'Not allowed to update this learner' using errcode = '42501';
  end if;
  if octet_length(incoming::text) > 20000 then
    raise exception 'That update is too large' using errcode = '22023';
  end if;
  select * into stored from public.learner_state where user_id = p_user_id for update;
  if not found then
    raise exception 'No learner record' using errcode = 'P0002';
  end if;
  -- A child session can record play. Settings change only for a teacher or a linked parent.
  if private.can_manage(p_user_id) then
    next_settings := private.merge_registers(stored.settings, incoming->'settings', setting_keys);
  else
    next_settings := private.merge_registers(stored.settings, '{}'::jsonb, setting_keys);
  end if;
  next_progress := private.merge_progress(stored.progress, incoming->'progress');
  next_achievements := private.merge_achievements(stored.achievements, incoming->'achievements');
  next_themes := private.merge_registers(stored.themes, incoming->'themes', theme_keys);
  update public.learner_state
  set settings = next_settings,
      progress = next_progress,
      achievements = next_achievements,
      themes = next_themes,
      updated_at = now()
  where user_id = p_user_id;
  return jsonb_build_object(
    'settings', next_settings,
    'progress', next_progress,
    'achievements', next_achievements,
    'themes', next_themes
  );
end;
$$;

create or replace function public.lookup_classroom(p_code text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.lookup_classroom(p_code);
$$;

create or replace function public.my_roster()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select private.my_roster();
$$;

create or replace function public.create_classroom(p_name text, p_code text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_classroom(p_name, p_code);
$$;

create or replace function public.merge_learner_state(p_user_id uuid, p_state jsonb)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.merge_learner_state(p_user_id, p_state);
$$;

revoke all on function private.jwt_role() from public;
revoke all on function private.sane_time(text) from public;
revoke all on function private.canon(jsonb) from public;
revoke all on function private.pick_register(jsonb, jsonb) from public;
revoke all on function private.merge_registers(jsonb, jsonb, text[]) from public;
revoke all on function private.merge_letters(jsonb, jsonb) from public;
revoke all on function private.merge_counts(jsonb, jsonb) from public;
revoke all on function private.merge_progress(jsonb, jsonb) from public;
revoke all on function private.merge_achievements(jsonb, jsonb) from public;
revoke all on function private.can_manage(uuid) from public;
revoke all on function private.can_learn(uuid) from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.lookup_classroom(text) from public;
revoke all on function private.my_roster() from public;
revoke all on function private.create_classroom(text, text) from public;
revoke all on function private.merge_learner_state(uuid, jsonb) from public;

grant execute on function private.lookup_classroom(text) to anon, authenticated;
grant execute on function private.my_roster() to authenticated;
grant execute on function private.create_classroom(text, text) to authenticated;
grant execute on function private.merge_learner_state(uuid, jsonb) to authenticated;
grant execute on function private.can_manage(uuid) to authenticated;
grant execute on function private.can_learn(uuid) to authenticated;
grant execute on function private.jwt_role() to anon, authenticated;
grant execute on function private.sane_time(text) to anon, authenticated;
grant execute on function private.canon(jsonb) to anon, authenticated;
grant execute on function private.pick_register(jsonb, jsonb) to anon, authenticated;
grant execute on function private.merge_registers(jsonb, jsonb, text[]) to anon, authenticated;
grant execute on function private.merge_letters(jsonb, jsonb) to anon, authenticated;
grant execute on function private.merge_counts(jsonb, jsonb) to anon, authenticated;
grant execute on function private.merge_progress(jsonb, jsonb) to anon, authenticated;
grant execute on function private.merge_achievements(jsonb, jsonb) to anon, authenticated;

revoke all on function public.lookup_classroom(text) from public;
revoke all on function public.my_roster() from public;
revoke all on function public.create_classroom(text, text) from public;
revoke all on function public.merge_learner_state(uuid, jsonb) from public;
grant execute on function public.lookup_classroom(text) to anon, authenticated;
grant execute on function public.my_roster() to authenticated;
grant execute on function public.create_classroom(text, text) to authenticated;
grant execute on function public.merge_learner_state(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
