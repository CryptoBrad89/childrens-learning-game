-- Any grown-up can look after any number of children and groups, with no
-- built-in idea of classrooms, teachers or parents.
--
-- Changes from 20261019120100_accounts_functions.sql (left as applied):
--   * Groups are plain groups. New groups get kind 'group'; existing 'class'
--     and 'home' rows stay valid. The game no longer shows kinds.
--   * No caps on how many groups a grown-up makes or how many children a
--     group holds (was 50 groups per owner and 80 members per group).
--   * Every grown-up in a group can do everything there, including making new
--     codes and taking out another grown-up. The owner role is kept only as a
--     record of who made the group.
-- Children still can't call any grown-up function, open the grown-ups'
-- corner, or be added to a group as a grown-up.

alter table public.groups drop constraint groups_kind_check;
alter table public.groups add constraint groups_kind_check check (kind in ('group', 'class', 'home'));
alter table public.groups alter column kind set default 'group';

create or replace function public.lw_create_group(p_kind text, p_name text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  g public.groups;
  n text := trim(coalesce(p_name, ''));
  k text := coalesce(nullif(trim(p_kind), ''), 'group');
begin
  if k not in ('group', 'class', 'home') then raise exception 'LW:bad_request'; end if;
  if n = '' or char_length(n) > 40 then raise exception 'LW:name_shape'; end if;
  loop
    begin
      insert into public.groups (kind, name, board_code, invite_code, created_by)
      values (k, n, lw_private.new_code(6), lw_private.new_code(8), me.id) returning * into g;
      exit;
    exception when unique_violation then null; -- a code was already in use; draw again
    end;
  end loop;
  insert into public.group_members (group_id, profile_id, role, added_by) values (g.id, me.id, 'owner', me.id);
  return jsonb_build_object('id', g.id);
end $$;

-- New board and invite codes, for when a code got out. Any grown-up in the group.
create or replace function public.lw_new_codes(p_group uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me public.profiles := lw_private.me_grownup();
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  loop
    begin
      update public.groups set board_code = lw_private.new_code(6), invite_code = lw_private.new_code(8) where id = p_group;
      exit;
    exception when unique_violation then null;
    end;
  end loop;
  return jsonb_build_object('ok', true);
end $$;

-- Takes someone out of a group: any grown-up in the group can take out anyone.
-- The account itself is kept. A group with no grown-ups left closes.
create or replace function public.lw_remove_member(p_group uuid, p_profile uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me public.profiles := lw_private.me_grownup();
  their_role text := lw_private.group_role(p_profile, p_group);
  heir uuid;
begin
  perform lw_private.require_group_grownup(me.id, p_group);
  if their_role is null then return jsonb_build_object('ok', true); end if;
  delete from public.group_members where group_id = p_group and profile_id = p_profile;
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

-- Makes a child account in a group (no limit on group size).
create or replace function public.lw_create_child(p_group uuid, p_name text, p_avatar text, p_password text) returns jsonb
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

-- Same grants as before: create or replace keeps them, but state them for the record.
revoke all on function public.lw_create_group(text, text), public.lw_new_codes(uuid),
  public.lw_remove_member(uuid, uuid), public.lw_create_child(uuid, text, text, text) from public, anon;
grant execute on function public.lw_create_group(text, text), public.lw_new_codes(uuid),
  public.lw_remove_member(uuid, uuid), public.lw_create_child(uuid, text, text, text) to authenticated;
