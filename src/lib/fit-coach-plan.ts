/**
 * The coach's training week. Pure functions (no I/O), shared by the server actions and the page.
 *
 * A plan is seven days, Monday to Sunday. Sunday is always the day off. What you actually log wins:
 * a logged gym day shows the muscles you trained (and is "swapped" when they differ from the plan),
 * and completed days are locked whenever the rest of the week is re-planned.
 */
import { addDays, daysBetween, weekStart, type FitLog } from "./fit-stats";
import { MUSCLES, isMuscle, muscleLabel, type Muscle } from "./fit-units";

export type CoachDay = { day: string; muscles: Muscle[]; rest: boolean; note: string };
export type WeekPlanRow = { week_start: string; days: CoachDay[]; generated_at: string };

export type DayStatus = "done" | "rest-logged" | "missed" | "today" | "planned" | "off";
export type MergedDay = {
  day: string;
  weekday: string;
  status: DayStatus;
  /** What the coach planned for this day (null with no plan). */
  planned: CoachDay | null;
  /** What to show: the logged muscles on a completed day, else the plan. */
  muscles: Muscle[];
  rest: boolean;
  /** Logged muscles differ from the plan. */
  swapped: boolean;
  note: string;
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const same = (a: Muscle[], b: Muscle[]) => a.length === b.length && a.every((m) => b.includes(m));
const order = (ms: Muscle[]) => MUSCLES.filter((m) => ms.includes(m));
export const musclesText = (ms: Muscle[]) => (ms.length ? ms.map(muscleLabel).join(" + ") : "Rest");

/** This week's seven dates, Monday first. */
export const weekDays = (today: string) => Array.from({ length: 7 }, (_, i) => addDays(weekStart(today), i));

/** Line up the plan with what was actually logged this week. */
export function mergeWeek(plan: WeekPlanRow | null, logs: FitLog[], today: string) {
  const byDay = new Map(logs.map((l) => [l.day, l]));
  const planBy = new Map((plan?.days ?? []).map((d) => [d.day, d]));
  const days: MergedDay[] = weekDays(today).map((day, i) => {
    const planned = planBy.get(day) ?? null;
    const log = byDay.get(day);
    const base = { day, weekday: WEEKDAYS[i], planned };
    if (log) {
      if (log.gym) {
        const actual = order(log.muscles);
        const swapped = Boolean(planned) && (planned!.rest || !same(actual, planned!.muscles));
        return { ...base, status: "done" as const, muscles: actual, rest: false, swapped, note: swapped && planned ? `Planned ${musclesText(planned.muscles)}` : planned?.note ?? "" };
      }
      const swapped = Boolean(planned) && !planned!.rest && i !== 6;
      return { ...base, status: "rest-logged" as const, muscles: [], rest: true, swapped, note: swapped && planned ? `Planned ${musclesText(planned.muscles)}` : "Rest day" };
    }
    if (i === 6) return { ...base, status: "off" as const, muscles: [], rest: true, swapped: false, note: "Day off" };
    const status: DayStatus = day < today ? "missed" : day === today ? "today" : "planned";
    return { ...base, status, muscles: planned?.muscles ?? [], rest: planned?.rest ?? false, swapped: false, note: planned?.note ?? "" };
  });
  // Re-planning is worth it when what happened differs from the plan (a swap, a skipped session).
  const needsUpdate =
    Boolean(plan) && days.some((d) => d.swapped || (d.status === "missed" && d.planned && !d.planned.rest));
  const completedGym = days.filter((d) => d.status === "done").length;
  return { days, needsUpdate, completedGym };
}

/** Days that can't change on a re-plan: completed, logged-rest and past days (saved as they happened). */
export function lockedDays(merged: MergedDay[]): CoachDay[] {
  return merged
    .filter((d) => d.status === "done" || d.status === "rest-logged" || d.status === "missed")
    .map((d) =>
      d.status === "done"
        ? { day: d.day, muscles: d.muscles, rest: false, note: "Completed" }
        : { day: d.day, muscles: [], rest: true, note: d.status === "missed" ? "Missed" : "Rest day" },
    );
}

/** Days still to plan: today (if not logged yet) through Saturday. */
export const openDays = (merged: MergedDay[]) => merged.filter((d) => d.status === "today" || d.status === "planned").map((d) => d.day);

/** Days since each muscle was last trained (60 when never), counted from `today`. */
export function lastTrained(logs: FitLog[], today: string, extra: CoachDay[] = []) {
  const out = {} as Record<Muscle, number>;
  for (const m of MUSCLES) {
    const days = [...logs.filter((l) => l.gym && l.muscles.includes(m)).map((l) => l.day), ...extra.filter((d) => d.muscles.includes(m)).map((d) => d.day)];
    const last = days.filter((d) => d <= today).sort().at(-1);
    out[m] = last ? daysBetween(last, today) : 60;
  }
  return out;
}

/** Common pairings the planner builds sessions from. */
const GROUPS: Muscle[][] = [["chest", "triceps"], ["back", "biceps"], ["legs"], ["shoulders", "chest"], ["back", "triceps"], ["legs", "shoulders"]];

/** Spread `n` sessions across the open days, avoiding back-to-back days where possible. */
function pickDays(open: string[], n: number, lockedGym: Set<string>) {
  if (n <= 0) return [];
  if (n >= open.length) return [...open];
  const chosen: string[] = [];
  const step = open.length / n;
  for (let k = 0; k < n; k++) chosen.push(open[Math.min(open.length - 1, Math.floor(k * step + step / 2))]);
  // Nudge a day off a completed gym day when a neighbour is free.
  return chosen.map((d) => {
    if (!lockedGym.has(addDays(d, -1))) return d;
    const alt = open.find((o) => !chosen.includes(o) && !lockedGym.has(addDays(o, -1)) && o > d);
    return alt ?? d;
  });
}

/**
 * Deterministic backup plan (no AI): spreads the remaining sessions over the open days and gives each
 * the most-rested pairing that doesn't repeat a muscle from the day before.
 */
export function fallbackPlan(input: { today: string; merged: MergedDay[]; logs: FitLog[]; gymLeft: number }): CoachDay[] {
  const locked = lockedDays(input.merged);
  const open = openDays(input.merged);
  const lockedGym = new Set(locked.filter((d) => !d.rest).map((d) => d.day));
  const gymDays = new Set(pickDays(open, input.gymLeft, lockedGym));
  const since = lastTrained(input.logs, input.today, locked);
  const plan: CoachDay[] = [];
  const all = weekDays(input.today);
  for (const day of all) {
    const lock = locked.find((d) => d.day === day);
    if (lock) {
      plan.push(lock);
      continue;
    }
    if (day === all[6]) {
      plan.push({ day, muscles: [], rest: true, note: "Day off" });
      continue;
    }
    if (!gymDays.has(day)) {
      plan.push({ day, muscles: [], rest: true, note: "Rest & recover" });
      continue;
    }
    const prev = plan.at(-1)?.muscles ?? [];
    const best = GROUPS.filter((g) => !g.some((m) => prev.includes(m))).sort((a, b) => Math.min(...b.map((m) => since[m])) - Math.min(...a.map((m) => since[m])))[0] ?? ["legs"];
    plan.push({ day, muscles: order(best), rest: false, note: "Most rested" });
    for (const m of MUSCLES) since[m] += 1;
    best.forEach((m) => (since[m] = 0));
  }
  return plan;
}

/**
 * Clean an AI plan into seven valid days: known muscles only (max 3 a day), locked days unchanged,
 * Sunday off, no more sessions than are left this week, and no muscle on back-to-back days. Any open
 * day the AI left out is filled from the backup plan.
 */
export function validatePlan(raw: unknown, input: { today: string; merged: MergedDay[]; logs: FitLog[]; gymLeft: number }): CoachDay[] {
  const backup = fallbackPlan(input);
  const locked = new Map(lockedDays(input.merged).map((d) => [d.day, d]));
  const open = new Set(openDays(input.merged));
  const list = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  const fromAI = new Map(
    list
      .filter((d) => d && typeof d.day === "string")
      .map((d) => {
        const muscles = order((Array.isArray(d.muscles) ? d.muscles : []).filter(isMuscle)).slice(0, 3);
        const rest = Boolean(d.rest) || !muscles.length;
        const note = typeof d.note === "string" ? d.note.trim().slice(0, 60) : "";
        return [d.day as string, { day: d.day as string, muscles: rest ? [] : muscles, rest, note: note || (rest ? "Rest & recover" : "") }] as const;
      }),
  );
  const all = weekDays(input.today);
  let gymLeft = input.gymLeft;
  const plan: CoachDay[] = [];
  for (const day of all) {
    const lock = locked.get(day);
    if (lock) {
      plan.push(lock);
      continue;
    }
    if (day === all[6] || !open.has(day)) {
      plan.push({ day, muscles: [], rest: true, note: day === all[6] ? "Day off" : "Rest & recover" });
      continue;
    }
    let d = fromAI.get(day) ?? backup.find((b) => b.day === day)!;
    if (!d.rest) {
      if (gymLeft <= 0) d = { day, muscles: [], rest: true, note: "Rest & recover" };
      else {
        const prev = plan.at(-1)?.muscles ?? [];
        const ms = d.muscles.filter((m) => !prev.includes(m));
        d = ms.length ? { ...d, muscles: ms } : (backup.find((b) => b.day === day && !b.rest && !b.muscles.some((m) => prev.includes(m))) ?? { day, muscles: [], rest: true, note: "Rest & recover" });
        if (!d.rest) gymLeft--;
      }
    }
    plan.push(d);
  }
  return plan;
}
