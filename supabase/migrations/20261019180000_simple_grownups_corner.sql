-- The grown-ups' corner as a simple admin (owner, 2026-10-19).
--
-- Changes from the earlier migrations (left as applied):
--   * No public grown-up sign-up. lw_sign_up can no longer be called by anyone
--     through the API. Only a signed-in grown-up can make another grown-up
--     (lw_create_grownup). The first grown-up in a project is made by the
--     project owner in the SQL editor:
--       select lw_private.make_grownup('sign-in-name', 'password', 'Their name');
--   * No groups, boards or codes in the API. Each grown-up has one team behind
--     the scenes: a row in public.groups whose codes are never shown or used.
--     Children a grown-up adds, and grown-ups they make, join that team, so
--     everyone in it looks after the same children. Grown-ups and children who
--     were already in several groups keep all of them.
--   * A child's picture can be an uploaded photo (profiles.picture), shown in
--     place of the drawn avatar.
--   * Nothing anonymous can call any function any more (lw_board was the last).
-- Children still can't call any grown-up function.

-- ---------------------------------------------------------------- pictures

-- A small square photo as a data URL (the corner shrinks it to 160×160 first).
create function lw_private.picture_ok(p text) returns boolean
language sql immutable set search_path = '' as $$
  select p is null or (octet_length(p) <= 60000 and p ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$')
$$;

alter table public.profiles add column picture text
  constraint profiles_picture_check check (lw_private.picture_ok(picture));

create or replace function lw_private.profile_json(p public.profiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'role', p.role, 'login', p.login, 'name', p.display_name, 'avatar', p.avatar)
    || case when p.picture is null then '{}'::jsonb else jsonb_build_object('picture', p.picture) end
$$;

-- ---------------------------------------------------------------- helpers

-- The grown-up's team: the first group they look after, made when they have none.
create function lw_private.team(p_me uuid) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare t uuid; n text;
begin
  select group_id into t from public.group_members
   where profile_id = p_me and role in ('owner', 'grownup') order by added_at, group_id limit 1;
  if t is not null then return t; end if;
  select display_name into n from public.profiles where id = p_me;
  loop
    begin
      insert into public.groups (kind, name, board_code, invite_code, created_by)
      values ('group', coalesce(n, 'Grown-ups'), lw_private.new_code(6), lw_private.new_code(8), p_me) returning id into t;
      exit;
    exception when unique_violation then null; -- a code was already in use; draw again
    end;
  end loop;
  insert into public.group_members (group_id, profile_id, role, added_by) values (t, p_me, 'owner', p_me);
  return t;
end $$;

-- Groups the grown-up looks after (usually just their team).
create function lw_private.my_groups(p_me uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select group_id from public.group_members where profile_id = p_me and role in ('owner', 'grownup')
$$;

-- Children the grown-up looks after.
create function lw_private.my_children(p_me uuid) returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct m.profile_id from public.group_members m
   where m.role = 'child' and m.group_id in (select lw_private.my_groups(p_me))
$$;

-- A new grown-up account, made by `p_by` (null only for make_grownup).
create function lw_private.new_grownup(p_login text, p_password text, p_name text, p_by uuid) returns public.profiles
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
  insert into public.profiles (id, role, login, display_name, avatar, created_by)
  values (uid, 'grownup', l, n, 'sun', p_by) returning * into p;
  return p;
end $$;

-- For the project owner only (SQL editor): the first grown-up, who can then make the rest.
create function lw_private.make_grownup(p_login text, p_password text, p_name text) returns jsonb
language sql volatile security definer set search_path = '' as $$
  select lw_private.profile_json(lw_private.new_grownup(p_login, p_password, p_name, null))
$$;

create function lw_private.check_child(p_name text, p_avatar text, p_picture text) returns text
language plpgsql immutable set search_path = '' as $$
declare n text := trim(coalesce(p_name, ''));
begin
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  if coalesce(p_avatar, '') !~ '^[a-z]{2,12}(:[0-5])?$' then raise exception 'LW:bad_request'; end if;
  if not lw_private.picture_ok(p_picture) then raise exception 'LW:bad_picture'; end if;
  return n;
end $$;

revoke all on all functions in schema lw_private from public, anon, authenticated;

-- ---------------------------------------------------------------- the corner

-- Everything the corner shows: me, my children (with a short progress summary)
-- and the other grown-ups who look after them.
create function public.lw_portal() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  return jsonb_build_object(
    'me', lw_private.profile_json(me),
    'children', coalesce((select jsonb_agg(lw_private.profile_json(p) || jsonb_build_object(
        'rounds', (select count(*) from public.rounds r where r.profile_id = p.id),
        'letters', (select count(distinct r.letter) from public.rounds r where r.profile_id = p.id),
        'badges', (select count(*) from public.badges b where b.profile_id = p.id),
        'last_played', (select lw_private.ms(max(r.played_at)) from public.rounds r where r.profile_id = p.id))
      order by p.display_name, p.login)
      from public.profiles p where p.id in (select lw_private.my_children(me.id))), '[]'::jsonb),
    'grownups', coalesce((select jsonb_agg(lw_private.profile_json(p) || jsonb_build_object('made_by_me', p.created_by is not distinct from me.id)
      order by p.display_name, p.login)
      from public.profiles p
     where p.id <> me.id and p.id in (select m.profile_id from public.group_members m
                                       where m.role in ('owner', 'grownup') and m.group_id in (select lw_private.my_groups(me.id)))), '[]'::jsonb));
end $$;

-- Every child's state (settings, totals, stickers) in one call.
create function public.lw_children_states() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  return coalesce((select jsonb_object_agg(k, lw_private.state(k)) from lw_private.my_children(me.id) k), '{}'::jsonb);
end $$;

-- Makes a child account. The sign-in name is the child's name plus three
-- characters, so it is unique and easy to read out.
create function public.lw_add_child(p_name text, p_avatar text, p_password text, p_picture text default null) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  n text := lw_private.check_child(p_name, p_avatar, p_picture);
  team uuid;
  base text;
  l text;
  uid uuid;
  p public.profiles;
begin
  perform lw_private.check_password(p_password);
  team := lw_private.team(me.id);
  base := left(regexp_replace(translate(lower(n), 'áàâäãåāéèêëēíìîïīóòôöõøōúùûüūñçýÿ', 'aaaaaaaeeeeeiiiiioooooooouuuuuncyy'), '[^a-z]', '', 'g'), 10);
  if char_length(base) < 2 then base := 'player'; end if;
  loop
    l := base || '-' || lower(lw_private.new_code(3));
    exit when not exists (select 1 from public.profiles where login = l);
  end loop;
  uid := lw_private.create_auth_user(l, p_password);
  insert into public.profiles (id, role, login, display_name, avatar, picture, created_by)
  values (uid, 'child', l, n, p_avatar, p_picture, me.id) returning * into p;
  insert into public.group_members (group_id, profile_id, role, added_by) values (team, uid, 'child', me.id);
  return lw_private.profile_json(p);
end $$;

-- Name, drawn avatar and uploaded picture (null takes the picture away).
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

-- Adds a child who already has an account, proven by their sign-in name and
-- password. Failed tries are counted: ten per grown-up per hour.
create function public.lw_add_existing_child(p_login text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  p public.profiles;
begin
  if (select count(*) from public.link_attempts where caller = me.id and attempted_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('ok', false, 'error', 'too_many_tries');
  end if;
  select * into p from public.profiles where login = lower(trim(coalesce(p_login, ''))) and role = 'child';
  if p.id is null or not lw_private.password_matches(p.id, coalesce(p_password, '')) then
    insert into public.link_attempts (caller) values (me.id);
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  insert into public.group_members (group_id, profile_id, role, added_by)
  values (lw_private.team(me.id), p.id, 'child', me.id) on conflict (group_id, profile_id) do nothing;
  return jsonb_build_object('ok', true, 'child', lw_private.profile_json(p));
end $$;

-- Takes a child off my list (and my team's). Their account is kept.
create function public.lw_remove_child(p_child uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  delete from public.group_members
   where profile_id = p_child and role = 'child' and group_id in (select lw_private.my_groups(me.id));
  return jsonb_build_object('ok', true);
end $$;

-- Makes another grown-up, who looks after the same children. Only a signed-in
-- grown-up can do this; there is no other way to make a grown-up account.
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

-- Stops another grown-up looking after my children. Their account is kept.
create function public.lw_remove_grownup(p_grownup uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  if p_grownup = me.id then raise exception 'LW:bad_request'; end if;
  delete from public.group_members
   where profile_id = p_grownup and role in ('owner', 'grownup') and group_id in (select lw_private.my_groups(me.id));
  return jsonb_build_object('ok', true);
end $$;

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
