-- Food diary: track fiber per entry and per custom food (fat stays stored but the app shows fiber instead).
alter table public.food_logs add column if not exists fiber_g numeric not null default 0 check (fiber_g >= 0);
alter table public.custom_foods add column if not exists fiber_g numeric not null default 0 check (fiber_g >= 0);
