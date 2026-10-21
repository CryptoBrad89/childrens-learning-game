-- Forward-only migration. No existing account, password, session, or setting is changed.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Auth HTTP endpoints use supabase_auth_admin, not this function owner's role.
-- Keep unrelated Auth bookkeeping working; sensitive portal changes go through SQL.
create function private.guard_portal_credentials() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password or new.email is distinct from old.email then
    if current_user <> 'postgres' then
      raise exception 'Use the password-confirmed portal action' using errcode='42501';
    end if;
    if exists(select 1 from public.profiles where id=old.id and is_master) then
      raise exception 'The master account must be kept unchanged' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_portal_credentials() from public,anon,authenticated;
create trigger guard_portal_credentials before update of encrypted_password,email on auth.users
  for each row execute function private.guard_portal_credentials();

create function private.guard_master_profile() returns trigger
language plpgsql set search_path='' as $$
begin
  if old.is_master and new is distinct from old then
    raise exception 'The master account must be kept unchanged' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_master_profile() from public,anon,authenticated;
create trigger guard_master_profile before update on public.profiles
  for each row execute function private.guard_master_profile();

create function public.verify_risky_password(p_password text) returns boolean
language plpgsql security definer set search_path='' as $$
declare secret text;
begin
  if not private.session_valid() or not exists(select 1 from public.profiles where id=auth.uid() and role='grownup') then return false; end if;
  if p_password is null or p_password='' then return false; end if;
  select encrypted_password into secret from auth.users where id=auth.uid();
  return coalesce(secret<>'' and extensions.crypt(p_password,secret)=secret,false);
end;
$$;
revoke all on function public.verify_risky_password(text) from public,anon;
grant execute on function public.verify_risky_password(text) to authenticated;

create function public.set_account_password(p_actor uuid,p_target uuid,p_password text) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_password is null or char_length(p_password)<6 then raise exception 'Use at least 6 characters'; end if;
  perform id from public.profiles where id=p_target for update;
  if not exists(select 1 from public.profiles where id=p_target and not is_master) then raise exception 'Choose a regular account' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles a join public.profiles t on t.id=p_target
    where a.id=p_actor and a.role='grownup' and (a.id=t.id or a.is_master or
      (t.role='child' and exists(select 1 from public.guardians where adult_id=a.id and child_id=t.id)))) then
    raise exception 'Account is not accessible' using errcode='42501';
  end if;
  update auth.users set encrypted_password=extensions.crypt(p_password,extensions.gen_salt('bf',10)),updated_at=now() where id=p_target;
