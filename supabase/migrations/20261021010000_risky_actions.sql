-- Risky actions need the grown-up's own password; bulk actions have no cap
-- (owner, 2026-10-20).
--
-- Changes from the earlier migrations (left as applied):
--   * Every action that is hard to undo checks the signed-in grown-up's own
--     password here, in the database: deleting children, taking children off
--     the list, removing grown-ups, resetting children's progress, setting
--     children's passwords, adding a grown-up, and changing a child's name.
--     The old versions without a password are dropped, so the check can't be
--     skipped by calling the API directly. Changing your own password already
--     needs your current password (lw_change_password) and is unchanged.
--   * A wrong password changes nothing and is counted. Ten wrong passwords in
--     15 minutes pause that grown-up's risky actions until the 15 minutes pass.
--   * The bulk functions take any number of accounts (a JSON array of ids) and
--     report which were done and which were skipped, and why. The corner sends
--     big selections in chunks; every function is safe to repeat.
--   * Settings edits have no per-call cap any more (it was 2000).
--   * Grown-ups can reset a child's progress (rounds and stickers). Uploads of
--     play from before the reset are ignored, so another device can't bring
--     it back.
--   * Dropped as well: lw_create_child (closed since 20261019180000; it had
--     the 80-member cap) and lw_update_child (closed; it changed names with
--     no password).

-- ---------------------------------------------------------------- tables

