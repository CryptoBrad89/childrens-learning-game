-- Bootstrap once by handle, then bind authority permanently to the account ID.
alter table public.profiles add column is_master boolean not null default false;
alter table public.profiles add constraint master_is_grownup check (not is_master or role='grownup');
create unique index profiles_one_master on public.profiles (is_master) where is_master;
do $$
declare master_id uuid;
begin
  select id into master_id from public.profiles where role='grownup' and handle='test';
  if master_id is null then
    select id into master_id from public.profiles where role='grownup' and handle='r2_adult_mvfnzyk3390_new';
  end if;
  if master_id is null then raise exception 'Existing master account required'; end if;
  update public.profiles set is_master=true where id=master_id;
end;
$$;

-- Unique index gives at most one; this trigger preserves the seeded master,
-- giving at least one even through Auth cascades or service-role writes.
create function private.protect_portal_master() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='TRUNCATE' then raise exception 'The master account must be kept'; end if;
  if old.is_master and (tg_op='DELETE' or not new.is_master or new.id<>old.id or new.role<>'grownup') then
    raise exception 'The master account must be kept';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.protect_portal_master() from public,anon,authenticated;
create trigger protect_portal_master before update or delete on public.profiles for each row execute function private.protect_portal_master();
create trigger protect_portal_master_truncate before truncate on public.profiles for each statement execute function private.protect_portal_master();

create function private.is_master() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.profiles where id=(select auth.uid()) and is_master and role='grownup');
$$;
revoke all on function private.is_master() from public,anon;
grant execute on function private.is_master() to authenticated;
create policy master_reads_grownups on public.profiles for select to authenticated using (role='grownup' and (select private.is_master()));

-- Runs in the same transaction as Auth deletion. Serialize grown-up deletions
-- on the permanent master row so simultaneous deletions cannot orphan a child.
create function private.keep_children_linked() returns trigger language plpgsql security definer set search_path='' as $$
declare master_id uuid;
begin
  if old.role='grownup' and not old.is_master then
    select id into strict master_id from public.profiles where is_master for update;
    insert into public.guardians(adult_id,child_id)
      select master_id,g.child_id from public.guardians g
      where g.adult_id=old.id and not exists (
        select 1 from public.guardians other where other.child_id=g.child_id and other.adult_id<>old.id
      ) on conflict do nothing;
  end if;
  return old;
end;
$$;
revoke all on function private.keep_children_linked() from public,anon,authenticated;
create trigger keep_children_linked before delete on public.profiles for each row execute function private.keep_children_linked();

create or replace function public.provision_account(p_id uuid,p_handle text,p_display_name text,p_role text,p_adult uuid default null,p_class uuid default null) returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_role='child' then
    if p_adult is null or not exists(select 1 from public.profiles where id=p_adult and role='grownup') then raise exception 'A grown-up is required'; end if;
  elsif p_role<>'grownup' then raise exception 'Invalid account role';
  elsif p_adult is null or not exists(select 1 from public.profiles where id=p_adult and is_master) then
    raise exception 'Master account required' using errcode='42501';
  end if;
  if p_class is not null and (p_role<>'child' or not exists(select 1 from public.classes where id=p_class and owner_id=p_adult)) then raise exception 'Class access denied' using errcode='42501'; end if;
  insert into public.profiles(id,handle,display_name,role) values(p_id,p_handle,p_display_name,p_role) on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id=p_id and handle=p_handle and role=p_role) then raise exception 'Account conflicts'; end if;
  if p_role='child' then insert into public.guardians(adult_id,child_id) values(p_adult,p_id) on conflict do nothing; end if;
  if p_class is not null then insert into public.class_children(class_id,child_id) values(p_class,p_id) on conflict do nothing; end if;
end;
$$;
