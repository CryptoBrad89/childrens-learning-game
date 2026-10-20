-- Existing in-game controls use the durable operation outbox. Project new setting
-- events into the same overrides as the corner, so neither path becomes stale.
create function private.project_child_setting() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.kind='setting' and new.payload->>'field' in ('voice','volume','effects','calm','letters','hintAfter','games','kidControls')
    and exists(select 1 from public.profiles where id=new.user_id and role='child') then
    insert into public.child_settings(child_id,overrides)
      values(new.user_id,jsonb_build_object(new.payload->>'field',new.payload->'value'))
      on conflict(child_id) do update set overrides=public.child_settings.overrides || excluded.overrides;
  end if;
  return new;
end;
$$;
revoke all on function private.project_child_setting() from public,anon,authenticated;
create trigger project_child_setting after insert on public.operations
  for each row execute function private.project_child_setting();
