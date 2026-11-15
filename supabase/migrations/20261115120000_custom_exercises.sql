-- Your own exercises (anything not in the built-in list). Sets reference them as exercise_key 'c:<id>'.
create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  muscle text not null check (muscle in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs')),
  bodyweight boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists custom_exercises_user_name on public.custom_exercises (user_id, lower(btrim(name)));

alter table public.custom_exercises enable row level security;
create policy "custom_exercises: read own" on public.custom_exercises for select to authenticated using ((select auth.uid()) = user_id);
create policy "custom_exercises: insert own" on public.custom_exercises for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "custom_exercises: update own" on public.custom_exercises for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "custom_exercises: delete own" on public.custom_exercises for delete to authenticated using ((select auth.uid()) = user_id);
