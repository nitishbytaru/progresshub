-- Leaderboard: add each creator's most recent gain (latest log minus the one before it)
-- and the date of that earlier log. Same view as 20261107000000_init.sql plus two trailing columns.

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
prev as (
  -- The log just before each creator's latest one, for their most recent gain.
  select distinct on (e.user_id) e.user_id, e.entry_date, e.total
  from public.progress_entries e
  join latest l on l.user_id = e.user_id
  where e.entry_date < l.entry_date
  order by e.user_id, e.entry_date desc
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
  case when l.entry_date >= current_date - 1 then s.streak else 0 end as streak,
  -- New columns go last so `create or replace view` can add them.
  (l.total - pv.total) as last_gain,
  pv.entry_date as previous_logged_on
from public.profiles p
join latest l on l.user_id = p.id
join first_entry f on f.user_id = p.id
left join week_base w on w.user_id = p.id
left join streaks s on s.user_id = p.id
left join prev pv on pv.user_id = p.id
where p.handle is not null;

grant select on public.leaderboard to anon, authenticated;
