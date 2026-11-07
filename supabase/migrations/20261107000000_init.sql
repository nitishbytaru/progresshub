-- progresshub: initial schema
-- Profiles (one per auth user), daily cumulative impression logs, and a public leaderboard view.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text check (handle ~ '^[A-Za-z0-9_]{1,15}$'),
  display_name text not null default '' check (char_length(display_name) <= 50),
  avatar_url text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- X handles are case-insensitive, so uniqueness is too.
create unique index if not exists profiles_handle_lower_key on public.profiles (lower(handle));

alter table public.profiles enable row level security;

drop policy if exists "Profiles: public ones are readable" on public.profiles;
create policy "Profiles: public ones are readable"
  on public.profiles for select
  using (is_public or (select auth.uid()) = id);

drop policy if exists "Profiles: owner can update" on public.profiles;
create policy "Profiles: owner can update"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile row whenever someone signs up (email or Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1),
      ''
    ), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Progress entries: the creator's cumulative X impressions at the end of a day
-- ---------------------------------------------------------------------------
create table if not exists public.progress_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  total bigint not null check (total >= 0 and total <= 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create index if not exists progress_entries_user_date_idx
  on public.progress_entries (user_id, entry_date desc);

alter table public.progress_entries enable row level security;

drop policy if exists "Entries: readable when owner or profile is public" on public.progress_entries;
create policy "Entries: readable when owner or profile is public"
  on public.progress_entries for select
  using (
    (select auth.uid()) = user_id
    or exists (select 1 from public.profiles p where p.id = user_id and p.is_public)
  );

drop policy if exists "Entries: owner can insert" on public.progress_entries;
create policy "Entries: owner can insert"
  on public.progress_entries for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Entries: owner can update" on public.progress_entries;
create policy "Entries: owner can update"
  on public.progress_entries for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Entries: owner can delete" on public.progress_entries;
create policy "Entries: owner can delete"
  on public.progress_entries for delete
  using ((select auth.uid()) = user_id);

-- Keep updated_at honest.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists progress_entries_touch on public.progress_entries;
create trigger progress_entries_touch before update on public.progress_entries
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Leaderboard: one row per onboarded creator with their latest total,
-- 7-day pace (same math as src/lib/progress.ts paceOver) and logging streak.
-- security_invoker = true so the RLS policies above still apply.
-- ---------------------------------------------------------------------------
create or replace view public.leaderboard
with (security_invoker = true)
as
with latest as (
  select distinct on (user_id) user_id, entry_date, total
  from public.progress_entries
  order by user_id, entry_date desc
),
first_entry as (
  select distinct on (user_id) user_id, entry_date, total
  from public.progress_entries
  order by user_id, entry_date asc
),
week_base as (
  select distinct on (e.user_id) e.user_id, e.entry_date, e.total
  from public.progress_entries e
  join latest l on l.user_id = e.user_id
  where e.entry_date <= l.entry_date - 7
  order by e.user_id, e.entry_date desc
),
islands as (
  select
    user_id,
    entry_date - (row_number() over (partition by user_id order by entry_date))::int as grp
  from public.progress_entries
),
streaks as (
  select user_id, count(*) filter (where grp = max_grp)::int as streak
  from (select *, max(grp) over (partition by user_id) as max_grp from islands) s
  group by user_id
)
select
  p.id as user_id,
  p.handle,
  p.display_name,
  p.avatar_url,
  l.total,
  l.entry_date as last_logged_on,
  f.entry_date as first_logged_on,
  case
    when coalesce(w.entry_date, f.entry_date) < l.entry_date
      then (l.total - coalesce(w.total, f.total))::numeric / (l.entry_date - coalesce(w.entry_date, f.entry_date))
    else 0
  end as pace7,
  case when l.entry_date >= current_date - 1 then s.streak else 0 end as streak
from public.profiles p
join latest l on l.user_id = p.id
join first_entry f on f.user_id = p.id
left join week_base w on w.user_id = p.id
left join streaks s on s.user_id = p.id
where p.handle is not null;

grant select on public.leaderboard to anon, authenticated;
