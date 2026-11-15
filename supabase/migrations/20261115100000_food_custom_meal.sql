-- Food diary: allow an optional fifth meal, "custom" (shown as "Custom meal").
alter table public.food_logs drop constraint if exists food_logs_meal_check;
alter table public.food_logs
  add constraint food_logs_meal_check check (meal in ('breakfast', 'lunch', 'dinner', 'snack', 'custom'));
