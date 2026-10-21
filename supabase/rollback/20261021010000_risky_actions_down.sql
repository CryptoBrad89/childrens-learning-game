-- Rollback for 20261021010000_risky_actions.sql only.
-- Not a migration: run by hand to go back to risky actions without a password
-- check (and the old settings cap). Progress resets already made stay made.

drop function if exists
  public.lw_delete_children(jsonb, text), public.lw_remove_children(jsonb, text), public.lw_remove_grownups(jsonb, text),
  public.lw_reset_children_progress(jsonb, text), public.lw_set_children_password(jsonb, text, text),
  public.lw_create_grownup(text, text, text, text), public.lw_edit_child(uuid, text, text, text, text),
  lw_private.password_problem(uuid, text), lw_private.ids(jsonb);

-- The earlier versions, exactly as the earlier migrations made them.
create or replace function lw_private.apply_settings(p_me public.profiles, p_changes jsonb) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare
  c jsonb; target uuid; f text; kind text; applied int := 0;
  fields constant jsonb := '{"voice":"boolean","effects":"boolean","calm":"boolean","kidControls":"boolean",
    "volume":"number","hintAfter":"number","letters":"array","games":"array",
    "theme_post":"number","theme_space":"number","theme_silk":"number"}';
begin
  if jsonb_typeof(p_changes) <> 'array' then return 0; end if;
  if jsonb_array_length(p_changes) > 2000 then raise exception 'LW:too_many'; end if;
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
    'server_time', lw_private.ms(now()))
$$;


