/**
 * Deep analysis for the Insights page. Pure functions over logs, food totals and sets.
 */
import { MUSCLES, type Muscle } from "./fit-units";
import { addDays, daysBetween, weekStart, type FitLog } from "./fit-stats";
import type { Targets } from "./fit-nutrition";
import { e1rm, EXERCISE_BY_KEY } from "./fit-exercises";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const wd = (d: string) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

export type MuscleRow = {
  muscle: Muscle;
  /** Sessions per week, oldest → newest (aligned with `weeks`). */
  perWeek: number[];
  total: number;
  avgPerWeek: number;
  lastDay: string | null;
  daysSince: number | null;
  /** Longest gap between two sessions in the window, in days. */
  longestGap: number | null;
  /** Weekday this group is trained on most. */
  favourite: string | null;
  byWeekday: number[];
};

export function muscleMatrix(logs: FitLog[], today: string, weeks = 8): { weeks: string[]; rows: MuscleRow[] } {
  const mon = weekStart(today);
  const starts = Array.from({ length: weeks }, (_, i) => addDays(mon, -7 * (weeks - 1 - i)));
  const gym = logs.filter((l) => l.gym && l.day >= starts[0]);
  const rows = MUSCLES.map((muscle): MuscleRow => {
    const days = gym.filter((l) => l.muscles.includes(muscle)).map((l) => l.day).sort();
    const perWeek = starts.map((s) => days.filter((d) => d >= s && d <= addDays(s, 6)).length);
    const byWeekday = Array(7).fill(0);
    days.forEach((d) => byWeekday[wd(d)]++);
    const gaps = days.slice(1).map((d, i) => daysBetween(days[i], d));
    const last = logs.filter((l) => l.gym && l.muscles.includes(muscle)).map((l) => l.day).sort().at(-1) ?? null;
    const fav = Math.max(...byWeekday);
    return {
      muscle,
      perWeek,
      total: days.length,
      avgPerWeek: Math.round((perWeek.slice(-4).reduce((a, b) => a + b, 0) / 4) * 10) / 10,
      lastDay: last,
      daysSince: last ? daysBetween(last, today) : null,
      longestGap: gaps.length ? Math.max(...gaps) : null,
      favourite: fav > 0 ? WEEKDAYS[byWeekday.indexOf(fav)] : null,
      byWeekday,
    };
  });
  return { weeks: starts, rows };
}

/** Gym days and weigh-ins per weekday over the last 12 weeks. */
export function weekdayHabits(logs: FitLog[], today: string) {
  const from = addDays(today, -83);
  const recent = logs.filter((l) => l.day >= from);
  return WEEKDAYS.map((label, i) => ({
    label,
    gym: recent.filter((l) => l.gym && wd(l.day) === i).length,
    weighIns: recent.filter((l) => wd(l.day) === i).length,
    of: 12,
  }));
}

/** Push / pull / legs sessions over 30 days. */
export function balance(logs: FitLog[], today: string) {
  const recent = logs.filter((l) => l.gym && l.day > addDays(today, -30));
  const has = (ms: Muscle[]) => recent.filter((l) => l.muscles.some((m) => ms.includes(m))).length;
  const push = has(["chest", "shoulders", "triceps"]);
  const pull = has(["back", "biceps"]);
  const legs = has(["legs"]);
  const total = push + pull + legs;
  return { push, pull, legs, total };
}

export type FuelDay = { day: string; kcal: number | null; protein: number | null; weight: number | null; avg: number | null };

/** Last 30 days: intake per day next to weight and its 7-day average. */
export function fuelVsWeight(logs: FitLog[], food: Map<string, { kcal: number; protein: number }>, today: string): FuelDay[] {
  const byDay = new Map(logs.map((l) => [l.day, l.kg]));
  return Array.from({ length: 30 }, (_, i) => {
    const day = addDays(today, i - 29);
    const win = logs.filter((l) => l.day <= day && l.day > addDays(day, -7));
    return {
      day,
      kcal: food.get(day)?.kcal ?? null,
      protein: food.get(day)?.protein ?? null,
      weight: byDay.get(day) ?? null,
      avg: win.length ? win.reduce((s, l) => s + l.kg, 0) / win.length : null,
    };
  });
}

/** How well the plan was followed over the last 30 days. */
export function adherence(logs: FitLog[], food: Map<string, { kcal: number; protein: number }>, today: string, t: Targets | null, gymTarget: number | null) {
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29));
  const logged = days.filter((d) => (food.get(d)?.kcal ?? 0) > 300);
  const onKcal = t ? logged.filter((d) => Math.abs(food.get(d)!.kcal - t.kcal) <= t.kcal * 0.1).length : null;
  const onProtein = t ? logged.filter((d) => food.get(d)!.protein >= t.protein * 0.9).length : null;
  const mon = weekStart(today);
  const weeks = [1, 2, 3, 4].map((w) => {
    const s = addDays(mon, -7 * w);
    return logs.filter((l) => l.gym && l.day >= s && l.day <= addDays(s, 6)).length;
  });
  const gymWeeksHit = gymTarget !== null ? weeks.filter((n) => n >= gymTarget).length : null;
  return { foodDays: logged.length, onKcal, onProtein, gymWeeksHit, weighIns: logs.filter((l) => l.day > addDays(today, -30)).length };
}

/** Longest and current runs of consecutive weigh-in days, and the best gym week ever. */
export function streaks(logs: FitLog[], today: string) {
  const days = [...new Set(logs.map((l) => l.day))].sort();
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i && daysBetween(days[i - 1], d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  let current = 0;
  for (let d = today; days.includes(d); d = addDays(d, -1)) current++;
  if (!current) for (let d = addDays(today, -1); days.includes(d); d = addDays(d, -1)) current++;
  const weekCounts = new Map<string, number>();
  logs.filter((l) => l.gym).forEach((l) => weekCounts.set(weekStart(l.day), (weekCounts.get(weekStart(l.day)) ?? 0) + 1));
  return { bestWeighIn: best, currentWeighIn: current, bestGymWeek: Math.max(0, ...weekCounts.values()) };
}

export type SetRow = { day: string; exercise_key: string; muscle: Muscle; reps: number; weight_kg: number };

/** Personal records (best estimated 1RM per exercise) and weekly volume (kg × reps) per muscle. */
export function strength(sets: SetRow[], today: string) {
  const prs = new Map<string, { key: string; name: string; muscle: Muscle; e1rm: number; weight: number; reps: number; day: string }>();
  sets.forEach((s) => {
    const est = e1rm(s.weight_kg, s.reps);
    const cur = prs.get(s.exercise_key);
    if (!cur || est > cur.e1rm) prs.set(s.exercise_key, { key: s.exercise_key, name: EXERCISE_BY_KEY.get(s.exercise_key)?.name ?? s.exercise_key, muscle: s.muscle, e1rm: est, weight: s.weight_kg, reps: s.reps, day: s.day });
  });
  const mon = weekStart(today);
  const starts = Array.from({ length: 8 }, (_, i) => addDays(mon, -7 * (7 - i)));
  const volume = MUSCLES.map((m) => ({
    muscle: m,
    perWeek: starts.map((s) => Math.round(sets.filter((x) => x.muscle === m && x.day >= s && x.day <= addDays(s, 6)).reduce((v, x) => v + x.weight_kg * x.reps, 0))),
    sets30: sets.filter((x) => x.muscle === m && x.day > addDays(today, -30)).length,
  }));
  return { prs: [...prs.values()].sort((a, b) => b.e1rm - a.e1rm), volume, weeks: starts };
}
