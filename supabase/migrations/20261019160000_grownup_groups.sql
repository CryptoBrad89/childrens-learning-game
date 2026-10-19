-- Not applied. Letters with Lucy home flow does not call these functions yet.
-- Any grown-up (the existing teacher or parent role) can own more than one
-- group. The old create_classroom and my_roster shapes stay so the current
-- desk keeps working until this file is applied and the desk is switched over.
-- Do not run this against any project other than little-woof
-- (shkmpxaejiuqzejsdwyr).

alter table public.classrooms drop constraint if exists classrooms_teacher_id_key;

create index if not exists classrooms_teacher_id_idx on public.classrooms (teacher_id);

create or replace function private.create_group(p_name text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  made_code text := upper(coalesce(p_code, ''));
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  attempt int := 0;
  slot int;
  created public.classrooms;
begin
  if private.jwt_role() not in ('teacher', 'parent') then
    raise exception 'Only a grown-up can create a group' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 1 then
    raise exception 'The group needs a name' using errcode = '22023';
  end if;
  if made_code = '' then
    while attempt < 8 loop
      made_code := '';
      for slot in 1..6 loop
        made_code := made_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from public.classrooms where code = made_code);
      attempt := attempt + 1;
    end loop;
  end if;
  if made_code !~ '^[A-HJ-NP-Z2-9]{4,10}$' then
    raise exception 'Use 4 to 10 letters or numbers, skipping I, O, 0 and 1' using errcode = '22023';
  end if;
  insert into public.classrooms (name, code, teacher_id)
  values (left(trim(p_name), 60), made_code, (select auth.uid()))
  returning * into created;
  return jsonb_build_object('id', created.id, 'name', created.name, 'code', created.code);
end;
$$;

create or replace function public.create_group(p_name text, p_code text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_group(p_name, p_code);
$$;

revoke all on function private.create_group(text, text) from public;
revoke all on function public.create_group(text, text) from public;
grant execute on function private.create_group(text, text) to authenticated;
grant execute on function public.create_group(text, text) to authenticated;
