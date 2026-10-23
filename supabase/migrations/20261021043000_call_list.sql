-- Call list: one master, linked children, progress resets, and session limits.
-- Does not rename, re-password, or delete any existing account.
-- Apply on little-woof (shkmpxaejiuqzejsdwyr) only.

alter table public.profiles add column if not exists is_master boolean not null default false;
alter table public.learner_state add column if not exists progress_epoch jsonb;

alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check
  check (avatar in (
    'pup', 'fox', 'bear', 'owl', 'fish', 'star', 'moon', 'boat',
    'garden', 'nap', 'mail', 'leap', 'wave', 'nudge'
  ));

create unique index if not exists profiles_one_master
  on public.profiles ((1))
  where is_master;

insert into public.guardians (parent_id, child_id)
select room.teacher_id, child.id
from public.profiles child
join public.classrooms room on room.id = child.classroom_id
where child.role = 'child'
on conflict do nothing;

create table if not exists public.game_defaults (
  id integer primary key check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.game_defaults (id) values (1) on conflict (id) do nothing;

create table if not exists public.session_marks (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  started_at timestamptz not null,
  last_active_at timestamptz not null
);

alter table public.game_defaults enable row level security;
alter table public.session_marks enable row level security;
revoke all on table public.game_defaults from public, anon, authenticated;
revoke all on table public.session_marks from public, anon, authenticated;
grant all on table public.game_defaults, public.session_marks to service_role;

create or replace function private.epoch_time(item jsonb)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
begin
  if item is null or not private.sane_time(item->>'t') then
    return null;
  end if;
  return (item->>'t')::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function private.is_master_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_master
  );
$$;

create or replace function private.can_manage(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.is_master_user()
    or exists (
      select 1 from public.guardians link
      where link.child_id = p_user_id
        and link.parent_id = (select auth.uid())
        and exists (
          select 1 from public.profiles me
          where me.id = (select auth.uid()) and me.role in ('teacher', 'parent')
        )
    )
    or exists (
      select 1
      from public.profiles child
      join public.classrooms room on room.id = child.classroom_id
      where child.id = p_user_id
        and child.role = 'child'
        and room.teacher_id = (select auth.uid())
        and private.jwt_role() = 'teacher'
    );
$$;

create or replace function private.session_expired(p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me public.profiles;
  mark public.session_marks;
begin
  select * into me from public.profiles where id = p_user_id;
  if not found then
    return false;
  end if;
  select * into mark from public.session_marks where user_id = p_user_id;
  if not found then
    return false;
  end if;
  if me.role = 'child' then
    return mark.started_at <= now() - interval '6 hours';
  end if;
  return mark.last_active_at <= now() - interval '30 minutes';
end;
$$;

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
  if new_avatar not in (
    'pup', 'fox', 'bear', 'owl', 'fish', 'star', 'moon', 'boat',
    'garden', 'nap', 'mail', 'leap', 'wave', 'nudge'
  ) then
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
  insert into public.profiles (id, role, display_name, avatar, avatar_image, login_name, classroom_id, is_admin, is_master)
  values (
    new.id,
    new_role,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Grown-up'), 40),
    new_avatar,
    new_image,
    new_login,
    new_class,
    new_admin,
    false
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
  kids jsonb;
  grown jsonb := '[]'::jsonb;
begin
  select * into me from public.profiles where id = (select auth.uid());
  if not found or me.role = 'child' then
    return jsonb_build_object(
      'role', coalesce(me.role, ''),
      'is_admin', false,
      'is_master', false,
      'children', '[]'::jsonb,
      'grownups', '[]'::jsonb
    );
  end if;
  if me.is_master then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', profile.id,
      'display_name', profile.display_name,
      'avatar', profile.avatar,
      'avatar_image', profile.avatar_image,
      'login_name', profile.login_name,
      'guardians', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', grown_profile.id,
          'display_name', grown_profile.display_name,
          'login_name', grown_profile.login_name,
          'you', grown_profile.id = me.id
        ) order by grown_profile.display_name), '[]'::jsonb)
        from public.guardians link
        join public.profiles grown_profile on grown_profile.id = link.parent_id
        where link.child_id = profile.id
      )
    ) order by profile.display_name), '[]'::jsonb)
    into kids
    from public.profiles profile
    where profile.role = 'child';
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', grown_profile.id,
      'display_name', grown_profile.display_name,
      'login_name', grown_profile.login_name,
      'avatar', grown_profile.avatar,
      'avatar_image', grown_profile.avatar_image,
      'is_master', grown_profile.is_master,
      'self', grown_profile.id = me.id
    ) order by grown_profile.display_name), '[]'::jsonb)
    into grown
    from public.profiles grown_profile
    where grown_profile.role in ('teacher', 'parent');
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', profile.id,
      'display_name', profile.display_name,
      'avatar', profile.avatar,
      'avatar_image', profile.avatar_image,
      'login_name', profile.login_name,
      'guardians', jsonb_build_array(jsonb_build_object(
        'id', me.id,
        'display_name', me.display_name,
        'login_name', me.login_name,
        'you', true
      ))
    ) order by profile.display_name), '[]'::jsonb)
    into kids
    from public.profiles profile
    where profile.role = 'child'
      and (
        exists (
          select 1 from public.guardians link
          where link.parent_id = me.id and link.child_id = profile.id
        )
        or exists (
          select 1 from public.classrooms room
          where room.teacher_id = me.id and room.id = profile.classroom_id
        )
      );
  end if;
  return jsonb_build_object(
    'role', me.role,
    'display_name', me.display_name,
    'login_name', me.login_name,
    'avatar', me.avatar,
    'avatar_image', me.avatar_image,
    'is_admin', me.is_admin,
    'is_master', me.is_master,
    'children', kids,
    'grownups', grown
  );
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
  next_epoch jsonb;
  stored_t timestamptz;
  incoming_t timestamptz;
  setting_keys text[] := array['voice', 'volume', 'effects', 'calm', 'letters', 'hintAfter', 'games', 'kidControls'];
  theme_keys text[] := array['post', 'space', 'silk'];
  empty_progress jsonb := jsonb_build_object(
    'post', jsonb_build_object('letters', '{}'::jsonb, 'counts', '{}'::jsonb),
    'space', jsonb_build_object('letters', '{}'::jsonb, 'counts', '{}'::jsonb),
    'silk', jsonb_build_object('letters', '{}'::jsonb, 'counts', '{}'::jsonb)
  );
