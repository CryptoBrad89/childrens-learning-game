-- Profiles remain readable only by self and linked grown-ups; only service_role writes.
alter table public.profiles add column avatar text not null default '🐶'
  check (avatar in ('🐶','🐱','🐰','🦊','🐼','⭐') or
    (length(avatar) <= 150000 and avatar ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$'));

-- A service operator can bootstrap an initial grown-up; the public Edge endpoint
-- requires an existing grown-up for every creation, including legacy register calls.
create or replace function public.provision_account(p_id uuid,p_handle text,p_display_name text,p_role text,p_adult uuid default null,p_class uuid default null) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_role = 'child' then
    if p_adult is null or not exists(select 1 from public.profiles where id = p_adult and role = 'grownup') then raise exception 'A grown-up is required'; end if;
  elsif p_role <> 'grownup' then raise exception 'Invalid account role';
  elsif p_adult is not null and not exists(select 1 from public.profiles where id = p_adult and role = 'grownup') then raise exception 'A grown-up is required'; end if;
  if p_class is not null and (p_role <> 'child' or not exists(select 1 from public.classes where id = p_class and owner_id = p_adult)) then raise exception 'Class access denied' using errcode = '42501'; end if;
  insert into public.profiles(id,handle,display_name,role) values(p_id,p_handle,p_display_name,p_role) on conflict(id) do nothing;
  if not exists(select 1 from public.profiles where id = p_id and handle = p_handle and role = p_role) then raise exception 'Account conflicts'; end if;
  if p_role = 'child' and p_adult is not null then insert into public.guardians(adult_id,child_id) values(p_adult,p_id) on conflict do nothing; end if;
  if p_class is not null then insert into public.class_children(class_id,child_id) values(p_class,p_id) on conflict do nothing; end if;
end;
$$;
revoke all on function public.provision_account(uuid,text,text,text,uuid,uuid) from public, anon, authenticated;
grant execute on function public.provision_account(uuid,text,text,text,uuid,uuid) to service_role;
