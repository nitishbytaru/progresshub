/**
 * Deep analysis for the Insights page. Pure functions over logs.
 */
import { MUSCLES, type Muscle } from "./fit-units";
import { addDays, daysBetween, weekStart, type FitLog } from "./fit-stats";

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
