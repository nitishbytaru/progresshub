/** Core progress math. Pure functions only, so it works the same once data comes from Supabase. */

export const GOAL = 500_000;
export const MILESTONES = [100_000, 250_000, 500_000] as const;

/** One manual log: the creator's cumulative X impressions at the end of `date` (YYYY-MM-DD). */
export type Entry = { date: string; total: number };

export type DayRow = Entry & {
  delta: number | null;
  growthPct: number | null;
  progressPct: number;
};

const DAY_MS = 86_400_000;

export function toUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return isoDate(toUTC(date) + days * DAY_MS);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** Sorts ascending and derives the day-over-day change for each log. */
export function withDeltas(entries: Entry[]): DayRow[] {
  const sorted = [...entries].sort((a, b) => toUTC(a.date) - toUTC(b.date));
  return sorted.map((entry, i) => {
    const prev = sorted[i - 1];
    // A gap of several days is spread evenly so the "daily" figure stays honest.
    const gap = prev ? Math.max(1, daysBetween(prev.date, entry.date)) : 1;
    const delta = prev ? Math.round((entry.total - prev.total) / gap) : null;
    const growthPct = prev && prev.total > 0 ? ((entry.total - prev.total) / prev.total) * 100 : null;
    return { ...entry, delta, growthPct, progressPct: (entry.total / GOAL) * 100 };
  });
}

/** Average daily gain across the last `days` calendar days of logs. */
export function paceOver(rows: DayRow[], days: number): number {
  if (rows.length < 2) return 0;
  const last = rows[rows.length - 1];
  const cutoff = addDays(last.date, -days);
  const base = [...rows].reverse().find((r) => toUTC(r.date) <= toUTC(cutoff)) ?? rows[0];
  const span = daysBetween(base.date, last.date);
  return span > 0 ? (last.total - base.total) / span : 0;
}

export type Forecast = { daysLeft: number; etaDate: string } | null;

/** Projects when `total` reaches `target` at a constant daily `pace`. Null when pace can't get there. */
export function forecast(total: number, pace: number, fromDate: string, target = GOAL): Forecast {
  if (total >= target) return { daysLeft: 0, etaDate: fromDate };
  if (pace <= 0) return null;
  const daysLeft = Math.ceil((target - total) / pace);
  return { daysLeft, etaDate: addDays(fromDate, daysLeft) };
}

export type MilestoneStatus = {
  target: number;
  reachedOn: string | null;
  estimatedOn: string | null;
};

export function milestones(rows: DayRow[], pace: number): MilestoneStatus[] {
  const last = rows[rows.length - 1];
  return MILESTONES.map((target) => {
    const hit = rows.find((r) => r.total >= target);
    if (hit) return { target, reachedOn: hit.date, estimatedOn: null };
    const f = last ? forecast(last.total, pace, last.date, target) : null;
    return { target, reachedOn: null, estimatedOn: f?.etaDate ?? null };
  });
}

/** Consecutive days with a log, ending today or yesterday (a streak survives until a day is missed). */
export function streak(rows: DayRow[], today: string): number {
  if (!rows.length) return 0;
  const last = rows[rows.length - 1];
  if (daysBetween(last.date, today) > 1) return 0;
  let count = 1;
  for (let i = rows.length - 1; i > 0; i--) {
    if (daysBetween(rows[i - 1].date, rows[i].date) === 1) count++;
    else break;
  }
  return count;
}

/** Furthest deadline a creator can pick or share (years). */
export const MAX_TARGET_YEARS = 5;

/** A deadline is a real calendar day after `from` and at most MAX_TARGET_YEARS ahead. */
export function isValidTarget(target: string, from: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target) || Number.isNaN(toUTC(target)) || isoDate(toUTC(target)) !== target) return false;
  const days = daysBetween(from, target);
  return days >= 1 && days <= MAX_TARGET_YEARS * 366;
}

/** What it takes to reach 500K by `target`, counting from the latest log on `from`. */
export function targetPlan(total: number, from: string, target: string) {
  const remaining = Math.max(0, GOAL - total);
  const days = Math.max(1, daysBetween(from, target));
  return { remaining, days, perDay: remaining / days };
}
