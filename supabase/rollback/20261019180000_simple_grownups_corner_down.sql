-- Rollback for 20261019180000_simple_grownups_corner.sql only.
-- Not a migration: run by hand to go back to the accounts build's API (public
-- grown-up sign-up, groups and codes). Uploaded pictures are deleted.

drop function if exists
  public.lw_portal(), public.lw_children_states(), public.lw_add_child(text, text, text, text),
  public.lw_edit_child(uuid, text, text, text), public.lw_add_existing_child(text, text),
  public.lw_remove_child(uuid), public.lw_create_grownup(text, text, text), public.lw_remove_grownup(uuid),
  lw_private.team(uuid), lw_private.my_groups(uuid), lw_private.my_children(uuid),
  lw_private.make_grownup(text, text, text), lw_private.new_grownup(text, text, text, uuid),
  lw_private.check_child(text, text, text);

create or replace function lw_private.profile_json(p public.profiles) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'role', p.role, 'login', p.login, 'name', p.display_name, 'avatar', p.avatar)
$$;
alter table public.profiles drop column if exists picture;
drop function if exists lw_private.picture_ok(text);

do $$
declare f text;
begin
  for f in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname like 'lw\_%' loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
grant execute on function public.lw_sign_up(text, text, text) to anon;
grant execute on function public.lw_board(text) to anon;
