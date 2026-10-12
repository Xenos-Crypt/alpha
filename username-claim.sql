-- Run this entire file in Supabase SQL Editor. Do not stop at GRANT EXECUTE.
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