create table public.password_attempts (
  caller uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index password_attempts_caller_idx on public.password_attempts (caller, attempted_at);
alter table public.password_attempts enable row level security;
revoke all on table public.password_attempts from anon, authenticated;

-- Play before this time no longer counts (set when a grown-up resets progress).
alter table public.profiles add column progress_from timestamptz;

-- ---------------------------------------------------------------- helpers

-- Null when p_password is the grown-up's own password; otherwise why not.
-- Returns instead of raising, so the wrong try stays counted.
create function lw_private.password_problem(p_me uuid, p_password text) returns text
language plpgsql volatile security definer set search_path = '' as $$
begin
  if (select count(*) from public.password_attempts
       where caller = p_me and attempted_at > now() - interval '15 minutes') >= 10 then
    return 'password_pause';
  end if;
  if lw_private.password_matches(p_me, coalesce(p_password, '')) then return null; end if;
  insert into public.password_attempts (caller) values (p_me);
  return 'wrong_password';
end $$;

-- The ids in a JSON array, once each; anything that isn't an id is ignored.
create function lw_private.ids(p jsonb) returns setof uuid
language sql immutable set search_path = '' as $$
  select distinct (x #>> '{}')::uuid
    from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) x
   where jsonb_typeof(x) = 'string'
     and (x #>> '{}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;

-- Settings edits, as before, with no cap on how many in one call.
create or replace function lw_private.apply_settings(p_me public.profiles, p_changes jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  c jsonb; target uuid; f text; kind text; applied int := 0;
  fields constant jsonb := '{"voice":"boolean","effects":"boolean","calm":"boolean","kidControls":"boolean",
    "volume":"number","hintAfter":"number","letters":"array","games":"array",
    "theme_post":"number","theme_space":"number","theme_silk":"number"}';
begin
  if jsonb_typeof(p_changes) <> 'array' then return 0; end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    continue when jsonb_typeof(c) <> 'object'
      or coalesce(c->>'profile', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    target := (c->>'profile')::uuid;
    f := c->>'field';
    kind := fields->>f;
    continue when kind is null or jsonb_typeof(c->'v') is distinct from kind;
    continue when jsonb_typeof(c->'v') = 'array' and jsonb_array_length(c->'v') > 26;
    if target = p_me.id then
      continue when p_me.role = 'child' and f not like 'theme\_%';
    else
      continue when p_me.role <> 'grownup' or not lw_private.can_manage(p_me.id, target);
    end if;
    insert into public.settings as s (profile_id, field, value, changed_at, changed_by)
    values (target, f, c->'v', lw_private.client_time(c->'t'), p_me.id)
    on conflict (profile_id, field) do update
      set value = excluded.value, changed_at = excluded.changed_at, changed_by = excluded.changed_by
      where excluded.changed_at > s.changed_at;
    applied := applied + 1;
  end loop;
  return applied;
end $$;

-- A person's state, as before, plus when their progress last started again.
create or replace function lw_private.state(p_profile uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'profile', (select lw_private.profile_json(p) from public.profiles p where p.id = p_profile),
    'settings', coalesce((select jsonb_object_agg(s.field, jsonb_build_object('v', s.value, 't', lw_private.ms(s.changed_at)))
                            from public.settings s where s.profile_id = p_profile), '{}'::jsonb),
    'agg', coalesce((select jsonb_object_agg(w.world, w.letters) from (
              select a.world, jsonb_object_agg(a.letter, jsonb_build_object('n', a.n, 'clean', a.clean, 'first', a.first)) as letters
                from (select r.world, r.letter, count(*) as n, count(*) filter (where r.misses = 0) as clean,
                             lw_private.ms(min(r.played_at)) as first
                        from public.rounds r where r.profile_id = p_profile group by r.world, r.letter) a
               group by a.world) w), '{}'::jsonb),
    'badges', coalesce((select jsonb_object_agg(b.key, lw_private.ms(b.earned_at))
                          from public.badges b where b.profile_id = p_profile), '{}'::jsonb),
    'last_played', (select lw_private.ms(max(r.played_at)) from public.rounds r where r.profile_id = p_profile),
    'progress_from', (select lw_private.ms(p.progress_from) from public.profiles p where p.id = p_profile),
    'server_time', lw_private.ms(now()))
$$;

revoke all on all functions in schema lw_private from public, anon, authenticated;

-- ---------------------------------------------------------------- sync

-- As before, except rounds and stickers from before a progress reset are ignored.
create or replace function public.lw_sync(p_profile uuid, p_rounds jsonb default '[]', p_settings jsonb default '[]',
                                          p_badges jsonb default '[]', p_device text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me();
  since timestamptz := coalesce(me.progress_from, '-infinity'::timestamptz);
  badge_keys constant text[] := array['first-sound', 'five-letters', 'satpin', 'vowels', 'three-worlds',
    'ten-rounds', 'sharp-ears', 'fifty-rounds', 'all-post', 'all-space', 'all-silk', 'alphabet'];
begin
  if p_profile is distinct from me.id and not (me.role = 'grownup' and lw_private.can_manage(me.id, p_profile)) then
    raise exception 'LW:not_allowed';
  end if;
  p_rounds := coalesce(p_rounds, '[]'); p_settings := coalesce(p_settings, '[]'); p_badges := coalesce(p_badges, '[]');
  if jsonb_typeof(p_rounds) <> 'array' or jsonb_typeof(p_badges) <> 'array' then raise exception 'LW:bad_request'; end if;
  if jsonb_array_length(p_rounds) > 500 then raise exception 'LW:too_many'; end if;
  if p_profile <> me.id and (jsonb_array_length(p_rounds) > 0 or jsonb_array_length(p_badges) > 0) then
    raise exception 'LW:not_allowed';
  end if;

  insert into public.rounds (id, profile_id, world, letter, misses, hinted, played_at, device_id)
  select (x->>'id')::uuid, me.id, x->>'world', x->>'letter',
         case when jsonb_typeof(x->'misses') = 'number' then least(greatest((x->>'misses')::numeric, 0), 99)::smallint else 0 end,
         coalesce(x->'hinted' = 'true'::jsonb, false),
         lw_private.client_time(x->'at'), left(p_device, 64)
    from jsonb_array_elements(p_rounds) x
   where jsonb_typeof(x) = 'object'
     and coalesce(x->>'id', '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     and x->>'world' in ('post', 'space', 'silk')
     and coalesce(x->>'letter', '') ~ '^[A-Z]$'
     and lw_private.client_time(x->'at') >= since
  on conflict (id) do nothing;

  insert into public.badges as b (profile_id, key, earned_at)
  select me.id, x->>'key', lw_private.client_time(x->'t')
    from jsonb_array_elements(p_badges) x
   where jsonb_typeof(x) = 'object' and x->>'key' = any (badge_keys)
     and lw_private.client_time(x->'t') >= since
  on conflict (profile_id, key) do update set earned_at = least(b.earned_at, excluded.earned_at);

  perform lw_private.apply_settings(me, (
    select coalesce(jsonb_agg(x || jsonb_build_object('profile', p_profile)), '[]'::jsonb)
      from jsonb_array_elements(case when jsonb_typeof(p_settings) = 'array' then p_settings else '[]'::jsonb end) x
     where jsonb_typeof(x) = 'object'));

  return lw_private.state(p_profile);
end $$;

-- ---------------------------------------------------------------- risky actions

drop function public.lw_delete_child(uuid);
drop function public.lw_remove_child(uuid);
drop function public.lw_remove_grownup(uuid);
drop function public.lw_set_child_password(uuid, text);
drop function public.lw_create_grownup(text, text, text);
drop function public.lw_edit_child(uuid, text, text, text);
drop function public.lw_create_child(uuid, text, text, text);
drop function public.lw_update_child(uuid, text, text);

-- Every bulk function answers {ok: true, done: [ids], skipped: [{id, why}]},
-- or {ok: false, error} when the password is wrong (and then nothing changed).

-- Deletes children's accounts for good: sign-in, settings, rounds and stickers.
-- A child someone outside my corner also looks after is skipped (shared_child).
create function public.lw_delete_children(p_children jsonb, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text := lw_private.password_problem(me.id, p_my_password);
  k uuid; done jsonb := '[]'; skipped jsonb := '[]';
begin
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  for k in select * from lw_private.ids(p_children) loop
    if not exists (select 1 from public.profiles where id = k) then done := done || to_jsonb(k); continue; end if;
    if not lw_private.can_manage(me.id, k) then
      skipped := skipped || jsonb_build_object('id', k, 'why', 'not_allowed'); continue;
    end if;
    if exists (select 1 from public.group_members m
                where m.profile_id = k and m.group_id not in (select lw_private.my_groups(me.id))) then
      skipped := skipped || jsonb_build_object('id', k, 'why', 'shared_child'); continue;
    end if;
    delete from auth.users where id = k and email like '%@accounts.little-woof.invalid';
    done := done || to_jsonb(k);
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'skipped', skipped);
end $$;

-- Takes children off my list (and my team's). Their accounts are kept.
create function public.lw_remove_children(p_children jsonb, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text := lw_private.password_problem(me.id, p_my_password);
  k uuid; done jsonb := '[]';
begin
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  for k in select * from lw_private.ids(p_children) loop
    delete from public.group_members
     where profile_id = k and role = 'child' and group_id in (select lw_private.my_groups(me.id));
    done := done || to_jsonb(k);
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'skipped', '[]'::jsonb);
end $$;

-- Stops other grown-ups looking after my children. Their accounts are kept.
create function public.lw_remove_grownups(p_grownups jsonb, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text := lw_private.password_problem(me.id, p_my_password);
  g uuid; done jsonb := '[]'; skipped jsonb := '[]';
begin
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  for g in select * from lw_private.ids(p_grownups) loop
    if g = me.id then skipped := skipped || jsonb_build_object('id', g, 'why', 'you'); continue; end if;
    delete from public.group_members
     where profile_id = g and role in ('owner', 'grownup') and group_id in (select lw_private.my_groups(me.id));
    done := done || to_jsonb(g);
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'skipped', skipped);
end $$;

-- Clears children's progress (rounds and stickers) on every device. Their
-- settings, names, pictures and passwords stay.
create function public.lw_reset_children_progress(p_children jsonb, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text := lw_private.password_problem(me.id, p_my_password);
  k uuid; done jsonb := '[]'; skipped jsonb := '[]';
begin
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  for k in select * from lw_private.ids(p_children) loop
    if not lw_private.can_manage(me.id, k) then
      skipped := skipped || jsonb_build_object('id', k, 'why', 'not_allowed'); continue;
    end if;
    delete from public.rounds where profile_id = k;
    delete from public.badges where profile_id = k;
    update public.profiles set progress_from = now() where id = k;
    done := done || to_jsonb(k);
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'skipped', skipped);
end $$;

-- Gives children a new password (the same one for everyone picked).
create function public.lw_set_children_password(p_children jsonb, p_new text, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text;
  k uuid; done jsonb := '[]'; skipped jsonb := '[]';
begin
  perform lw_private.check_password(p_new);
  err := lw_private.password_problem(me.id, p_my_password);
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  for k in select * from lw_private.ids(p_children) loop
    if not lw_private.can_manage(me.id, k) then
      skipped := skipped || jsonb_build_object('id', k, 'why', 'not_allowed'); continue;
    end if;
    perform lw_private.set_auth_password(k, p_new);
    done := done || to_jsonb(k);
  end loop;
  return jsonb_build_object('ok', true, 'done', done, 'skipped', skipped);
end $$;

-- Makes another grown-up, who looks after the same children.
create function public.lw_create_grownup(p_login text, p_password text, p_name text, p_my_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  err text := lw_private.password_problem(me.id, p_my_password);
  team uuid;
  p public.profiles;
begin
  if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  team := lw_private.team(me.id);
  p := lw_private.new_grownup(p_login, p_password, p_name, me.id);
  insert into public.group_members (group_id, profile_id, role, added_by) values (team, p.id, 'grownup', me.id);
  return lw_private.profile_json(p) || jsonb_build_object('ok', true);
end $$;

-- Name, drawn avatar and uploaded picture (null takes the picture away).
-- Changing the name needs my password; a new picture alone doesn't.
create function public.lw_edit_child(p_child uuid, p_name text, p_avatar text, p_picture text default null,
                                     p_my_password text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  n text := lw_private.check_child(p_name, p_avatar, p_picture);
  err text;
  p public.profiles;
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  if n is distinct from (select display_name from public.profiles where id = p_child) then
    err := lw_private.password_problem(me.id, p_my_password);
    if err is not null then return jsonb_build_object('ok', false, 'error', err); end if;
  end if;
  update public.profiles set display_name = n, avatar = p_avatar, picture = p_picture where id = p_child returning * into p;
  return lw_private.profile_json(p) || jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- access

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'lw\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
grant execute on function
  public.lw_me(), public.lw_change_password(text, text),
  public.lw_sync(uuid, jsonb, jsonb, jsonb, text), public.lw_put_settings(jsonb), public.lw_child_state(uuid),
  public.lw_portal(), public.lw_children_states(), public.lw_add_child(text, text, text, text),
  public.lw_add_existing_child(text, text),
  public.lw_delete_children(jsonb, text), public.lw_remove_children(jsonb, text), public.lw_remove_grownups(jsonb, text),
  public.lw_reset_children_progress(jsonb, text), public.lw_set_children_password(jsonb, text, text),
  public.lw_create_grownup(text, text, text, text), public.lw_edit_child(uuid, text, text, text, text)
  to authenticated;
