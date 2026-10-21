-- Read-only check of the signed-in grown-up's current secret.
-- Uses the same bcrypt hash GoTrue stores for password sign-in.
-- Reads the stored hash and returns true or false. It does not write a user row.
-- No limit on how many accounts a bulk action may include.

create or replace function public.confirm_grownup_secret(p_user_id uuid, p_secret text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored text;
begin
  if p_user_id is null or p_secret is null or length(p_secret) = 0 then
    return false;
  end if;
  select encrypted_password into stored
  from auth.users
  where id = p_user_id;
  if stored is null or stored = '' then
    return false;
  end if;
  return stored = extensions.crypt(p_secret, stored);
exception when others then
  return false;
end;
$$;

revoke all on function public.confirm_grownup_secret(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_grownup_secret(uuid, text) to service_role;
