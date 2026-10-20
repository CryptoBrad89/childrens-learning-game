-- Brandy manages every kid; other grown-ups remain limited to their linked kids.
create or replace function private.can_access_person(person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.session_valid() and (person=(select auth.uid()) or (select private.is_master()) or exists (
    select 1 from public.guardians where adult_id=(select auth.uid()) and child_id=person));
$$;
create policy master_reads_guardians on public.guardians for select to authenticated using ((select private.is_master()));

create function private.can_manage_child(actor uuid, child uuid) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.profiles a cross join public.profiles c
    where a.id=actor and a.role='grownup' and c.id=child and c.role='child'
      and (a.is_master or exists(select 1 from public.guardians g where g.adult_id=actor and g.child_id=child)));
$$;
revoke all on function private.can_manage_child(uuid,uuid) from public,anon,authenticated;
grant execute on function private.can_manage_child(uuid,uuid) to service_role;

create or replace function public.patch_game_settings(p_adult uuid,p_patch jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup' and is_master) then raise exception 'Master required' using errcode='42501'; end if;
  if not private.valid_settings_patch(p_patch) then raise exception 'Invalid settings patch'; end if;
  update public.game_settings set settings=settings || p_patch where singleton returning settings into result;
  return jsonb_build_object('settings',result);
end;
$$;

create or replace function public.patch_child_settings(p_adult uuid,p_children uuid[],p_patch jsonb,p_reset boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare children uuid[]; child uuid; result jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'Grown-up required' using errcode='42501'; end if;
  if p_children is null or cardinality(p_children) not between 1 and 100 or array_position(p_children,null) is not null then raise exception 'Choose 1 to 100 children'; end if;
  if p_reset is null or not private.valid_settings_patch(p_patch) or (p_reset and p_patch <> '{}'::jsonb) then raise exception 'Invalid settings patch'; end if;
  select array_agg(distinct id order by id) into children from unnest(p_children) id;
  -- Serialize concurrent edits by child, including first inserts and resets.
  perform p.id from public.profiles p where p.id=any(children) order by p.id for update;
  if exists(select 1 from unnest(children) target(child_id) where not private.can_manage_child(p_adult,target.child_id)) then raise exception 'Linked grown-up required for every child' using errcode='42501'; end if;
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

create or replace function public.edit_child_profile(p_adult uuid,p_child uuid,p_handle text,p_display_name text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_child(p_adult,p_child) then raise exception 'Linked grown-up required' using errcode='42501'; end if;
  update public.profiles set handle=p_handle,display_name=p_display_name where id=p_child;
  update auth.users set email=p_handle||'@accounts.littlewoof.invalid',updated_at=now() where id=p_child;
  update auth.identities set identity_data=jsonb_set(identity_data,'{email}',to_jsonb(p_handle||'@accounts.littlewoof.invalid')),updated_at=now() where user_id=p_child and provider='email';
end;
$$;

create or replace function public.reset_child_progress(p_adult uuid,p_child uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  if not private.can_manage_child(p_adult,p_child) then raise exception 'Linked grown-up required' using errcode='42501'; end if;
  update public.profiles set progress_version=progress_version+1 where id=p_child;
  delete from public.operations where user_id=p_child and kind='round';
end;
$$;

create function public.reset_grownup_progress(p_actor uuid,p_target uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_master and role='grownup')
    or not exists(select 1 from public.profiles where id=p_target and role='grownup' and not is_master) then
    raise exception 'Master and regular grown-up target required' using errcode='42501';
  end if;
  update public.profiles set progress_version=progress_version+1 where id=p_target;
  delete from public.operations where user_id=p_target and kind='round';
end;
$$;

create function public.unlink_child(p_actor uuid,p_child uuid,p_grownup uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare master_id uuid; actor_master boolean; rehomed boolean:=false;
begin
  -- Use the same master lock as grown-up deletion before changing assignments.
  select id into strict master_id from public.profiles where is_master for update;
  perform id from public.profiles where id=p_child for update;
  if not private.can_manage_child(p_actor,p_child) then raise exception 'Linked grown-up required' using errcode='42501'; end if;
  select is_master into actor_master from public.profiles where id=p_actor;
  if p_grownup<>p_actor and not actor_master then raise exception 'Master required' using errcode='42501'; end if;
  if not exists(select 1 from public.guardians where child_id=p_child and adult_id=p_grownup) then raise exception 'Link not found'; end if;
  if not exists(select 1 from public.guardians where child_id=p_child and adult_id<>p_grownup) then
    if p_grownup=master_id then return jsonb_build_object('ok',true,'kept_with_master',true,'rehomed',false); end if;
    insert into public.guardians(adult_id,child_id) values(master_id,p_child) on conflict do nothing;
    rehomed:=true;
  end if;
  delete from public.guardians where adult_id=p_grownup and child_id=p_child;
  return jsonb_build_object('ok',true,'kept_with_master',false,'rehomed',rehomed);
end;
$$;

create function public.transfer_children(p_actor uuid,p_children uuid[],p_source uuid,p_destination uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare child uuid; results jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_master and role='grownup') then raise exception 'Master required' using errcode='42501'; end if;
  if p_children is null or cardinality(p_children) not between 1 and 100 or array_position(p_children,null) is not null
    or cardinality(p_children)<>(select count(distinct id) from unnest(p_children) id) then raise exception 'Choose 1 to 100 distinct children'; end if;
  if p_source=p_destination or p_source is null or p_destination is null then raise exception 'Choose different grown-ups'; end if;
  -- Lock grown-ups before kids, consistently with unlink/delete.
  perform id from public.profiles where is_master for update;
  perform id from public.profiles where id in (p_source,p_destination) order by id for update;
  if (select count(*) from public.profiles where id in (p_source,p_destination) and role='grownup')<>2 then raise exception 'Choose two grown-ups'; end if;
  perform id from public.profiles where id=any(p_children) order by id for update;
  foreach child in array p_children loop
    if not exists(select 1 from public.profiles where id=child and role='child') then
      results:=results||jsonb_build_array(jsonb_build_object('id',child,'ok',false,'reason','not-found'));
    elsif not exists(select 1 from public.guardians where child_id=child and adult_id=p_source) then
      results:=results||jsonb_build_array(jsonb_build_object('id',child,'ok',false,'reason','not-linked-to-source'));
    else
      insert into public.guardians(adult_id,child_id) values(p_destination,child) on conflict do nothing;
      delete from public.guardians where adult_id=p_source and child_id=child;
      results:=results||jsonb_build_array(jsonb_build_object('id',child,'ok',true));
    end if;
  end loop;
  return jsonb_build_object('results',results);
end;
$$;
revoke all on function public.unlink_child(uuid,uuid,uuid),public.transfer_children(uuid,uuid[],uuid,uuid),public.reset_grownup_progress(uuid,uuid) from public,anon,authenticated;
grant execute on function public.unlink_child(uuid,uuid,uuid),public.transfer_children(uuid,uuid[],uuid,uuid),public.reset_grownup_progress(uuid,uuid) to service_role;
-- Preserve the legacy class relationship constraint while broadening person access.
alter policy class_children_insert on public.class_children with check (
  private.can_access_person(child_id) and child_id<>(select auth.uid())
  and exists(select 1 from public.profiles p where p.id=child_id and p.role='child')
  and exists(select 1 from public.classes c where c.id=class_id and c.owner_id=(select auth.uid()))
);
