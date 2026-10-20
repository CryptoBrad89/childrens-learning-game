-- Native Auth deadlines also gate refreshed tokens. The original Auth deadline is
-- retained separately so activity cannot extend a stricter operator-set cap.
create table private.session_limits (
  session_id uuid primary key references auth.sessions(id) on delete cascade,
  hard_deadline timestamptz
);
alter table private.session_limits enable row level security;
revoke all on private.session_limits from public, anon, authenticated;

create function private.initialize_session_limit(p_session uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s auth.sessions; account_role text; deadline timestamptz;
begin
  select * into s from auth.sessions where id=p_session for update;
  if not found or exists(select 1 from private.session_limits where session_id=p_session) then return; end if;
  select role into account_role from public.profiles where id=s.user_id;
  if account_role is null then return; end if;
  deadline := s.created_at + case when account_role='child' then interval '6 hours' else interval '30 minutes' end;
  insert into private.session_limits(session_id,hard_deadline)
    values(s.id,case when account_role='child' then least(s.not_after,deadline) else s.not_after end);
  update auth.sessions set not_after=least(s.not_after,deadline) where id=s.id;
end;
$$;
revoke all on function private.initialize_session_limit(uuid) from public,anon,authenticated;

create function private.initialize_auth_session() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.initialize_session_limit(new.id);
  return new;
end;
$$;
revoke all on function private.initialize_auth_session() from public,anon,authenticated;
create trigger portal_session_limit after insert on auth.sessions
  for each row execute function private.initialize_auth_session();
select private.initialize_session_limit(id) from auth.sessions;

create function private.session_valid() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions s join public.profiles p on p.id=s.user_id
    join private.session_limits l on l.session_id=s.id
    where s.id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')
      and s.user_id=(select auth.uid())
      and s.not_after > now()
      and (l.hard_deadline is null or l.hard_deadline > now())
      and (p.role <> 'child' or s.created_at + interval '6 hours' > now())
  );
$$;
revoke all on function private.session_valid() from public,anon;
grant execute on function private.session_valid() to authenticated;

create function public.session_status(p_touch boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s auth.sessions; account_role text; hard_cap timestamptz; deadline timestamptz;
begin
  select * into s from auth.sessions
    where id::text=(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')
      and user_id=(select auth.uid()) for update;
  if not found then raise exception 'Signed out for safety. Please sign in again.' using errcode='28000'; end if;
  perform private.initialize_session_limit(s.id);
  if not private.session_valid() then raise exception 'Signed out for safety. Please sign in again.' using errcode='28000'; end if;
  select role into account_role from public.profiles where id=s.user_id;
  select hard_deadline into hard_cap from private.session_limits where session_id=s.id;
  select not_after into deadline from auth.sessions where id=s.id;
  if p_touch and account_role='grownup' then
    deadline := least(now() + interval '30 minutes',hard_cap);
    update auth.sessions set not_after=deadline where id=s.id;
  end if;
  return jsonb_build_object('expires_at',extract(epoch from deadline),
    'server_now',extract(epoch from now()),'role',account_role);
end;
$$;
revoke all on function public.session_status(boolean) from public,anon;
grant execute on function public.session_status(boolean) to authenticated;

-- sync_batch is SECURITY DEFINER and calls this access predicate explicitly.
create or replace function private.can_access_person(person uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.session_valid() and (person=(select auth.uid()) or exists (
    select 1 from public.guardians where adult_id=(select auth.uid()) and child_id=person));
$$;

-- Restrictive policies compose with each table's existing relationship rules.
-- Anonymous game-default reads continue using their separate permissive policy.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='public' and rowsecurity loop
    execute format('create policy active_account_session on public.%I as restrictive for all to authenticated using ((select private.session_valid())) with check ((select private.session_valid()))',t.tablename);
  end loop;
end;
$$;
