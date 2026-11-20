-- Story Mode content store. The story itself (scenes, System messages, quests) is NOT in this repo:
-- it lives in this table and is added separately. Nobody can list or read the table directly;
-- the game can only ask for pieces by key through story_get().

create table if not exists public.story_nodes (
  key        text primary key,
  body       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.story_nodes enable row level security;
-- no policies on purpose: anon and signed-in users cannot select, insert, update or delete
revoke all on public.story_nodes from anon, authenticated;

-- Returns {key: body} for the keys asked for (at most 20 at a time). Unknown keys are left out.
create or replace function public.story_get(p_keys text[])
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(n.key, n.body), '{}'::jsonb)
  from public.story_nodes n
  where n.key = any (p_keys[1:20]);
$$;

revoke all on function public.story_get(text[]) from public;
grant execute on function public.story_get(text[]) to anon, authenticated;
