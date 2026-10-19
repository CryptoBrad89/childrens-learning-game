-- Grown-up portal: no public signup, admin flag, and a picture on a child.
-- The hidden room row stays in the database so a child still has a home.
-- The portal does not read or show its name or code.
-- Apply on little-woof (shkmpxaejiuqzejsdwyr) only.

alter table public.profiles add column if not exists avatar_image text;
alter table public.profiles add column if not exists is_admin boolean not null default false;

alter table public.profiles drop constraint if exists profiles_avatar_image_check;
alter table public.profiles add constraint profiles_avatar_image_check
  check (
    avatar_image is null
    or (
      char_length(avatar_image) <= 180000
      and avatar_image ~ '^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$'
    )
  );

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_role boolean := new.raw_app_meta_data ? 'role';
  has_class boolean := new.raw_app_meta_data ? 'classroom_id';
  has_admin boolean := new.raw_app_meta_data ? 'admin';
  new_role text := coalesce(new.raw_app_meta_data->>'role', 'parent');
  new_avatar text := coalesce(new.raw_user_meta_data->>'avatar', 'pup');
  new_login text := nullif(lower(coalesce(new.raw_user_meta_data->>'login_name', '')), '');
  new_image text := nullif(new.raw_user_meta_data->>'avatar_image', '');
  new_admin boolean := coalesce(new.raw_app_meta_data->>'admin', '') = 'true';
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
  if new_image is null
     or char_length(new_image) > 180000
     or new_image !~ '^data:image/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$' then
    new_image := null;
  end if;
  begin
    new_class := nullif(new.raw_app_meta_data->>'classroom_id', '')::uuid;
  exception when others then
    new_class := null;
  end;
  if new_class is not null and not exists (select 1 from public.classrooms where id = new_class) then
    new_class := null;
  end if;
  insert into public.profiles (id, role, display_name, avatar, avatar_image, login_name, classroom_id, is_admin)
  values (
    new.id,
    new_role,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Grown-up'), 40),
    new_avatar,
    new_image,
    new_login,
    new_class,
    new_admin
  )
  on conflict (id) do update set
    role = case when has_role then excluded.role else public.profiles.role end,
    display_name = excluded.display_name,
    avatar = excluded.avatar,
    avatar_image = coalesce(excluded.avatar_image, public.profiles.avatar_image),
    login_name = coalesce(excluded.login_name, public.profiles.login_name),
    classroom_id = case when has_class then excluded.classroom_id else public.profiles.classroom_id end,
    is_admin = case when has_admin then excluded.is_admin else public.profiles.is_admin end;
  insert into public.learner_state (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
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
  room_id uuid;
  kids jsonb;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if not found then
    return jsonb_build_object('role', '', 'is_admin', false, 'children', '[]'::jsonb);
  end if;
  if me.role = 'teacher' then
    select id into room_id from public.classrooms where teacher_id = me.id;
    if found then
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', profile.id, 'display_name', profile.display_name,
        'avatar', profile.avatar, 'avatar_image', profile.avatar_image,
        'login_name', profile.login_name
      ) order by profile.display_name), '[]'::jsonb)
      into kids
      from public.profiles profile
      where profile.classroom_id = room_id and profile.role = 'child';
    else
      kids := '[]'::jsonb;
    end if;
  elsif me.role = 'parent' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', profile.id, 'display_name', profile.display_name,
      'avatar', profile.avatar, 'avatar_image', profile.avatar_image,
      'login_name', profile.login_name
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
    'is_admin', me.is_admin,
    'children', kids
  );
end;
$$;

update public.profiles set is_admin = true where role = 'teacher';

update auth.users u
set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || '{"admin": true}'::jsonb
where u.id in (select id from public.profiles where role = 'teacher');

notify pgrst, 'reload schema';
