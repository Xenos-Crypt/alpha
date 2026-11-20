-- Admin accounts for Story Mode. The admin list itself is kept only in the database (app_admins),
-- never in this repo. Admins can replay their story, end a death wait and read the Quest Director's questions.
create table if not exists public.app_admins (email text primary key);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins a where lower(a.email) = lower(auth.jwt()->>'email'));
$$;

create or replace function public.story_run_reset()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  delete from public.story_runs where user_id = auth.uid();
end; $$;

create or replace function public.story_run_revive()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  update public.story_runs set dead_until = null, updated_at = now() where user_id = auth.uid();
end; $$;

create or replace function public.dev_queries_open()
returns setof public.dev_queries language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query select * from public.dev_queries where answer is null order by created_at desc limit 50;
end; $$;

revoke all on function public.is_admin() from public;
revoke all on function public.story_run_reset() from public;
revoke all on function public.story_run_revive() from public;
revoke all on function public.dev_queries_open() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.story_run_reset() to authenticated;
grant execute on function public.story_run_revive() to authenticated;
grant execute on function public.dev_queries_open() to authenticated;
