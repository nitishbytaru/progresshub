-- Lets a signed-in creator permanently delete their own account and every row tied to it.
-- Runs as the function owner (security definer) because only that role can remove auth.users rows;
-- it can only ever act on auth.uid(), so a user can't delete anyone else.
--
-- What goes:
--   public.progress_entries (all logs)  → deleted explicitly, and by cascade from profiles
--   public.profiles (handle, name, avatar, visibility) → deleted explicitly, and by cascade from auth.users
--   auth.users + auth.identities, sessions, refresh tokens, MFA factors → cascade from auth.users
--   public.leaderboard is a view over those tables, so the creator disappears from it immediately.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from public.progress_entries where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
