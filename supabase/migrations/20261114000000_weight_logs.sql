-- Fitness (fit.progresshub.space): one body-weight entry per user per day, in kg.
create table if not exists public.weight_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  kg numeric(5, 2) not null check (kg between 20 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.weight_logs enable row level security;

create policy "weight_logs: read own" on public.weight_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "weight_logs: insert own" on public.weight_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "weight_logs: update own" on public.weight_logs
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "weight_logs: delete own" on public.weight_logs
  for delete to authenticated using ((select auth.uid()) = user_id);
