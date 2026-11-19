-- One Story Mode run per account, kept on the server so it can't be reset by clearing the browser.
-- (Already applied to the game project.)
create table if not exists public.story_runs (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  dead_until timestamptz,
  deaths     int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.story_runs enable row level security;
revoke all on public.story_runs from anon, authenticated;

create or replace function public.story_run_status()
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(r) - 'user_id' from public.story_runs r where r.user_id = auth.uid();
$$;

create or replace function public.story_run_start()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.story_runs (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  return (select to_jsonb(r) - 'user_id' from public.story_runs r where r.user_id = auth.uid());
end; $$;

create or replace function public.story_run_died()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into public.story_runs (user_id) values (auth.uid()) on conflict (user_id) do nothing;
  update public.story_runs set dead_until = now() + interval '24 hours', deaths = deaths + 1, updated_at = now() where user_id = auth.uid();
  return (select to_jsonb(r) - 'user_id' from public.story_runs r where r.user_id = auth.uid());
end; $$;

revoke all on function public.story_run_status() from public;
revoke all on function public.story_run_start() from public;
revoke all on function public.story_run_died() from public;
grant execute on function public.story_run_status() to authenticated;
grant execute on function public.story_run_start() to authenticated;
grant execute on function public.story_run_died() to authenticated;
