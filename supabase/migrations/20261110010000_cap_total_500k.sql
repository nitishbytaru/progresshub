-- The finish line is the ceiling: totals above 500,000 are rejected (was 1,000,000).
-- Matches LIMITS.maxTotal in src/lib/validation.ts, which gives the friendly message first.
alter table public.progress_entries drop constraint if exists progress_entries_total_check;
alter table public.progress_entries
  add constraint progress_entries_total_check check (total > 0 and total <= 500000);
