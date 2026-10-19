-- Little Woof accounts and sync: the API.
--
-- Every function checks the caller with auth.uid(). Errors are raised as
-- "LW:<code>" so the game can show a plain-language message.
-- Helpers live in lw_private, which the API roles cannot reach.

create schema lw_private;
revoke all on schema lw_private from public;

-- ---------------------------------------------------------------- helpers

create function lw_private.ms(ts timestamptz) returns bigint
language sql immutable set search_path = '' as $$
  select (extract(epoch from ts) * 1000)::bigint
$$;

-- A client timestamp in milliseconds, kept between 2024 and the time it arrived.
create function lw_private.client_time(v jsonb) returns timestamptz
language sql stable set search_path = '' as $$
  select case when jsonb_typeof(v) = 'number'
    then least(greatest(to_timestamp((v #>> '{}')::double precision / 1000), timestamptz '2024-01-01'), now())
    else now() end
$$;

-- Random code from letters and digits that are hard to mix up when read aloud
-- or typed by a grown-up (no 0/O, 1/I/L, 2/Z, 5/S, 6/G, 8/B).
create function lw_private.new_code(n int) returns text
language sql volatile set search_path = '' as $$
  select string_agg(substr('ACDEFHJKMNPQRTUVWXY3479', (get_byte(b, i) % 23) + 1, 1), '' order by i)
  from (select extensions.gen_random_bytes(n) as b) s, generate_series(0, n - 1) as i
$$;

create function lw_private.check_password(p text) returns void
language plpgsql immutable set search_path = '' as $$
begin
  -- The only rule is a minimum of six characters (72 is bcrypt's limit).
  if p is null or char_length(p) < 6 then raise exception 'LW:password_short'; end if;
  if octet_length(p) > 72 then raise exception 'LW:password_long'; end if;
end $$;

create function lw_private.email_for(p_login text) returns text
language sql immutable set search_path = '' as $$
  select p_login || '@accounts.little-woof.invalid'
$$;

-- Creates a confirmed Supabase Auth user that signs in with
-- <login>@accounts.little-woof.invalid and the given password.
create function lw_private.create_auth_user(p_login text, p_password text) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := gen_random_uuid();
  mail text := lw_private.email_for(p_login);
begin
  perform lw_private.check_password(p_password);
  if exists (select 1 from auth.users where email = mail) then raise exception 'LW:login_taken'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', mail,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
    '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
  insert into auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (gen_random_uuid(), uid::text, uid,
    jsonb_build_object('sub', uid::text, 'email', mail, 'email_verified', true, 'phone_verified', false),
    'email', now(), now());
  return uid;
end $$;

create function lw_private.set_auth_password(p_user uuid, p_password text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  perform lw_private.check_password(p_password);
  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now()
   where id = p_user;
end $$;

create function lw_private.password_matches(p_user uuid, p_password text) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select encrypted_password = extensions.crypt(p_password, encrypted_password)
                     from auth.users where id = p_user), false)
$$;

create function lw_private.me() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = auth.uid();
  if p.id is null then raise exception 'LW:signed_out'; end if;
  return p;
end $$;

create function lw_private.me_grownup() returns public.profiles
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles := lw_private.me();
begin
  if p.role <> 'grownup' then raise exception 'LW:grownups_only'; end if;
  return p;
end $$;

-- A grown-up looks after a child when they share a group.
create function lw_private.can_manage(p_me uuid, p_child uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.group_members g
      join public.group_members k on k.group_id = g.group_id
     where g.profile_id = p_me and g.role in ('owner', 'grownup')
       and k.profile_id = p_child and k.role = 'child')
$$;

create function lw_private.group_role(p_me uuid, p_group uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.group_members where group_id = p_group and profile_id = p_me
$$;

create function lw_private.require_group_grownup(p_me uuid, p_group uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare r text := lw_private.group_role(p_me, p_group);
begin
  if r is null or r not in ('owner', 'grownup') then raise exception 'LW:not_allowed'; end if;
  return r;
end $$;

create function lw_private.profile_json(p public.profiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'role', p.role, 'login', p.login, 'name', p.display_name, 'avatar', p.avatar)
$$;

-- Everything a device needs to show a person: settings, totals per letter, stickers.
create function lw_private.state(p_profile uuid) returns jsonb
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

-- Settings edits: [{profile, field, v, t}]. The newest edit of each field wins.
-- Children may only change their own color themes; grown-ups may change
-- their own settings and those of children they look after. Edits that are not
-- allowed, or have the wrong shape, are dropped.
create function lw_private.apply_settings(p_me public.profiles, p_changes jsonb) returns int
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

revoke all on all functions in schema lw_private from public, anon, authenticated;

-- ---------------------------------------------------------------- accounts

-- Anyone can make a grown-up account with a sign-in name and a password.
create function public.lw_sign_up(p_login text, p_password text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  l text := lower(trim(coalesce(p_login, '')));
  n text := trim(coalesce(p_name, ''));
  uid uuid;
  p public.profiles;
begin
  if l !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then raise exception 'LW:login_shape'; end if;
  if n = '' then n := l; end if;
  if char_length(n) > 40 then raise exception 'LW:name_long'; end if;
  if exists (select 1 from public.profiles where login = l) then raise exception 'LW:login_taken'; end if;
  uid := lw_private.create_auth_user(l, p_password);
  insert into public.profiles (id, role, login, display_name, avatar)
  values (uid, 'grownup', l, n, 'sun') returning * into p;
  return lw_private.profile_json(p);
end $$;

create function public.lw_me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select lw_private.profile_json(lw_private.me())
$$;

create function public.lw_change_password(p_old text, p_new text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare p public.profiles := lw_private.me();
begin
  if not lw_private.password_matches(p.id, p_old) then raise exception 'LW:bad_password'; end if;
  perform lw_private.set_auth_password(p.id, p_new);
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- play and sync

-- One round trip per person: upload new rounds, settings edits and stickers,
-- then get back the person's complete state. Safe to retry: rounds are keyed by
-- the id the device made, and stickers and settings merge.
create function public.lw_sync(p_profile uuid, p_rounds jsonb default '[]', p_settings jsonb default '[]',
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

-- Settings edits for several people at once (a grown-up changing a whole class).
create function public.lw_put_settings(p_changes jsonb) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  return jsonb_build_object('applied', lw_private.apply_settings(lw_private.me(), p_changes));
end $$;

-- ---------------------------------------------------------------- groups

-- The picture board for a class or home: names and pictures only.
create function public.lw_board(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  g public.groups;
begin
  select * into g from public.groups where board_code = code;
  if g.id is null then raise exception 'LW:no_board'; end if;
  return jsonb_build_object('id', g.id, 'kind', g.kind, 'name', g.name, 'code', g.board_code,
    'children', coalesce((select jsonb_agg(lw_private.profile_json(p) order by p.display_name, p.login)
                            from public.group_members m join public.profiles p on p.id = m.profile_id
                           where m.group_id = g.id and m.role = 'child'), '[]'::jsonb));
end $$;

-- Groups the signed-in grown-up belongs to, with each member and a short progress summary.
create function public.lw_groups() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'kind', g.kind, 'name', g.name, 'board_code', g.board_code, 'invite_code', g.invite_code,
      'role', mine.role,
      'members', (select coalesce(jsonb_agg(lw_private.profile_json(p) || jsonb_build_object(
                     'member_role', m.role,
                     'rounds', (select count(*) from public.rounds r where r.profile_id = p.id),
                     'letters', (select count(distinct r.letter) from public.rounds r where r.profile_id = p.id),
                     'badges', (select count(*) from public.badges b where b.profile_id = p.id),
                     'last_played', (select lw_private.ms(max(r.played_at)) from public.rounds r where r.profile_id = p.id))
                   order by m.role <> 'child', p.display_name, p.login), '[]'::jsonb)
                    from public.group_members m join public.profiles p on p.id = m.profile_id
                   where m.group_id = g.id))
      order by g.created_at), '[]'::jsonb)
    from public.group_members mine join public.groups g on g.id = mine.group_id
   where mine.profile_id = (lw_private.me_grownup()).id and mine.role in ('owner', 'grownup')
$$;

create function public.lw_create_group(p_kind text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  g public.groups;
  n text := trim(coalesce(p_name, ''));
begin
  if p_kind not in ('class', 'home') then raise exception 'LW:bad_request'; end if;
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  if (select count(*) from public.group_members where profile_id = me.id and role = 'owner') >= 50 then
    raise exception 'LW:too_many';
  end if;
  loop
    begin
      insert into public.groups (kind, name, board_code, invite_code, created_by)
      values (p_kind, n, lw_private.new_code(6), lw_private.new_code(8), me.id) returning * into g;
      exit;
    exception when unique_violation then null; -- a code was already in use; draw again
    end;
  end loop;
  insert into public.group_members (group_id, profile_id, role, added_by) values (g.id, me.id, 'owner', me.id);
  return jsonb_build_object('id', g.id);
end $$;

create function public.lw_rename_group(p_group uuid, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup(); n text := trim(coalesce(p_name, ''));
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  update public.groups set name = n where id = p_group;
  return jsonb_build_object('ok', true);
end $$;

-- New board and invite codes, for when a code got out. Owners only.
create function public.lw_new_codes(p_group uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if lw_private.group_role(me.id, p_group) is distinct from 'owner' then raise exception 'LW:owners_only'; end if;
  loop
    begin
      update public.groups set board_code = lw_private.new_code(6), invite_code = lw_private.new_code(8) where id = p_group;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- Another grown-up joins with the group's invite code.
create function public.lw_join_group(p_invite text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  code text := upper(regexp_replace(coalesce(p_invite, ''), '[^A-Za-z0-9]', '', 'g'));
  g public.groups;
begin
  select * into g from public.groups where invite_code = code;
  if g.id is null then raise exception 'LW:no_invite'; end if;
  insert into public.group_members (group_id, profile_id, role, added_by)
  values (g.id, me.id, 'grownup', me.id) on conflict (group_id, profile_id) do nothing;
  return jsonb_build_object('id', g.id, 'name', g.name, 'kind', g.kind);
end $$;

-- Takes someone out of a group. Grown-ups can take out children and themselves;
-- only an owner can take out another grown-up. The account itself is kept.
create function public.lw_remove_member(p_group uuid, p_profile uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  my_role text := lw_private.require_group_grownup(me.id, p_group);
  their_role text := lw_private.group_role(p_profile, p_group);
  heir uuid;
begin
  if their_role is null then return jsonb_build_object('ok', true); end if;
  if their_role <> 'child' and p_profile <> me.id and my_role <> 'owner' then raise exception 'LW:owners_only'; end if;
  delete from public.group_members where group_id = p_group and profile_id = p_profile;
  -- A group always keeps an owner while it has grown-ups; with none left, it closes.
  if their_role = 'owner' and not exists (select 1 from public.group_members where group_id = p_group and role = 'owner') then
    select profile_id into heir from public.group_members
     where group_id = p_group and role = 'grownup' order by added_at limit 1;
    if heir is null then
      delete from public.groups where id = p_group;
    else
      update public.group_members set role = 'owner' where group_id = p_group and profile_id = heir;
    end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- children

-- Makes a child account in a group. The sign-in name is made from the child's
-- name plus three characters, so it is unique and easy to read out.
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
  if (select count(*) from public.group_members where group_id = p_group) >= 80 then raise exception 'LW:too_many'; end if;
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

create function public.lw_set_child_password(p_child uuid, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  perform lw_private.set_auth_password(p_child, p_password);
  return jsonb_build_object('ok', true);
end $$;

-- Adds a child who already has an account (for example from school) to one of
-- my groups, proven by knowing the child's sign-in name and password. Failed
-- tries are counted, so guessing is slow: ten per grown-up per hour.
create function public.lw_link_child(p_group uuid, p_login text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  p public.profiles;
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  if (select count(*) from public.link_attempts where caller = me.id and attempted_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_tries');
  end if;
  select * into p from public.profiles where login = lower(trim(coalesce(p_login, ''))) and role = 'child';
  if p.id is null or not lw_private.password_matches(p.id, coalesce(p_password, '')) then
    insert into public.link_attempts (caller) values (me.id);
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  insert into public.group_members (group_id, profile_id, role, added_by)
  values (p_group, p.id, 'child', me.id) on conflict (group_id, profile_id) do nothing;
  return jsonb_build_object('ok', true, 'child', lw_private.profile_json(p));
end $$;

-- Deletes a child's account for good: sign-in, settings, rounds and stickers.
-- Only when every group the child is in is one the caller looks after, so a
-- teacher can't delete a child a family also looks after (and the reverse).
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

-- A child's full state, for a grown-up who looks after them.
create function public.lw_child_state(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if not lw_private.can_manage(me.id, p_child) then raise exception 'LW:not_allowed'; end if;
  return lw_private.state(p_child);
end $$;

-- Every child's state in a group, in one call (settings, totals, stickers).
create function public.lw_group_states(p_group uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  return coalesce((select jsonb_object_agg(m.profile_id, lw_private.state(m.profile_id))
                     from public.group_members m where m.group_id = p_group and m.role = 'child'), '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------- access

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'lw\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
grant execute on function public.lw_sign_up(text, text, text) to anon;
grant execute on function public.lw_board(text) to anon;
