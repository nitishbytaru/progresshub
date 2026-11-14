-- Fitness: which muscle groups were trained that day.
alter table public.weight_logs
  add column if not exists muscles text[] not null default '{}'
  constraint weight_logs_muscles_known
  check (muscles <@ array['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs']::text[]);
