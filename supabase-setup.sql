-- Run this once in the Supabase SQL Editor for this project.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  roll int not null,
  family text not null,
  backstory text not null,
  stats jsonb not null,
  perk text not null,
  points int not null default 0,
  wealth_tier text,
  housing text,
  starting_gold int default 100,
  max_health int default 100,
  current_gold int,
  weapon text,
  created_at timestamptz not null default now()
);

-- Already have the table from before? Run just this part to add the new columns:
-- alter table profiles add column if not exists wealth_tier text;
-- alter table profiles add column if not exists housing text;
-- alter table profiles add column if not exists starting_gold int default 100;
-- alter table profiles add column if not exists max_health int default 100;
-- alter table profiles add column if not exists current_gold int;
-- alter table profiles add column if not exists weapon text;

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
-- Hosted rooms: apply this section in the Supabase SQL Editor.
create table if not exists public.game_rooms (
 code text primary key check (code ~ '^[0-9]{5}$'),
 host_id uuid not null references auth.users(id) on delete cascade,
 city text not null check(city in ('Ashford','Riverside','Capital')),
 visibility text not null check(visibility in ('public','private')),
 capacity integer check(capacity is null or capacity between 1 and 10000),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create unique index if not exists one_active_room_per_host on public.game_rooms(host_id) where active;
create table if not exists public.game_room_members (
 room_code text references public.game_rooms(code) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(room_code,user_id)
);
alter table public.game_rooms enable row level security;
alter table public.game_room_members enable row level security;
-- All access goes through authenticated RPCs. Private codes are not listed.
create or replace function public.host_game_room(p_city text,p_visibility text,p_capacity integer default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r game_rooms; candidate text; attempts integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in to host a game'; end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 select * into r from game_rooms where host_id=auth.uid() and active;
 if found then return to_jsonb(r); end if;
 loop
  attempts:=attempts+1;if attempts>100000 then raise exception 'No room codes available';end if;
  candidate:=lpad(floor(random()*100000)::int::text,5,'0');
  begin
   insert into game_rooms(code,host_id,city,visibility,capacity) values(candidate,auth.uid(),p_city,p_visibility,p_capacity) returning * into r;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 insert into game_room_members values(r.code,auth.uid(),now());return to_jsonb(r);
end $$;
create or replace function public.join_game_room(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r game_rooms;
begin
 if auth.uid() is null then raise exception 'Sign in to join a game';end if;
 select * into r from game_rooms where code=p_code and active for update;
 if not found then raise exception 'Room not found or hosting stopped';end if;
 if exists(select 1 from game_room_members where room_code=p_code and user_id=auth.uid()) then return to_jsonb(r);end if;
 if r.capacity is not null and (select count(*) from game_room_members where room_code=p_code)>=r.capacity then raise exception 'This room is full';end if;
 insert into game_room_members values(p_code,auth.uid(),now());return to_jsonb(r);
end $$;
create or replace function public.stop_game_room(p_code text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update game_rooms set active=false where code=p_code and host_id=auth.uid();
 if not found then raise exception 'Only the host can stop this room';end if;
 delete from game_room_members where room_code=p_code;
end $$;
create or replace function public.leave_game_room(p_code text)
returns void language sql security definer set search_path=public as $$
 delete from game_room_members where room_code=p_code and user_id=auth.uid();
$$;
create or replace function public.list_public_game_rooms()
returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('code',r.code,'city',r.city,'capacity',r.capacity,'players',(select count(*) from game_room_members m where m.room_code=r.code))),'[]'::jsonb) from game_rooms r where r.active and r.visibility='public' and auth.uid() is not null;
$$;
revoke all on function public.host_game_room(text,text,integer),public.join_game_room(text),public.stop_game_room(text),public.leave_game_room(text),public.list_public_game_rooms() from public,anon;
grant execute on function public.host_game_room(text,text,integer),public.join_game_room(text),public.stop_game_room(text),public.leave_game_room(text),public.list_public_game_rooms() to authenticated;
