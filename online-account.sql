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
