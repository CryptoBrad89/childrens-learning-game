-- Little Woof accounts and sync: tables.
--
-- Every person (child or grown-up) is a real Supabase Auth user with a
-- profile row here. Children have no email address: their sign-in name maps to
-- a reserved, undeliverable address (<name>@accounts.little-woof.invalid), and
-- their accounts are created already confirmed by lw_create_child (next
-- migration), so the project's "Confirm email" setting never blocks them.
--
-- The tables are closed to the API roles. Row-level security is on with no
-- policies, and the API roles have no table privileges. All reads and writes go
-- through the security-definer functions in the next migration, which check who
-- is calling.

-- pgcrypto (bcrypt and random bytes) is part of every Supabase project; make sure.
create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('child', 'grownup')),
  login text not null unique check (login ~ '^[a-z0-9][a-z0-9._-]{2,31}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar text not null default 'sun' check (avatar ~ '^[a-z]{2,12}(:[0-5])?$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A group is a class (at school) or a home (a family). Grown-ups in a group
-- look after every child in it. A child can be in several groups, so the same
-- child account works in class and at home.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('class', 'home')),
  name text not null check (char_length(name) between 1 and 40),
  -- Typed on a shared device to show the group's picture board. Safe to put on
  -- a poster: it shows names and pictures, and every child still needs a password.
  board_code text not null unique check (board_code ~ '^[A-Z0-9]{6}$'),
  -- Given only to other grown-ups; it lets them join and look after the children.
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{8}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'grownup', 'child')),
  added_by uuid references public.profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index group_members_profile_idx on public.group_members (profile_id);

-- One row per finished round. The id is made on the device before the round is
-- saved locally, so a retried upload can never count the same round twice.
create table public.rounds (
  id uuid primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  world text not null check (world in ('post', 'space', 'silk')),
  letter text not null check (letter ~ '^[A-Z]$'),
  misses smallint not null default 0 check (misses between 0 and 99),
  hinted boolean not null default false,
  played_at timestamptz not null,
  device_id text check (char_length(device_id) <= 64),
  received_at timestamptz not null default now()
);
create index rounds_profile_idx on public.rounds (profile_id, world, letter);

-- Settings belong to the person. One row per field; the newest edit wins per
-- field (changed_at is when the edit was made, capped at the time it arrived).
create table public.settings (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  field text not null,
  value jsonb not null,
  changed_at timestamptz not null,
  changed_by uuid references public.profiles (id) on delete set null,
  primary key (profile_id, field)
);

-- Stickers a person has earned. Earned once; the earliest time is kept.
create table public.badges (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9-]{2,24}$'),
  earned_at timestamptz not null,
  primary key (profile_id, key)
);

-- Failed "add a child you already have" attempts, to slow down password guessing.
create table public.link_attempts (
  caller uuid not null references public.profiles (id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index link_attempts_caller_idx on public.link_attempts (caller, attempted_at);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rounds enable row level security;
alter table public.settings enable row level security;
alter table public.badges enable row level security;
alter table public.link_attempts enable row level security;

revoke all on table public.profiles, public.groups, public.group_members, public.rounds,
  public.settings, public.badges, public.link_attempts from anon, authenticated;
