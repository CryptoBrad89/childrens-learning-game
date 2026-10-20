-- Game defaults and sparse child overrides have one authoritative server owner.
create function private.valid_settings_patch(data jsonb) returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(data) = 'object' and not exists (
    select 1 from jsonb_each(data) entry where entry.key not in ('voice','volume','effects','calm','letters','hintAfter','games','kidControls')
      or not coalesce(private.valid_event('setting',jsonb_build_object('field',entry.key,'value',entry.value)),false)
  ),false);
$$;
revoke all on function private.valid_settings_patch(jsonb) from public;
grant execute on function private.valid_settings_patch(jsonb) to authenticated,service_role;

create table public.game_settings (
  singleton boolean primary key default true check(singleton),
  settings jsonb not null check(private.valid_settings_patch(settings) and settings ?& array['voice','volume','effects','calm','letters','hintAfter','games','kidControls'])
);
insert into public.game_settings(settings) values(jsonb_build_object(
  'voice',true,'volume',100,'effects',true,'calm',false,
  'letters',to_jsonb(regexp_split_to_array('ABCDEFGHIJKLMNOPQRSTUVWXYZ','')),
  'hintAfter',2,'games',jsonb_build_array('post','space','silk'),'kidControls',true));
create table public.child_settings (
  child_id uuid primary key references public.profiles(id) on delete cascade,
  overrides jsonb not null default '{}'::jsonb check(private.valid_settings_patch(overrides))
);
-- Preserve only explicit legacy choices. Missing fields continue to inherit defaults.
insert into public.child_settings(child_id,overrides)
select user_id,jsonb_object_agg(field,value) from (
  select distinct on (o.user_id,o.payload->>'field') o.user_id,o.payload->>'field' field,o.payload->'value' value
  from public.operations o join public.profiles p on p.id=o.user_id and p.role='child'
  where o.kind='setting' and o.payload->>'field' in ('voice','volume','effects','calm','letters','hintAfter','games','kidControls')
  order by o.user_id,o.payload->>'field',o.seq desc
) latest group by user_id;
alter table public.game_settings enable row level security;
alter table public.child_settings enable row level security;
revoke all on public.game_settings,public.child_settings from anon,authenticated;
grant select on public.game_settings to anon,authenticated;
grant select on public.child_settings to authenticated;
grant all on public.game_settings,public.child_settings to service_role;
create policy game_settings_read on public.game_settings for select to anon,authenticated using (true);
create policy child_settings_read on public.child_settings for select to authenticated using(private.can_access_person(child_id));

create function public.patch_game_settings(p_adult uuid,p_patch jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'Grown-up required' using errcode='42501'; end if;
  if not private.valid_settings_patch(p_patch) then raise exception 'Invalid settings patch'; end if;
  update public.game_settings set settings=settings || p_patch where singleton returning settings into result;
  return jsonb_build_object('settings',result);
end;
$$;
create function public.patch_child_settings(p_adult uuid,p_children uuid[],p_patch jsonb,p_reset boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare children uuid[]; child uuid; result jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'Grown-up required' using errcode='42501'; end if;
  if p_children is null or cardinality(p_children) not between 1 and 100 or array_position(p_children,null) is not null then raise exception 'Choose 1 to 100 children'; end if;
  if p_reset is null or not private.valid_settings_patch(p_patch) or (p_reset and p_patch <> '{}'::jsonb) then raise exception 'Invalid settings patch'; end if;
  select array_agg(distinct id order by id) into children from unnest(p_children) id;
  -- Serialize concurrent edits by child, including first inserts and resets.
  perform p.id from public.profiles p where p.id=any(children) order by p.id for update;
  if exists(select 1 from unnest(children) target(child_id) where not exists(
    select 1 from public.profiles p join public.guardians g on g.child_id=p.id
    where p.id=target.child_id and p.role='child' and g.adult_id=p_adult
  )) then raise exception 'Linked grown-up required for every child' using errcode='42501'; end if;
  foreach child in array children loop
    if p_reset then delete from public.child_settings where child_id=child;
    else
      insert into public.child_settings(child_id,overrides) values(child,p_patch)
      on conflict(child_id) do update set overrides=public.child_settings.overrides || excluded.overrides;
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object('child_id',id,'overrides',coalesce(c.overrides,'{}'::jsonb)) order by id)
    into result from unnest(children) id left join public.child_settings c on c.child_id=id;
  return jsonb_build_object('children',result);
end;
$$;
create function public.edit_child_profile(p_adult uuid,p_child uuid,p_handle text,p_display_name text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.guardians g join public.profiles a on a.id=g.adult_id join public.profiles c on c.id=g.child_id
    where g.adult_id=p_adult and g.child_id=p_child and a.role='grownup' and c.role='child') then
    raise exception 'Linked grown-up required' using errcode='42501';
  end if;
  update public.profiles set handle=p_handle,display_name=p_display_name where id=p_child;
  update auth.users set email=p_handle||'@accounts.littlewoof.invalid',updated_at=now() where id=p_child;
  update auth.identities set identity_data=jsonb_set(identity_data,'{email}',to_jsonb(p_handle||'@accounts.littlewoof.invalid')),updated_at=now() where user_id=p_child and provider='email';
end;
$$;
revoke all on function public.patch_game_settings(uuid,jsonb),public.patch_child_settings(uuid,uuid[],jsonb,boolean),public.edit_child_profile(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.patch_game_settings(uuid,jsonb),public.patch_child_settings(uuid,uuid[],jsonb,boolean),public.edit_child_profile(uuid,uuid,text,text) to service_role;
