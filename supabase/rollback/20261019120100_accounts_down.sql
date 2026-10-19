-- Rollback for 20261019120000_accounts_schema.sql, 20261019120100_accounts_functions.sql,
-- 20261019140000_any_grownup_groups.sql and 20261019180000_simple_grownups_corner.sql.
-- Not a migration: run by hand only to remove accounts and sync completely.
-- It deletes every Letters with Lucy group, child, setting, round and sticker.

drop function if exists
  public.lw_sign_up(text, text, text), public.lw_me(), public.lw_change_password(text, text),
  public.lw_sync(uuid, jsonb, jsonb, jsonb, text), public.lw_put_settings(jsonb),
  public.lw_board(text), public.lw_groups(), public.lw_create_group(text, text),
  public.lw_rename_group(uuid, text), public.lw_new_codes(uuid), public.lw_join_group(text),
  public.lw_remove_member(uuid, uuid), public.lw_create_child(uuid, text, text, text),
  public.lw_update_child(uuid, text, text), public.lw_set_child_password(uuid, text),
  public.lw_link_child(uuid, text, text), public.lw_delete_child(uuid),
  public.lw_child_state(uuid), public.lw_group_states(uuid),
  public.lw_portal(), public.lw_children_states(), public.lw_add_child(text, text, text, text),
  public.lw_edit_child(uuid, text, text, text), public.lw_add_existing_child(text, text),
  public.lw_remove_child(uuid), public.lw_create_grownup(text, text, text), public.lw_remove_grownup(uuid);

-- The sign-ins the game made (children and grown-ups). Remove this statement to
-- keep the Supabase Auth users while dropping the game's tables.
delete from auth.users where email like '%@accounts.little-woof.invalid';

drop schema if exists lw_private cascade;
drop table if exists public.link_attempts, public.badges, public.settings, public.rounds,
  public.group_members, public.groups, public.profiles;
