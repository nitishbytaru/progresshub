-- Fitness: did the user go to the gym that day (logged alongside the weight).
alter table public.weight_logs add column if not exists gym boolean not null default false;
