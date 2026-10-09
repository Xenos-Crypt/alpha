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
