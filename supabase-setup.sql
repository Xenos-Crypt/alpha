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

-- Usernames: lets people log in with a username instead of their email, and
-- guarantees no two accounts can share one. Apply this section too.
create table if not exists public.usernames (
  username_lower text primary key check (char_length(username_lower) between 1 and 24),
  username text not null,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.usernames enable row level security;
-- No direct policies: reads go through email_for_username() below (so anon
-- can resolve a username to an email to log in with, without being able to
-- list/scrape every username), writes happen only via the trigger.

-- Fires on every new signup; claims the username they typed (from signUp's
-- options.data.username) atomically with account creation. If someone else
-- already has it, this insert's unique-constraint violation rolls back the
-- whole signup, and the client sees a clear "username already taken" error.
create or replace function public.handle_new_user_username()
returns trigger language plpgsql security definer set search_path=public as $$
declare chosen text := trim(new.raw_user_meta_data->>'username');
begin
  if chosen is not null and length(chosen) > 0 then
    insert into public.usernames(username_lower, username, user_id) values (lower(chosen), chosen, new.id);
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_created_username on auth.users;
create trigger on_auth_user_created_username
  after insert on auth.users
  for each row execute function public.handle_new_user_username();

-- Called pre-login (no session yet) to turn "username" into the email
-- signInWithPassword actually needs. Returns null if there's no match —
-- never raises, so it can't be used to brute-force-confirm an email exists
-- any faster than just trying to log in with it would.
create or replace function public.email_for_username(p_username text)
returns text language sql security definer set search_path=public as $$
  select u.email from public.usernames un join auth.users u on u.id = un.user_id where un.username_lower = lower(trim(p_username));
$$;
revoke all on function public.email_for_username(text) from public,authenticated;
grant execute on function public.email_for_username(text) to anon,authenticated;
-- Private room communication: apply this section for text and voice chat.
create or replace function public.can_communicate_in_room(p_code text)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from game_rooms r join game_room_members m on m.room_code=r.code where r.code=p_code and r.active and m.user_id=auth.uid());
$$;
revoke all on function public.can_communicate_in_room(text) from public,anon;
grant execute on function public.can_communicate_in_room(text) to authenticated;
drop policy if exists "Room members receive communication" on realtime.messages;
create policy "Room members receive communication" on realtime.messages for select to authenticated
using (extension in ('broadcast','presence') and public.can_communicate_in_room(split_part(realtime.topic(),':',2)) and split_part(realtime.topic(),':',1)='roomchat');
drop policy if exists "Room members send communication" on realtime.messages;
create policy "Room members send communication" on realtime.messages for insert to authenticated
with check (extension in ('broadcast','presence') and public.can_communicate_in_room(split_part(realtime.topic(),':',2)) and split_part(realtime.topic(),':',1)='roomchat');
-- Existing accounts must claim a unique username before online play.
create or replace function public.get_my_username()
returns text language sql stable security definer set search_path=public as $$
 select username from usernames where user_id=auth.uid();
$$;
create or replace function public.claim_username(p_username text)
returns text language plpgsql security definer set search_path=public as $$
declare chosen text:=trim(p_username);existing text;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 select username into existing from usernames where user_id=auth.uid();
 if found then return existing;end if;
 if chosen !~ '^[A-Za-z0-9_]{3,24}$' or chosen is null then raise exception 'Use 3 to 24 letters, numbers or underscores';end if;
 begin
 insert into usernames(username_lower,username,user_id) values(lower(chosen),chosen,auth.uid());
 exception when unique_violation then raise exception 'Username already taken';end;
 update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)||jsonb_build_object('username',chosen) where id=auth.uid();
 return chosen;
end $$;
revoke all on function public.get_my_username(),public.claim_username(text) from public,anon;
grant execute on function public.get_my_username(),public.claim_username(text) to authenticated;
-- Permanent online classes and progress. Apply this section in Supabase.
create table if not exists public.online_player_accounts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 class_index integer not null check(class_index between 0 and 3),
 progress jsonb not null default '{}'::jsonb check(jsonb_typeof(progress)='object'),
 progress_version bigint not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.online_player_accounts enable row level security;
create or replace function public.keep_online_class_permanent()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.class_index<>old.class_index or new.user_id<>old.user_id then raise exception 'Your online class is permanent';end if;
 return new;
end $$;
drop trigger if exists permanent_online_class on public.online_player_accounts;
create trigger permanent_online_class before update on public.online_player_accounts for each row execute function public.keep_online_class_permanent();
create or replace function public.get_online_player_account()
returns jsonb language sql stable security definer set search_path=public as $$
 select to_jsonb(a) from online_player_accounts a where a.user_id=auth.uid();
$$;
create or replace function public.claim_online_class(p_class_index integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare account online_player_accounts;
begin
 if auth.uid() is null then raise exception 'Sign in to choose your online class';end if;
 if p_class_index not between 0 and 3 or p_class_index is null then raise exception 'Choose a playable class';end if;
 insert into online_player_accounts(user_id,class_index) values(auth.uid(),p_class_index) on conflict(user_id) do nothing;
 select * into account from online_player_accounts where user_id=auth.uid();
 return to_jsonb(account);
end $$;
create or replace function public.save_online_player_progress(p_progress jsonb,p_expected_version bigint)
returns jsonb language plpgsql security definer set search_path=public as $$
declare account online_player_accounts;
begin
 if auth.uid() is null then raise exception 'Sign in to save online progress';end if;
 if p_progress is null or jsonb_typeof(p_progress)<>'object' or octet_length(p_progress::text)>100000 then raise exception 'Invalid online progress';end if;
 -- Class is a separate immutable column; progress cannot replace it.
 update online_player_accounts set progress=p_progress-'class_index'-'charIdx'-'unlockedCharIndices',progress_version=progress_version+1,updated_at=now()
 where user_id=auth.uid() and progress_version=p_expected_version returning * into account;
 if not found then raise exception 'Online progress changed on another device. Rejoin before saving again';end if;
 return to_jsonb(account);
end $$;
revoke all on function public.get_online_player_account(),public.claim_online_class(integer),public.save_online_player_progress(jsonb,bigint) from public,anon;
grant execute on function public.get_online_player_account(),public.claim_online_class(integer),public.save_online_player_progress(jsonb,bigint) to authenticated;
