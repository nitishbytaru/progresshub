-- Fitness personal trainer: profile, daily extras, food diary, custom foods, workout sets and AI usage caps.

create table if not exists public.fit_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  sex text not null check (sex in ('male', 'female')),
  birth_year int not null check (birth_year between 1920 and 2015),
  height_cm numeric(5, 1) not null check (height_cm between 100 and 250),
  activity text not null default 'moderate' check (activity in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal text not null default 'maintain' check (goal in ('lose', 'maintain', 'gain')),
  target_kg numeric(5, 2) check (target_kg between 20 and 400),
  weekly_rate_kg numeric(3, 2) not null default 0.5 check (weekly_rate_kg between 0 and 1.5),
  diet text not null default 'nonveg' check (diet in ('veg', 'egg', 'nonveg', 'vegan')),
  gym_days_target int not null default 4 check (gym_days_target between 0 and 7),
  water_target_ml int not null default 3000 check (water_target_ml between 500 and 8000),
  updated_at timestamptz not null default now()
);

create table if not exists public.fit_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  water_ml int not null default 0 check (water_ml between 0 and 15000),
  sleep_h numeric(3, 1) check (sleep_h between 0 and 24),
  steps int check (steps between 0 and 200000),
  note text check (char_length(note) <= 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  serving_label text not null check (char_length(serving_label) between 1 and 40),
  kcal numeric(6, 1) not null check (kcal between 0 and 5000),
  protein_g numeric(5, 1) not null default 0 check (protein_g between 0 and 500),
  carbs_g numeric(5, 1) not null default 0 check (carbs_g between 0 and 1000),
  fat_g numeric(5, 1) not null default 0 check (fat_g between 0 and 500),
  diet text not null default 'veg' check (diet in ('veg', 'egg', 'nonveg', 'vegan')),
  created_at timestamptz not null default now()
);
create index if not exists custom_foods_user on public.custom_foods (user_id);

create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  source text not null check (source in ('builtin', 'custom', 'ai')),
  food_key text,
  name text not null check (char_length(name) between 1 and 80),
  serving_label text not null check (char_length(serving_label) between 1 and 40),
  servings numeric(5, 2) not null check (servings > 0 and servings <= 50),
  kcal numeric(7, 1) not null check (kcal between 0 and 20000),
  protein_g numeric(6, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(6, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(6, 1) not null default 0 check (fat_g >= 0),
  created_at timestamptz not null default now()
);
create index if not exists food_logs_user_day on public.food_logs (user_id, day);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  exercise_key text not null check (char_length(exercise_key) between 1 and 60),
  muscle text not null check (muscle in ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs')),
  set_no int not null check (set_no between 1 and 30),
  reps int not null check (reps between 1 and 100),
  weight_kg numeric(5, 1) not null default 0 check (weight_kg between 0 and 600),
  created_at timestamptz not null default now()
);
create index if not exists workout_sets_user_day on public.workout_sets (user_id, day);

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('meal', 'coach')),
  count int not null default 0,
  primary key (user_id, day, kind)
);

do $$
declare t text;
begin
  foreach t in array array['fit_profiles', 'fit_days', 'custom_foods', 'food_logs', 'workout_sets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: read own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: insert own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: update own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: delete own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;

-- AI usage: readable by its owner, but only counted through fit_ai_take(), so a user can't reset their cap.
alter table public.ai_usage enable row level security;
create policy "ai_usage: read own" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.fit_ai_take(p_kind text, p_day date, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); used int;
begin
  if uid is null or p_kind not in ('meal', 'coach') or p_cap < 1 or p_cap > 200 then
    return false;
  end if;
  insert into public.ai_usage (user_id, day, kind, count) values (uid, p_day, p_kind, 1)
  on conflict (user_id, day, kind) do update set count = public.ai_usage.count + 1
  returning count into used;
  return used <= p_cap;
end;
$$;
revoke all on function public.fit_ai_take(text, date, int) from public, anon;
grant execute on function public.fit_ai_take(text, date, int) to authenticated;