begin
  if private.session_expired((select auth.uid())) then
    raise exception 'signed out for safety' using errcode = '28000';
  end if;
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
  if private.can_manage(p_user_id) and (select auth.uid()) is distinct from p_user_id then
    next_settings := private.merge_registers(stored.settings, incoming->'settings', setting_keys);
  elsif (select auth.uid()) = p_user_id and exists (
    select 1 from public.profiles where id = (select auth.uid()) and role in ('teacher', 'parent')
  ) then
    next_settings := private.merge_registers(stored.settings, incoming->'settings', setting_keys);
  else
    next_settings := private.merge_registers(stored.settings, '{}'::jsonb, setting_keys);
  end if;
  stored_t := private.epoch_time(stored.progress_epoch);
  incoming_t := private.epoch_time(incoming->'progressEpoch');
  if stored_t is null and incoming_t is null then
    next_progress := private.merge_progress(stored.progress, incoming->'progress');
    next_achievements := private.merge_achievements(stored.achievements, incoming->'achievements');
    next_epoch := null;
  elsif stored_t is null or (incoming_t is not null and incoming_t > stored_t) then
    next_progress := private.merge_progress(empty_progress, incoming->'progress');
    next_achievements := private.merge_achievements('{}'::jsonb, incoming->'achievements');
    next_epoch := jsonb_build_object('v', incoming->'progressEpoch'->'v', 't', incoming->'progressEpoch'->>'t');
  elsif incoming_t is null or stored_t > incoming_t then
    next_progress := private.merge_progress(stored.progress, empty_progress);
    next_achievements := private.merge_achievements(stored.achievements, '{}'::jsonb);
    next_epoch := stored.progress_epoch;
  else
    next_progress := private.merge_progress(stored.progress, incoming->'progress');
    next_achievements := private.merge_achievements(stored.achievements, incoming->'achievements');
    next_epoch := stored.progress_epoch;
  end if;
  next_themes := private.merge_registers(stored.themes, incoming->'themes', theme_keys);
  update public.learner_state
  set settings = next_settings,
      progress = next_progress,
      achievements = next_achievements,
      themes = next_themes,
      progress_epoch = next_epoch,
      updated_at = now()
  where user_id = p_user_id;
  return jsonb_build_object(
    'settings', next_settings,
    'progress', next_progress,
    'achievements', next_achievements,
    'themes', next_themes,
    'progressEpoch', next_epoch
  );
