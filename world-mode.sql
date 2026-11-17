-- WORLD MODE and CREATE MODE. Apply this once in the Supabase SQL editor (it is also at the end of
-- supabase-setup.sql). Safe to run again.

-- World Mode: there are no rooms to host or join. Every signed-in player is in the same world.
-- 'roomchat:world' carries world chat, voice signalling and game events; player positions go through area
-- channels ('worldarea:<x>_<z>', one per 500 m square) so you only receive the players near you, however
-- many people are in the world.
drop policy if exists "World Mode players receive" on realtime.messages;
create policy "World Mode players receive" on realtime.messages for select to authenticated
using (extension in ('broadcast','presence') and (realtime.topic() = 'roomchat:world' or split_part(realtime.topic(),':',1) = 'worldarea'));
drop policy if exists "World Mode players send" on realtime.messages;
create policy "World Mode players send" on realtime.messages for insert to authenticated
with check (extension in ('broadcast','presence') and (realtime.topic() = 'roomchat:world' or split_part(realtime.topic(),':',1) = 'worldarea'));

-- Create Mode: each player's own worlds, saved to their account (kept on the device too).
create table if not exists public.creations (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 60),
  data jsonb not null default '{}'::jsonb,
  shared boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.creations enable row level security;
drop policy if exists "Owners manage their creations" on public.creations;
create policy "Owners manage their creations" on public.creations for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "Shared creations are readable" on public.creations;
create policy "Shared creations are readable" on public.creations for select using (shared);
