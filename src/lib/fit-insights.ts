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

export type StreakStats = {
  /** Weeks in a row with at least one gym day (this week counts once it has one). */
  weekStreak: number;
  bestWeekStreak: number;
  /** False when the streak is carried by last week: train this week to keep it. */
  thisWeek: boolean;
  /** Gym days this calendar month / year, and this month's days (for the strip). */
  month: number;
  monthDays: { day: string; gym: boolean; future: boolean }[];
  year: number;
  /** Gym days per month this year, Jan → Dec (future months are null). */
  perMonth: (number | null)[];
  monthIndex: number;
};

/** Gym streak and counts for the Home streak card. `logs` cover at least this calendar year. */
export function streakStats(logs: FitLog[], today: string): StreakStats {
  const gym = new Set(logs.filter((l) => l.gym).map((l) => l.day));
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const monthStart = `${today.slice(0, 7)}-01`;

  // Week streak, walking back from this week (or last week when this one has no gym day yet).
  const weekHas = (start: string) => [0, 1, 2, 3, 4, 5, 6].some((i) => gym.has(addDays(start, i)));
  let wk = weekStart(today);
  const thisWeek = weekHas(wk);
  if (!thisWeek) wk = addDays(wk, -7);
  let weekStreak = 0;
  while (weekHas(wk) && weekStreak < 520) {
    weekStreak++;
    wk = addDays(wk, -7);
  }
  // Best run of weeks over the logged history.
  const days = [...gym].sort();
  let bestWeekStreak = 0;
  if (days.length) {
    let run = 0;
    for (let w = weekStart(days[0]); w <= weekStart(today); w = addDays(w, 7)) {
      run = weekHas(w) ? run + 1 : 0;
      bestWeekStreak = Math.max(bestWeekStreak, run);
    }
  }

  const monthDays: StreakStats["monthDays"] = [];
  for (let d = monthStart; d.slice(0, 7) === monthStart.slice(0, 7); d = addDays(d, 1)) {
    monthDays.push({ day: d, gym: gym.has(d), future: d > today });
  }
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const perMonth = Array.from({ length: 12 }, (_, m) => {
    if (m > monthIndex) return null;
    const key = `${today.slice(0, 4)}-${String(m + 1).padStart(2, "0")}`;
    return days.filter((d) => d.startsWith(key)).length;
  });

  return {
    weekStreak,
    bestWeekStreak,
    thisWeek,
    month: days.filter((d) => d >= monthStart && d <= today).length,
    monthDays,
    year: days.filter((d) => d >= yearStart && d <= today).length,
    perMonth,
    monthIndex,
  };
}