end;
$$;

create or replace function public.touch_session(p_start boolean default false, p_peek boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  me public.profiles;
  mark public.session_marks;
  now_ts timestamptz := now();
  limit_name text;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'reason', 'sign-in');
  end if;
  select * into me from public.profiles where id = (select auth.uid());
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'sign-in');
  end if;
  limit_name := case when me.role = 'child' then 'sign-in' else 'inactivity' end;
  select * into mark from public.session_marks where user_id = me.id;
  if p_peek and not p_start then
    if not found then
      return jsonb_build_object('ok', true, 'limit', limit_name);
    end if;
    if me.role = 'child' and mark.started_at <= now_ts - interval '6 hours' then
      return jsonb_build_object('ok', false, 'reason', 'safety', 'limit', 'sign-in', 'started_at', mark.started_at, 'last_active_at', mark.last_active_at);
    end if;
    if me.role <> 'child' and mark.last_active_at <= now_ts - interval '30 minutes' then
      return jsonb_build_object('ok', false, 'reason', 'safety', 'limit', 'inactivity', 'started_at', mark.started_at, 'last_active_at', mark.last_active_at);
    end if;
    return jsonb_build_object('ok', true, 'started_at', mark.started_at, 'last_active_at', mark.last_active_at, 'limit', limit_name);
  end if;
  if p_start or not found then
    insert into public.session_marks (user_id, started_at, last_active_at)
    values (me.id, now_ts, now_ts)
    on conflict (user_id) do update
      set started_at = now_ts, last_active_at = now_ts;
    return jsonb_build_object('ok', true, 'started_at', now_ts, 'last_active_at', now_ts, 'limit', limit_name);
  end if;
  if me.role = 'child' and mark.started_at <= now_ts - interval '6 hours' then
    return jsonb_build_object('ok', false, 'reason', 'safety', 'limit', 'sign-in');
  end if;
  if me.role <> 'child' and mark.last_active_at <= now_ts - interval '30 minutes' then
    return jsonb_build_object('ok', false, 'reason', 'safety', 'limit', 'inactivity');
  end if;
  update public.session_marks set last_active_at = now_ts where user_id = me.id;
  return jsonb_build_object('ok', true, 'started_at', mark.started_at, 'last_active_at', now_ts, 'limit', limit_name);
end;
$$;

create or replace function public.kid_progress(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  row public.learner_state;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in first' using errcode = '28000';
  end if;
  if not private.can_manage(p_user_id) and (select auth.uid()) is distinct from p_user_id then
    raise exception 'not-linked' using errcode = '42501';
  end if;
  select * into row from public.learner_state where user_id = p_user_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  return jsonb_build_object(
    'ok', true,
    'progress', row.progress,
    'achievements', row.achievements,
    'settings', row.settings,
    'progressEpoch', row.progress_epoch,
    'updated_at', row.updated_at
  );
end;
$$;

create or replace function public.read_game_defaults()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select settings from public.game_defaults where id = 1;
$$;

create or replace function public.write_game_defaults(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_master_user() then
    return jsonb_build_object('ok', false, 'code', 'not-master');
  end if;
  update public.game_defaults
  set settings = coalesce(p_settings, '{}'::jsonb), updated_at = now()
  where id = 1;
  return jsonb_build_object('ok', true, 'settings', p_settings);
end;
$$;

revoke all on function private.epoch_time(jsonb) from public;
revoke all on function private.is_master_user() from public;
revoke all on function private.session_expired(uuid) from public;
grant execute on function private.is_master_user() to authenticated;
grant execute on function private.session_expired(uuid) to authenticated;

revoke all on function public.touch_session(boolean, boolean) from public;
revoke all on function public.kid_progress(uuid) from public;
revoke all on function public.read_game_defaults() from public;
revoke all on function public.write_game_defaults(jsonb) from public;
grant execute on function public.touch_session(boolean, boolean) to authenticated;
grant execute on function public.kid_progress(uuid) to authenticated;
grant execute on function public.read_game_defaults() to authenticated;
grant execute on function public.write_game_defaults(jsonb) to authenticated;

notify pgrst, 'reload schema';
