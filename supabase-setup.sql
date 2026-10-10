-- Run this once in the Supabase SQL Editor for this project.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roll int not null,
  family text not null,
  backstory text not null,
  stats jsonb not null,
  perk text not null,
  points int not null default 0,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = user_id);

-- Run this too: one row per login, so you can count total visits and visits per player.
-- Query total logins: select count(*) from logins;
-- Query logins per player over time: select user_id, count(*) from logins group by user_id;
create table if not exists logins (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table logins enable row level security;

create policy "Users can insert own login" on logins
  for insert with check (auth.uid() = user_id);

create policy "Users can read own logins" on logins
  for select using (auth.uid() = user_id);
