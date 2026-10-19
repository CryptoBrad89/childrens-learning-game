-- Auth tables deliberately deny service_role direct writes. This narrowly scoped
-- transaction runs as the migration owner; only the authenticated Edge can call it.
alter function public.edit_grownup_profile(uuid,text,text,text) security definer;
