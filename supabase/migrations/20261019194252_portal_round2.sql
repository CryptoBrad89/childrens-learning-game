-- A reset advances the child's round generation. Offline retries from an older
-- generation are acknowledged but cannot restore erased progress. Settings survive.
alter table public.profiles add column progress_version integer not null default 0;
alter table public.operations add column progress_version integer not null default 0;
grant insert(progress_version) on public.operations to authenticated;
create function private.check_progress_version() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'round' and new.progress_version <> (select progress_version from public.profiles where id=new.user_id for share) then
    raise exception 'Progress was reset. Refresh before saving new play.';
  end if;
  return new;
end;
$$;
create trigger operations_progress_version before insert on public.operations for each row execute function private.check_progress_version();

drop function public.sync_batch(uuid,jsonb);
create function public.sync_batch(p_owner uuid,p_events jsonb,p_progress_version integer default 0) returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb; event_id uuid; existing public.operations; acknowledged jsonb := '[]'::jsonb; current_version integer;
begin
  if not private.can_access_person(p_owner) then raise exception 'Person access denied' using errcode = '42501'; end if;
  select progress_version into current_version from public.profiles where id=p_owner for share;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 100 then raise exception 'Expected at most 100 events'; end if;
  for item in select value from jsonb_array_elements(p_events) loop
    if jsonb_typeof(item) <> 'object' or not (item ?& array['id','kind','payload']) or item - array['id','kind','payload'] <> '{}'::jsonb then raise exception 'Invalid event'; end if;
    event_id := (item->>'id')::uuid;
    if item->>'kind' <> 'round' or p_progress_version = current_version then
      insert into public.operations(id,user_id,kind,payload,progress_version) values(event_id,p_owner,item->>'kind',item->'payload',current_version) on conflict(id) do nothing;
      select * into existing from public.operations where id = event_id;
      if not found or existing.user_id <> p_owner or existing.kind <> item->>'kind' or existing.payload <> item->'payload' then
        raise exception 'Event ID conflicts with an existing event' using errcode = '23505';
      end if;
    end if;
    acknowledged := acknowledged || jsonb_build_array(event_id);
  end loop;
  return jsonb_build_object('acknowledged',acknowledged,'progress_version',current_version);
end;
$$;
revoke all on function public.sync_batch(uuid,jsonb,integer) from public,anon;
grant execute on function public.sync_batch(uuid,jsonb,integer) to authenticated;

create function public.reset_child_progress(p_adult uuid,p_child uuid) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.guardians g join public.profiles p on p.id=g.adult_id where g.adult_id=p_adult and g.child_id=p_child and p.role='grownup') then
    raise exception 'Linked grown-up required' using errcode='42501';
  end if;
  update public.profiles set progress_version=progress_version+1 where id=p_child and role='child';
  delete from public.operations where user_id=p_child and kind='round';
end;
$$;
revoke all on function public.reset_child_progress(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reset_child_progress(uuid,uuid) to service_role;

-- The synthetic Auth email is the username index. Change it and the profile in
-- one transaction so a failure cannot strand the account between two handles.
create function public.edit_grownup_profile(p_adult uuid,p_handle text,p_display_name text,p_avatar text) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'Grown-up required' using errcode='42501'; end if;
  update public.profiles set handle=p_handle,display_name=p_display_name,avatar=p_avatar where id=p_adult;
  update auth.users set email=p_handle||'@accounts.littlewoof.invalid',updated_at=now() where id=p_adult;
  update auth.identities set identity_data=jsonb_set(identity_data,'{email}',to_jsonb(p_handle||'@accounts.littlewoof.invalid')),updated_at=now() where user_id=p_adult and provider='email';
end;
$$;
revoke all on function public.edit_grownup_profile(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.edit_grownup_profile(uuid,text,text,text) to service_role;
