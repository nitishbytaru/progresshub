-- Removes the dummy fit data seeded on 2026-11-16 (Oct 5 → Nov 16) for the dev account.
-- Seeded rows carry the tag timestamp below (created_at, or updated_at on fit_days); real rows never match it.
begin;
delete from public.weight_logs  where user_id = '8116985b-454d-4e43-a605-931f19fadf27' and created_at = '2026-11-16 00:00:00.000777+00';
delete from public.workout_sets where user_id = '8116985b-454d-4e43-a605-931f19fadf27' and created_at = '2026-11-16 00:00:00.000777+00';
delete from public.food_logs    where user_id = '8116985b-454d-4e43-a605-931f19fadf27' and created_at = '2026-11-16 00:00:00.000777+00';
delete from public.fit_days     where user_id = '8116985b-454d-4e43-a605-931f19fadf27' and updated_at = '2026-11-16 00:00:00.000777+00';
commit;
