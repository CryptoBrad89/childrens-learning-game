-- Bind authorization to the authenticated actor; profile and Auth rename commit together.
create function public.edit_other_grownup_profile(p_actor uuid,p_target uuid,p_handle text,p_display_name text,p_avatar text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='grownup' and (id=p_target or is_master)) then
    raise exception 'Only the master can edit another grown-up' using errcode='42501';
  end if;
  perform public.edit_grownup_profile(p_target,p_handle,p_display_name,p_avatar);
end;
$$;
revoke all on function public.edit_other_grownup_profile(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.edit_other_grownup_profile(uuid,uuid,text,text,text) to service_role;
