-- Database-level backstop for the limits in src/lib/validation.ts (the app enforces them first,
-- with friendlier messages). Keeps a hand-crafted API call from storing absurd totals.
alter table public.progress_entries drop constraint if exists progress_entries_total_check;
alter table public.progress_entries
  add constraint progress_entries_total_check check (total > 0 and total <= 1000000);

alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles
  add constraint profiles_display_name_check check (char_length(display_name) <= 50 and display_name !~ '[<>]');
