-- Talk to Coach Dumbo: today's chat thread per user (proposed plan edits live inside the turns).
create table if not exists public.coach_chats (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  turns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.coach_chats enable row level security;
drop policy if exists "coach_chats: read own" on public.coach_chats;
create policy "coach_chats: read own" on public.coach_chats for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "coach_chats: insert own" on public.coach_chats;
create policy "coach_chats: insert own" on public.coach_chats for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "coach_chats: update own" on public.coach_chats;
create policy "coach_chats: update own" on public.coach_chats for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "coach_chats: delete own" on public.coach_chats;
create policy "coach_chats: delete own" on public.coach_chats for delete to authenticated using ((select auth.uid()) = user_id);
