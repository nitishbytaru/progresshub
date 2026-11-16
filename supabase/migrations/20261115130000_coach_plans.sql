-- The coach: this week's training plan and today's meal prep (one row each per user).
create table if not exists public.coach_week_plans (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  days jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

create table if not exists public.coach_meal_preps (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  ingredients jsonb not null default '[]'::jsonb,
  meals jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  generated_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

do $$
declare t text;
begin
  foreach t in array array['coach_week_plans', 'coach_meal_preps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s: read own" on public.%I for select to authenticated using ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: insert own" on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: update own" on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t, t);
    execute format('create policy "%s: delete own" on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', t, t);
  end loop;
end $$;
