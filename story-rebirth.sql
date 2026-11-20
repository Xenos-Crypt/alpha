-- Story Mode: death means starting over as a new person.
-- When you die you wait 24 real hours. After that you come back as a stranger: the opening plays again,
-- you're level 1 and poor, and nobody in Anthos remembers you. The server keeps the record so this can't
-- be dodged by keeping an old save: the run is flagged when you die, and the game must call
-- story_run_reborn() (allowed only once the wait is over) before Story Mode carries on.
-- Every life is logged in story_lives. (Applied to the game project.)

alter table public.story_runs
  add column if not exists life int not null default 1,
  add column if not exists needs_rebirth boolean not null default false,
  add column if not exists reborn_at timestamptz;

create table if not exists public.story_lives (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  life       int not null,
  started_at timestamptz,
  died_at    timestamptz,
  level      int,
  reborn_at  timestamptz
);
create index if not exists story_lives_user on public.story_lives (user_id, life);
alter table public.story_lives enable row level security;
revoke all on public.story_lives from anon, authenticated;

-- dying: start the 24-hour wait, flag the run, and log the life that just ended
drop function if exists public.story_run_died();
create or replace function public.story_run_died(p_level int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.story_runs;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.story_runs (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  select * into r from public.story_runs where user_id = auth.uid() for update;
  if not r.needs_rebirth then   -- dying again while already dead changes nothing
    update public.story_runs set dead_until = now() + interval '24 hours', deaths = deaths + 1, needs_rebirth = true, updated_at = now()
      where user_id = auth.uid();
    insert into public.story_lives (user_id, life, started_at, died_at, level) values (auth.uid(), r.life, r.started_at, now(), p_level);
  end if;
  return (select to_jsonb(x) - 'user_id' from public.story_runs x where x.user_id = auth.uid());
end; $$;

-- coming back after the wait: a new life starts (the game then wipes the old one and plays the opening)
create or replace function public.story_run_reborn()
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.story_runs;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into r from public.story_runs where user_id = auth.uid() for update;
  if r.user_id is null or not r.needs_rebirth then return (select to_jsonb(x) - 'user_id' from public.story_runs x where x.user_id = auth.uid()); end if;
  if r.dead_until > now() and not public.is_admin() then raise exception 'the 24-hour wait is not over'; end if;
  update public.story_lives set reborn_at = now() where user_id = auth.uid() and life = r.life and reborn_at is null;
  update public.story_runs set life = life + 1, needs_rebirth = false, dead_until = null, started_at = now(), reborn_at = now(), updated_at = now()
    where user_id = auth.uid();
  return (select to_jsonb(x) - 'user_id' from public.story_runs x where x.user_id = auth.uid());
end; $$;

revoke all on function public.story_run_died(int) from public;
revoke all on function public.story_run_reborn() from public;
grant execute on function public.story_run_died(int) to authenticated;
grant execute on function public.story_run_reborn() to authenticated;
