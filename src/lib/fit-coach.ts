/**
 * Training rules for the fit coach: weight trend and ETA, gym pace, next week's plan, tips.
 * Pure functions over the user's logs; no I/O, no AI.
 */
import { MUSCLES, muscleLabel, type Muscle } from "./fit-units";
import { addDays, daysBetween, weekStart, type FitLog } from "./fit-stats";
import type { FitProfile, Targets, Totals } from "./fit-nutrition";

const DAY = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdayIdx = (d: string) => (new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7;

/** Least-squares slope of the 7-day average weight over the last `window` days, in kg/week. */
export function weightTrend(logs: FitLog[], today: string, window = 21): { perWeek: number; avgNow: number } | null {
  const asc = logs.filter((l) => l.day > addDays(today, -window)).sort((a, b) => a.day.localeCompare(b.day));
  if (asc.length < 4) return null;
  const pts = asc.map((l) => {
    const win = asc.filter((w) => w.day <= l.day && w.day > addDays(l.day, -7));
    return { x: daysBetween(asc[0].day, l.day), y: win.reduce((s, w) => s + w.kg, 0) / win.length };
  });
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  const den = pts.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  if (den === 0) return null;
  const slope = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / den;
  return { perWeek: Math.round(slope * 7 * 100) / 100, avgNow: Math.round(pts.at(-1)!.y * 10) / 10 };
}

/** Date the target weight is reached at the current trend, or null when moving away / flat. */
export function etaToTarget(avgNow: number, perWeek: number, target: number | null, today: string) {
  if (target === null) return null;
  const gap = target - avgNow;
  if (Math.abs(gap) < 0.2) return { reached: true as const, weeks: 0, date: today };
  if (perWeek === 0 || Math.sign(gap) !== Math.sign(perWeek)) return null;
  const weeks = gap / perWeek;
  if (weeks > 260) return null;
  return { reached: false as const, weeks: Math.round(weeks * 10) / 10, date: new Date(Date.parse(`${today}T00:00:00Z`) + weeks * 7 * DAY).toISOString().slice(0, 10) };
}

export type Pace = {
  /** Average gym days per week over the last 4 full weeks plus this one. */
  avgPerWeek: number;
  /** Gym days next week to keep that pace. */
  keepPace: number;
  /** Gym days so far this week, and how many more to keep pace this week. */
  thisWeek: number;
  remainingThisWeek: number;
};

export function pace(logs: FitLog[], today: string): Pace {
  const mon = weekStart(today);
  const gym = new Set(logs.filter((l) => l.gym).map((l) => l.day));
  const weeks = [1, 2, 3, 4].map((w) => {
    const start = addDays(mon, -7 * w);
    return [...gym].filter((d) => d >= start && d <= addDays(start, 6)).length;
  });
  const avg = weeks.reduce((a, b) => a + b, 0) / 4;
  const thisWeek = [...gym].filter((d) => d >= mon && d <= today).length;
  const keep = Math.round(avg);
  const daysLeft = 6 - weekdayIdx(today);
  return {
    avgPerWeek: Math.round(avg * 10) / 10,
    keepPace: keep,
    thisWeek,
    remainingThisWeek: Math.min(Math.max(0, keep - thisWeek), daysLeft),
  };
}

/** Session templates by number of gym days (muscle groups per session). */
const SPLITS: Record<number, Muscle[][]> = {
  1: [["chest", "back", "legs", "shoulders"]],
  2: [["chest", "back", "shoulders", "biceps", "triceps"], ["legs"]],
  3: [["chest", "shoulders", "triceps"], ["back", "biceps"], ["legs"]],
  4: [["chest", "triceps"], ["back", "biceps"], ["legs"], ["shoulders", "biceps", "triceps"]],
  5: [["chest"], ["back"], ["legs"], ["shoulders"], ["biceps", "triceps"]],
  6: [["chest", "shoulders", "triceps"], ["back", "biceps"], ["legs"], ["chest", "shoulders", "triceps"], ["back", "biceps"], ["legs"]],
};
const SPLIT_NAME: Record<number, string> = {
  1: "Full body",
  2: "Upper / lower",
  3: "Push · pull · legs",
  4: "4-day split",
  5: "One group a day",
  6: "Push · pull · legs ×2",
  7: "Push · pull · legs ×2 + recovery",
};
/** Weekday slots (0 = Mon) that space N sessions out with recovery. */
const SLOTS: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export type PlanDay = { day: string; weekday: string; muscles: Muscle[]; rest: boolean; why: string };
export type WeekPlan = { start: string; days: PlanDay[]; sessions: number; split: string };

/**
 * Next week's plan: N sessions placed on the user's habitual weekdays (or spaced slots), muscle
 * sessions ordered by staleness (days since last trained + 4-week deficit), never the same group
 * on back-to-back days (48h recovery).
 */
export function nextWeekPlan(logs: FitLog[], today: string, sessions: number): WeekPlan {
  const n = Math.max(0, Math.min(7, Math.round(sessions)));
  const start = addDays(weekStart(today), 7);
  const gymLogs = logs.filter((l) => l.gym);

  // Habitual weekdays when there's enough history, else spaced slots.
  const freq = Array(7).fill(0);
  gymLogs.filter((l) => l.day > addDays(today, -56)).forEach((l) => freq[weekdayIdx(l.day)]++);
  const habitual = gymLogs.length >= 8 && n > 0 && n < 7
    ? [...freq.keys()].sort((a, b) => freq[b] - freq[a] || a - b).slice(0, n).sort((a, b) => a - b)
    : null;
  let slots = habitual ?? SLOTS[n] ?? [];
  // Avoid 3+ in a row from habit alone: fall back to spaced slots if habit packs them tight.
  if (habitual && habitual.some((d, i) => i >= 2 && habitual[i - 1] === d - 1 && habitual[i - 2] === d - 2) && n <= 4) slots = SLOTS[n];

  const lastTrained = (m: Muscle) => gymLogs.filter((l) => l.muscles.includes(m)).map((l) => l.day).sort().at(-1) ?? null;
  const since = (m: Muscle) => {
    const d = lastTrained(m);
    return d ? daysBetween(d, today) : 60;
  };
  const recent = (m: Muscle) => gymLogs.filter((l) => l.day > addDays(today, -28) && l.muscles.includes(m)).length;
  const avgRecent = MUSCLES.reduce((s, m) => s + recent(m), 0) / MUSCLES.length;
  const staleness = (ms: Muscle[]) => ms.reduce((s, m) => s + since(m) + 3 * (avgRecent - recent(m)), 0) / ms.length;

  // 6–7 days: push/pull/legs twice, rotated so the stalest comes first and repeats never touch.
  const ppl = SPLITS[3].map((ms) => ({ ms, score: staleness(ms) })).sort((a, b) => b.score - a.score).map((x) => x.ms);
  const sessionList = n >= 6 ? [...ppl, ...ppl] : [...(SPLITS[n] ?? [])];
  const pool = sessionList.map((ms, i) => ({ ms, i, score: n >= 6 ? -i : staleness(ms) }));
  const days: PlanDay[] = [];
  let prev: Muscle[] = [];
  let prevIdx = -9;
  for (let wd = 0; wd < 7; wd++) {
    const date = addDays(start, wd);
    if (!slots.includes(wd)) {
      days.push({ day: date, weekday: WEEKDAYS[wd], muscles: [], rest: true, why: "Rest & recover" });
      prev = [];
      continue;
    }
    if (n === 7 && wd === 6) {
      days.push({ day: date, weekday: WEEKDAYS[wd], muscles: [], rest: false, why: "Active recovery: walk, mobility, light cardio" });
      prev = [];
      continue;
    }
    pool.sort((a, b) => b.score - a.score);
    const consecutive = prevIdx === wd - 1;
    const pickIdx = pool.findIndex((s) => !consecutive || !s.ms.some((m) => prev.includes(m)));
    const pick = pool.splice(pickIdx >= 0 ? pickIdx : 0, 1)[0];
    if (!pick) break;
    const stalest = [...pick.ms].sort((a, b) => since(b) - since(a))[0];
    const d = lastTrained(stalest);
    days.push({
      day: date,
      weekday: WEEKDAYS[wd],
      muscles: pick.ms,
      rest: false,
      why: d ? `${muscleLabel(stalest)} last trained ${daysBetween(d, today)}d ago` : `${muscleLabel(stalest)} not trained yet`,
    });
    prev = pick.ms;
    prevIdx = wd;
  }
  return { start, days, sessions: n, split: SPLIT_NAME[n] ?? "Rest week" };
}

export type Tip = { kind: "train" | "eat" | "weight" | "habit"; text: string; strong?: boolean };

/** Up to 4 rule-based coaching tips, most important first. */
export function coachTips(input: {
  logs: FitLog[];
  today: string;
  profile: FitProfile | null;
  targets: Targets | null;
  foodDays: { day: string; totals: Totals }[];
  trend: { perWeek: number } | null;
  pace: Pace;
  /** False while the profile/food tables don't exist: never point people at a page that can't work yet. */
  ready?: boolean;
}): Tip[] {
  const { logs, today, profile, targets: t, foodDays, trend, pace: p, ready = true } = input;
  const tips: Tip[] = [];
  const gym = logs.filter((l) => l.gym);

  // Neglected muscle groups.
  const stale = MUSCLES.map((m) => ({ m, d: gym.filter((l) => l.muscles.includes(m)).map((l) => l.day).sort().at(-1) }))
    .map((x) => ({ ...x, since: x.d ? daysBetween(x.d, today) : null }))
    .filter((x) => x.since === null || x.since >= 8)
    .sort((a, b) => (b.since ?? 99) - (a.since ?? 99));
  if (gym.some((l) => l.muscles.length) && stale.length) {
    const s = stale[0];
    tips.push({ kind: "train", strong: true, text: s.since === null ? `${muscleLabel(s.m)} hasn't been trained yet. Put it first next week.` : `${muscleLabel(s.m)} last trained ${s.since} days ago. Prioritise it.` });
  }

  // Pace this week.
  if (p.remainingThisWeek > 0) tips.push({ kind: "habit", text: `${p.remainingThisWeek} more gym day${p.remainingThisWeek > 1 ? "s" : ""} this week keeps your ${p.avgPerWeek}/wk pace.` });
  if (profile && p.avgPerWeek + 0.5 < profile.gym_days_target) tips.push({ kind: "habit", text: `You average ${p.avgPerWeek} gym days; your target is ${profile.gym_days_target}. Add one session next week.` });

  // Protein and calories over the last 3 logged food days.
  const recent = foodDays.filter((d) => d.totals.kcal > 300).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 3);
  if (t && recent.length === 3) {
    const short = recent.every((d) => d.totals.protein < t.protein * 0.8);
    if (short) tips.push({ kind: "eat", strong: true, text: `Protein under ${Math.round(t.protein * 0.8)} g three days running. Add a protein source to each meal.` });
    const avgK = recent.reduce((s, d) => s + d.totals.kcal, 0) / 3;
    if (profile?.goal === "lose" && avgK > t.kcal * 1.1) tips.push({ kind: "eat", text: `Averaging ${Math.round(avgK)} kcal vs ${t.kcal} target. Trim ~${Math.round(avgK - t.kcal)} kcal/day.` });
    if (profile?.goal === "gain" && avgK < t.kcal * 0.9) tips.push({ kind: "eat", text: `Averaging ${Math.round(avgK)} kcal vs ${t.kcal} target. Add a snack (~${Math.round(t.kcal - avgK)} kcal).` });
  }

  // Weight moving against the goal.
  if (profile && trend) {
    if (profile.goal === "lose" && trend.perWeek > 0.1) tips.push({ kind: "weight", strong: true, text: `Weight trending up ${trend.perWeek} kg/wk while cutting. Tighten portions or add steps.` });
    if (profile.goal === "gain" && trend.perWeek < -0.1) tips.push({ kind: "weight", strong: true, text: `Weight trending down ${Math.abs(trend.perWeek)} kg/wk while bulking. Eat more.` });
    if (profile.goal === "lose" && trend.perWeek < -1.2) tips.push({ kind: "weight", text: `Losing ${Math.abs(trend.perWeek)} kg/wk is fast. Ease the deficit to protect muscle.` });
  }

  // Logging habit.
  const weighIns = logs.filter((l) => l.day > addDays(today, -7)).length;
  if (weighIns < 4) tips.push({ kind: "habit", text: `Only ${weighIns} weigh-ins this week. Daily weigh-ins make the trend reliable.` });
  if (!profile && ready) tips.unshift({ kind: "habit", strong: true, text: "Set up your profile to unlock calorie targets and meal plans." });

  return tips.slice(0, 4);
}