create or replace function public.lw_sync(p_profile uuid, p_rounds jsonb default '[]', p_settings jsonb default '[]',
                               p_badges jsonb default '[]', p_device text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me();
  badge_keys constant text[] := array['first-sound', 'five-letters', 'satpin', 'vowels', 'three-worlds',
    'ten-rounds', 'sharp-ears', 'fifty-rounds', 'all-post', 'all-space', 'all-silk', 'alphabet'];
begin
  if p_profile is distinct from me.id and not (me.role = 'grownup' and lw_private.can_manage(me.id, p_profile)) then
    raise exception 'LW:not_allowed';
  end if;
  p_rounds := coalesce(p_rounds, '[]'); p_settings := coalesce(p_settings, '[]'); p_badges := coalesce(p_badges, '[]');
  if jsonb_typeof(p_rounds) <> 'array' or jsonb_typeof(p_badges) <> 'array' then raise exception 'LW:bad_request'; end if;
  if jsonb_array_length(p_rounds) > 500 then raise exception 'LW:too_many'; end if;
  -- Only the person who played can upload their rounds and stickers.
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
  on conflict (id) do nothing;

  insert into public.badges as b (profile_id, key, earned_at)
  select me.id, x->>'key', lw_private.client_time(x->'t')
    from jsonb_array_elements(p_badges) x
   where jsonb_typeof(x) = 'object' and x->>'key' = any (badge_keys)
  on conflict (profile_id, key) do update set earned_at = least(b.earned_at, excluded.earned_at);

  perform lw_private.apply_settings(me, (
    select coalesce(jsonb_agg(x || jsonb_build_object('profile', p_profile)), '[]'::jsonb)
      from jsonb_array_elements(case when jsonb_typeof(p_settings) = 'array' then p_settings else '[]'::jsonb end) x
     where jsonb_typeof(x) = 'object'));

  return lw_private.state(p_profile);
end $$;


create function public.lw_set_child_password(p_child uuid, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  perform lw_private.set_auth_password(p_child, p_password);
  return jsonb_build_object('ok', true);
end $$;


create function public.lw_delete_child(p_child uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  if exists (select 1 from public.group_members k
              where k.profile_id = p_child
                and lw_private.group_role(me.id, k.group_id) is distinct from 'owner'
                and lw_private.group_role(me.id, k.group_id) is distinct from 'grownup') then
    raise exception 'LW:shared_child';
  end if;
  delete from auth.users where id = p_child and email like '%@accounts.little-woof.invalid';
  return jsonb_build_object('ok', true);
end $$;


create function public.lw_update_child(p_child uuid, p_name text, p_avatar text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup(); n text := trim(coalesce(p_name, '')); p public.profiles;
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  if coalesce(p_avatar, '') !~ '^[a-z]{2,12}(:[0-5])?$' then raise exception 'LW:bad_request'; end if;
  update public.profiles set display_name = n, avatar = p_avatar where id = p_child returning * into p;
  return lw_private.profile_json(p);
end $$;


create function public.lw_create_child(p_group uuid, p_name text, p_avatar text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  n text := trim(coalesce(p_name, ''));
  base text;
  l text;
  uid uuid;
  p public.profiles;
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  if coalesce(p_avatar, '') !~ '^[a-z]{2,12}(:[0-5])?$' then raise exception 'LW:bad_request'; end if;
  perform lw_private.check_password(p_password);
  base := left(regexp_replace(translate(lower(n), 'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ', 'aaaaaaaeeeeeiiiiioooooooouuuuuncyy'), '[^a-z]', '', 'g'), 10);
  if char_length(base) < 2 then base := 'player'; end if;
  loop
    l := base || '-' || lower(lw_private.new_code(3));
    exit when not exists (select 1 from public.profiles where login = l);
  end loop;
  uid := lw_private.create_auth_user(l, p_password);
  insert into public.profiles (id, role, login, display_name, avatar, created_by)
  values (uid, 'child', l, n, p_avatar, me.id) returning * into p;
  insert into public.group_members (group_id, profile_id, role, added_by) values (p_group, uid, 'child', me.id);
  return lw_private.profile_json(p);
end $$;


create function public.lw_edit_child(p_child uuid, p_name text, p_avatar text, p_picture text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  n text := lw_private.check_child(p_name, p_avatar, p_picture);
  p public.profiles;
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  update public.profiles set display_name = n, avatar = p_avatar, picture = p_picture where id = p_child returning * into p;
  return lw_private.profile_json(p);
end $$;


create function public.lw_remove_child(p_child uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  delete from public.group_members
   where profile_id = p_child and role = 'child' and group_id in (select lw_private.my_groups(me.id));
  return jsonb_build_object('ok', true);
end $$;


create function public.lw_create_grownup(p_login text, p_password text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  team uuid := lw_private.team(me.id);
  p public.profiles := lw_private.new_grownup(p_login, p_password, p_name, me.id);
begin
  insert into public.group_members (group_id, profile_id, role, added_by) values (team, p.id, 'grownup', me.id);
  return lw_private.profile_json(p);
end $$;


create function public.lw_remove_grownup(p_grownup uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if p_grownup = me.id then raise exception 'LW:bad_request'; end if;
  delete from public.group_members
   where profile_id = p_grownup and role in ('owner', 'grownup') and group_id in (select lw_private.my_groups(me.id));
  return jsonb_build_object('ok', true);
end $$;


revoke all on all functions in schema lw_private from public, anon, authenticated;
alter table public.profiles drop column if exists progress_from;
drop table if exists public.password_attempts;

-- ---------------------------------------------------------------- access

-- Start from nothing, then open only what the game uses, to signed-in people.
-- Closed: lw_sign_up (no public sign-up), and every group, board and code
-- function (lw_board, lw_groups, lw_create_group, lw_rename_group, lw_new_codes,
-- lw_join_group, lw_remove_member, lw_create_child, lw_link_child,
-- lw_group_states, lw_update_child), replaced by the functions above.
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
  public.lw_sync(uuid, jsonb, jsonb, jsonb, text), public.lw_put_settings(jsonb),
  public.lw_set_child_password(uuid, text), public.lw_delete_child(uuid), public.lw_child_state(uuid),
  public.lw_portal(), public.lw_children_states(), public.lw_add_child(text, text, text, text),
  public.lw_edit_child(uuid, text, text, text), public.lw_add_existing_child(text, text),
  public.lw_remove_child(uuid), public.lw_create_grownup(text, text, text), public.lw_remove_grownup(uuid)
  to authenticated;