end;
$$;
revoke all on function public.set_account_password(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_account_password(uuid,uuid,text) to service_role;

create or replace function public.patch_child_settings(p_adult uuid,p_children uuid[],p_patch jsonb,p_reset boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare children uuid[]; child uuid; result jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'Grown-up required' using errcode='42501'; end if;
  if p_children is null or cardinality(p_children) < 1 or array_position(p_children,null) is not null or cardinality(p_children)<>(select count(distinct id) from unnest(p_children) id) then raise exception 'Choose at least one child'; end if;
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

create or replace function public.transfer_children(p_actor uuid,p_children uuid[],p_source uuid,p_destination uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare child uuid; results jsonb:='[]'::jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_actor and is_master and role='grownup') then raise exception 'Master required' using errcode='42501'; end if;
  if p_children is null or cardinality(p_children) < 1 or array_position(p_children,null) is not null
    or cardinality(p_children)<>(select count(distinct id) from unnest(p_children) id) then raise exception 'Choose distinct children'; end if;
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

-- Compare the server-observed handle under the same lock as all profile writes.
-- A name/picture-only request cannot revert a concurrent verified username change.
create function public.edit_confirmed_profile(p_actor uuid,p_target uuid,p_expected_handle text,p_handle text,p_display_name text,p_avatar text) returns void
language plpgsql security definer set search_path='' as $$
declare target public.profiles;
begin
  select * into target from public.profiles where id=p_target for update;
  if not found or target.is_master then raise exception 'Choose a regular account' using errcode='42501'; end if;
  if target.handle is distinct from p_expected_handle then raise exception 'Account changed. Reload and try again'; end if;
  if target.role='child' then
    perform public.edit_child_profile(p_actor,p_target,p_handle,p_display_name);
    if p_avatar is not null then update public.profiles set avatar=p_avatar where id=p_target; end if;
  else
    perform public.edit_other_grownup_profile(p_actor,p_target,p_handle,p_display_name,coalesce(p_avatar,target.avatar));
  end if;
end;
$$;
revoke all on function public.edit_confirmed_profile(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.edit_confirmed_profile(uuid,uuid,text,text,text,text) to service_role;

-- The job contains only immutable action inputs and outcomes, never passwords.
create table private.bulk_actions (
 id uuid primary key default gen_random_uuid(),
 actor uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 session_id uuid not null references auth.sessions(id) on delete cascade,
 action text not null,
 targets uuid[] not null,
 parameters jsonb not null,
 cursor integer not null default 0,
 results jsonb not null default '[]',
 lease uuid,
 lease_until timestamptz,
 expires_at timestamptz not null default now()+interval '2 hours',
 unique(actor,session_id,request_id)
);
alter table private.bulk_actions enable row level security;
revoke all on private.bulk_actions from public,anon,authenticated,service_role;

create function public.start_bulk_action(p_action text,p_targets uuid[],p_parameters jsonb,p_password text default null,p_request_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); sid uuid; job uuid; master boolean; previous private.bulk_actions;
begin
  if not private.session_valid() then raise exception 'Sign in again' using errcode='28000'; end if;
  select is_master into master from public.profiles where id=actor and role='grownup';
  if master is null then raise exception 'Grown-up required' using errcode='42501'; end if;
  if p_action not in ('delete-children','delete-grownups','reset-children-progress','reset-grownups-progress','transfer-children','patch-child-settings') then raise exception 'Invalid bulk action'; end if;
  if p_targets is null or cardinality(p_targets)<1 or array_position(p_targets,null) is not null or cardinality(p_targets)<>(select count(distinct id) from unnest(p_targets) id) then raise exception 'Choose distinct accounts'; end if;
  if p_action in ('delete-grownups','reset-grownups-progress','transfer-children') and not master then raise exception 'Master required' using errcode='42501'; end if;
  if p_parameters is null or jsonb_typeof(p_parameters)<>'object' then raise exception 'Invalid parameters'; end if;
  if p_parameters - array['patch','reset','source_id','destination_id'] <> '{}'::jsonb then raise exception 'Invalid parameters'; end if;
  sid:=(auth.jwt()->>'session_id')::uuid;
  if p_request_id is not null then
    -- Serialize identical submissions without sharing state between different actions.
    perform pg_advisory_xact_lock(hashtextextended(actor::text||sid::text||p_request_id::text,0));
    select * into previous from private.bulk_actions b where b.actor=auth.uid() and b.session_id=sid and b.request_id=p_request_id and b.expires_at>now();
    if found then
      if previous.action is distinct from p_action or previous.targets is distinct from p_targets or previous.parameters is distinct from p_parameters then raise exception 'Action request conflicts'; end if;
      return previous.id;
    end if;
  end if;
  if p_action <> 'patch-child-settings' and not public.verify_risky_password(p_password) then raise exception 'Your current password did not match' using errcode='42501'; end if;
  if p_action='patch-child-settings' then
    if not private.valid_settings_patch(p_parameters->'patch') or
      (p_parameters ? 'reset' and jsonb_typeof(p_parameters->'reset')<>'boolean') or
      (coalesce((p_parameters->>'reset')::boolean,false) and p_parameters->'patch'<>'{}'::jsonb) then raise exception 'Invalid settings patch'; end if;
    if exists(select 1 from unnest(p_targets) child where not private.can_manage_child(actor,child)) then raise exception 'Linked grown-up required for every child' using errcode='42501'; end if;
  elsif p_action='transfer-children' then
    if p_parameters->>'source_id'=p_parameters->>'destination_id' or
      (select count(*) from public.profiles where id in ((p_parameters->>'source_id')::uuid,(p_parameters->>'destination_id')::uuid) and role='grownup')<>2 then raise exception 'Choose different grown-ups'; end if;
  end if;
  sid:=(auth.jwt()->>'session_id')::uuid;
  delete from private.bulk_actions b where b.actor=auth.uid() and b.expires_at<now();
  insert into private.bulk_actions(actor,session_id,action,targets,parameters,request_id) values(actor,sid,p_action,p_targets,p_parameters,coalesce(p_request_id,gen_random_uuid())) returning id into job;
  return job;
end;
$$;
revoke all on function public.start_bulk_action(text,uuid[],jsonb,text,uuid) from public,anon;
grant execute on function public.start_bulk_action(text,uuid[],jsonb,text,uuid) to authenticated;

create function public.claim_bulk_action(p_job uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.bulk_actions;
begin
  if not private.session_valid() then raise exception 'Sign in again' using errcode='28000'; end if;
  select * into j from private.bulk_actions where id=p_job and actor=auth.uid() and session_id=(auth.jwt()->>'session_id')::uuid and expires_at>now() for update;
  if not found then raise exception 'Action unavailable for this session' using errcode='42501'; end if;
  if j.cursor>=cardinality(j.targets) then return jsonb_build_object('done',true,'results',j.results); end if;
  if j.lease_until>now() then return jsonb_build_object('busy',true,'done',false,'results',j.results); end if;
  update private.bulk_actions set lease=gen_random_uuid(),lease_until=now()+interval '45 seconds' where id=j.id returning * into j;
  return jsonb_build_object('action',j.action,'targets',j.targets[j.cursor+1:least(j.cursor+10,cardinality(j.targets))],
    'parameters',j.parameters,'cursor',j.cursor,'lease',j.lease);
end;
$$;
revoke all on function public.claim_bulk_action(uuid) from public,anon;
grant execute on function public.claim_bulk_action(uuid) to authenticated;

create function public.finish_bulk_action(p_job uuid,p_actor uuid,p_lease uuid,p_results jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.bulk_actions; n integer;
begin
  select * into j from private.bulk_actions where id=p_job and actor=p_actor for update;
  if not found or j.lease is distinct from p_lease then raise exception 'Action lease changed'; end if;
  n:=least(10,cardinality(j.targets)-j.cursor);
  if jsonb_typeof(p_results)<>'array' or jsonb_array_length(p_results)<>n then raise exception 'Incomplete batch'; end if;
  update private.bulk_actions set cursor=cursor+n,results=results||p_results,lease=null,lease_until=null where id=j.id returning * into j;
  return jsonb_build_object('done',j.cursor>=cardinality(j.targets),'results',j.results);
end;
$$;
revoke all on function public.finish_bulk_action(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.finish_bulk_action(uuid,uuid,uuid,jsonb) to service_role;

create function public.process_bulk_action(p_job uuid,p_actor uuid,p_lease uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j private.bulk_actions; target uuid; outcome jsonb; outcomes jsonb:='[]'; master boolean;
begin
  select * into j from private.bulk_actions where id=p_job and actor=p_actor for update;
  if not found or j.lease is distinct from p_lease then raise exception 'Action lease changed'; end if;
  select is_master into master from public.profiles where id=p_actor and role='grownup';
  if master is null then raise exception 'Grown-up required'; end if;
  foreach target in array j.targets[j.cursor+1:least(j.cursor+10,cardinality(j.targets))] loop
    begin
      if j.action='transfer-children' then
        outcome:=public.transfer_children(p_actor,array[target],(j.parameters->>'source_id')::uuid,(j.parameters->>'destination_id')::uuid)->'results'->0;
      elsif j.action='patch-child-settings' then
        perform public.patch_child_settings(p_actor,array[target],j.parameters->'patch',coalesce((j.parameters->>'reset')::boolean,false));
        outcome:=jsonb_build_object('id',target,'ok',true);
      elsif j.action='reset-children-progress' then
        perform public.reset_child_progress(p_actor,target);
        outcome:=jsonb_build_object('id',target,'ok',true);
      elsif j.action='reset-grownups-progress' then
        if target=p_actor then raise exception 'Choose another grown-up'; end if;
        perform public.reset_grownup_progress(p_actor,target);
        outcome:=jsonb_build_object('id',target,'ok',true);
      else raise exception 'Invalid worker action';
      end if;
    exception when others then outcome:=jsonb_build_object('id',target,'ok',false,'reason','not-accessible-or-failed');
    end;
    outcomes:=outcomes||jsonb_build_array(outcome);
  end loop;
  -- SQL mutations and saved outcomes commit together: a lost response never repeats a reset.
  return public.finish_bulk_action(p_job,p_actor,p_lease,outcomes);
end;
$$;
revoke all on function public.process_bulk_action(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.process_bulk_action(uuid,uuid,uuid) to service_role;

-- All legacy mutators remain behind the verified Edge service boundary.
revoke all on function public.reset_own_progress(uuid),public.reset_child_progress(uuid,uuid),
 public.reset_grownup_progress(uuid,uuid),public.unlink_child(uuid,uuid,uuid),
 public.transfer_children(uuid,uuid[],uuid,uuid),public.edit_child_profile(uuid,uuid,text,text),
 public.edit_grownup_profile(uuid,text,text,text),public.edit_other_grownup_profile(uuid,uuid,text,text,text),
 public.provision_account(uuid,text,text,text,uuid,uuid),public.patch_child_settings(uuid,uuid[],jsonb,boolean)
 from public,anon,authenticated;
