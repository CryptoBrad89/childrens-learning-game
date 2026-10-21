-- Only the authenticated Edge action supplies p_actor; clients cannot call this RPC.
create function public.reset_own_progress(p_actor uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='grownup') then
    raise exception 'Grown-up required' using errcode='42501';
  end if;
  update public.profiles set progress_version=progress_version+1 where id=p_actor;
  delete from public.operations where user_id=p_actor and kind='round';
end;
$$;
revoke all on function public.reset_own_progress(uuid) from public,anon,authenticated;
grant execute on function public.reset_own_progress(uuid) to service_role;
