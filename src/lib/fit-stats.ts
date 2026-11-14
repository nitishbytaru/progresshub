/**
 * Pure analysis of a user's fitness logs (no I/O), shared by the Home page cards.
 * Every weight here is kg; the UI converts to the viewer's unit.
 */
import { MUSCLES, type Muscle } from "./fit-units";

export type FitLog = { day: string; kg: number; gym: boolean; muscles: Muscle[] };

const DAY = 86_400_000;
const utc = (d: string) => Date.parse(`${d}T00:00:00Z`);
export const addDays = (d: string, n: number) => new Date(utc(d) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (a: string, b: string) => Math.round((utc(b) - utc(a)) / DAY);
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Monday of the week containing `d`. */
export const weekStart = (d: string) => addDays(d, -((new Date(utc(d)).getUTCDay() + 6) % 7));

export type TrendPoint = { day: string; kg: number; avg: number };

export type FitStats = {
  latest: FitLog | null;
  /** Latest minus the weight ~30 days earlier (or the oldest log in that window). */
  change30: number | null;
  change30From: string | null;
  avg7: number | null;
  /** Lowest / highest over the trend window. */
  low: { day: string; kg: number } | null;
  high: { day: string; kg: number } | null;
  /** Oldest → newest over the last 90 days, each with its trailing 7-day average. */
  trend: TrendPoint[];
  /** Days logged in the last 30. */
  logged30: number;
  /** Mon → Sun of this week: null = future day. */
  gymWeek: { day: string; gym: boolean | null; muscles: Muscle[]; kg: number | null }[];
  gymWeekCount: number;
  gymThisMonth: number;
  gymTotal: number;
  /** Gym days per week for the last 8 weeks, oldest first. */
  gymWeeks: { start: string; count: number; days: { day: string; muscles: Muscle[] }[] }[];
  avgPerWeek: number;
  /** Consecutive weeks (ending this week or last) with at least one gym day. */
  weekStreak: number;
  muscles: { muscle: Muscle; count30: number; lastDay: string | null; daysAgo: number | null }[];
};

/** `logs` newest first (as getWeights returns them); `gymBefore` = gym days older than `logs`. */
export function analyze(logs: FitLog[], today: string, gymBefore = 0): FitStats {
  const asc = [...logs].sort((a, b) => a.day.localeCompare(b.day));
  const latest = asc.at(-1) ?? null;

  // 30-day change: compare with the newest log on or before today-30, else the oldest within 30 days.
  const cut30 = addDays(today, -30);
  const base30 = [...asc].reverse().find((l) => l.day <= cut30) ?? asc.find((l) => l.day > cut30) ?? null;
  const change30 = latest && base30 && base30 !== latest ? latest.kg - base30.kg : null;

  const in7 = asc.filter((l) => l.day > addDays(today, -7));
  const avg7 = mean(in7.map((l) => l.kg));

  const window = asc.filter((l) => l.day > addDays(today, -90));
  const trend = window.map((l) => ({
    day: l.day,
    kg: l.kg,
    avg: mean(window.filter((w) => w.day <= l.day && w.day > addDays(l.day, -7)).map((w) => w.kg))!,
  }));
  const low = window.reduce<FitLog | null>((m, l) => (!m || l.kg < m.kg ? l : m), null);
  const high = window.reduce<FitLog | null>((m, l) => (!m || l.kg > m.kg ? l : m), null);

  const logged30 = asc.filter((l) => l.day > cut30).length;

  const gymSet = new Set(asc.filter((l) => l.gym).map((l) => l.day));
  const byDay = new Map(asc.map((l) => [l.day, l]));
  const mon = weekStart(today);
  const gymWeek = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(mon, i);
    return { day, gym: day > today ? null : gymSet.has(day), muscles: byDay.get(day)?.muscles ?? [], kg: byDay.get(day)?.kg ?? null };
  });
  const monthStart = `${today.slice(0, 8)}01`;
  const gymThisMonth = [...gymSet].filter((d) => d >= monthStart && d <= today).length;

  const gymWeeks = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(mon, -7 * (7 - i));
    const end = addDays(start, 6);
    const days = [...gymSet]
      .filter((d) => d >= start && d <= end)
      .sort()
      .map((d) => ({ day: d, muscles: byDay.get(d)?.muscles ?? [] }));
    return { start, count: days.length, days };
  });
  const last4 = gymWeeks.slice(-4);
  const avgPerWeek = last4.reduce((a, w) => a + w.count, 0) / 4;

  // Week streak: this week counts if it already has a gym day; otherwise start from last week.
  let weekStreak = 0;
  const weeks = [...gymWeeks].reverse();
  for (let i = weeks[0].count > 0 ? 0 : 1; i < weeks.length && weeks[i].count > 0; i++) weekStreak++;

  const muscles = MUSCLES.map((muscle) => {
    const days = asc.filter((l) => l.gym && l.muscles.includes(muscle)).map((l) => l.day);
    const lastDay = days.at(-1) ?? null;
    return {
      muscle,
      count30: days.filter((d) => d > cut30).length,
      lastDay,
      daysAgo: lastDay ? daysBetween(lastDay, today) : null,
    };
  });

  return {
    latest,
    change30,
    change30From: base30?.day ?? null,
    avg7,
    low: low && { day: low.day, kg: low.kg },
    high: high && { day: high.day, kg: high.kg },
    trend,
    logged30,
    gymWeek,
    gymWeekCount: gymWeek.filter((d) => d.gym).length,
    gymThisMonth,
    gymTotal: gymBefore + gymSet.size,
    gymWeeks,
    avgPerWeek,
    weekStreak,
    muscles,
  };
}
