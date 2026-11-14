import "server-only";
import { createClient } from "./supabase/server";
import { getToday } from "./data";
import { isMuscle, type Muscle } from "./fit-units";

export type WeightLog = { day: string; kg: number; gym: boolean; muscles: Muscle[] };

/** How far back a weight can be added or corrected. */
export const MAX_BACKFILL_DAYS = 365;

/** Checks a YYYY-MM-DD day is real, not in the future and within the backfill window. */
export function validateDay(day: string, today: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) return "Pick a valid day.";
  if (day > today) return "You can't log a day that hasn't happened yet.";
  if (day < lastDays(today, MAX_BACKFILL_DAYS + 1)[0]) return `You can only log the last ${MAX_BACKFILL_DAYS} days.`;
  return null;
}

/** Days from `from` to `to` (YYYY-MM-DD), oldest first. */
export function lastDays(today: string, count: number): string[] {
  const end = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

/**
 * The signed-in user's logs for the last `days` days (newest first), their local "today",
 * and how many gym days they logged before that window (so "Gym day N" counts every visit).
 */
export async function getWeights(days = MAX_BACKFILL_DAYS + 1) {
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const since = lastDays(today, days)[0];
  const [recent, older] = await Promise.all([
    supabase
      .from("weight_logs")
      .select("day, kg, gym, muscles")
      .gte("day", since)
      .lte("day", today)
      .order("day", { ascending: false }),
    supabase.from("weight_logs").select("day", { count: "exact", head: true }).eq("gym", true).lt("day", since),
  ]);
  if (recent.error) throw recent.error;
  const logs: WeightLog[] = (recent.data ?? []).map((r) => ({
    day: r.day as string,
    kg: Number(r.kg),
    gym: Boolean(r.gym),
    muscles: ((r.muscles as string[] | null) ?? []).filter(isMuscle),
  }));
  return { today, logs, gymBefore: older.count ?? 0 };
}
