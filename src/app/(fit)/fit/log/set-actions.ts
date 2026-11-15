"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { validateDay } from "@/lib/fit";
import { EXERCISE_BY_KEY } from "@/lib/fit-exercises";
import { KG_PER_LB, isUnit } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

export type SetResult = { error?: string; ok?: true };
const missing = (code?: string) => code === "42P01" || code === "PGRST205";

async function ctx(day: string) {
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user, dayError: validateDay(day, today) };
}

const fail = (code?: string): SetResult => ({ error: missing(code) ? "Set logging isn't set up on the server yet." : "Couldn't save that. Try again." });

/** Log one set. The muscle comes from the exercise library, never the browser. */
export async function addSet(input: { day: string; exercise: string; reps: number; weight: number; unit: string }): Promise<SetResult> {
  const ex = EXERCISE_BY_KEY.get(input.exercise);
  if (!ex) return { error: "Pick an exercise." };
  const reps = Math.round(Number(input.reps));
  if (!(reps >= 1 && reps <= 100)) return { error: "Reps must be 1–100." };
  const unit = isUnit(input.unit) ? input.unit : "kg";
  const kg = Math.round(Number(input.weight || 0) * (unit === "lb" ? KG_PER_LB : 1) * 10) / 10;
  if (!(kg >= 0 && kg <= 600)) return { error: "Weight must be 0–600 kg." };
  const { supabase, user, dayError } = await ctx(input.day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const { count, error: e1 } = await supabase.from("workout_sets").select("id", { count: "exact", head: true }).eq("day", input.day).eq("exercise_key", ex.key);
  if (e1) return fail(e1.code);
  const { error } = await supabase.from("workout_sets").insert({ user_id: user.id, day: input.day, exercise_key: ex.key, muscle: ex.muscle, set_no: Math.min(30, (count ?? 0) + 1), reps, weight_kg: kg });
  if (error) return fail(error.code);
  revalidatePath("/fit", "layout");
  return { ok: true };
}

export async function deleteSet(id: string): Promise<SetResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_sets").delete().eq("id", id);
  if (error) return fail(error.code);
  revalidatePath("/fit", "layout");
  return { ok: true };
}

/** Sleep hours and steps for a day. */
export async function setExtras(day: string, extras: { sleep_h: number | null; steps: number | null }): Promise<SetResult> {
  const sleep = extras.sleep_h === null ? null : Math.round(Number(extras.sleep_h) * 10) / 10;
  const steps = extras.steps === null ? null : Math.round(Number(extras.steps));
  if (sleep !== null && !(sleep >= 0 && sleep <= 24)) return { error: "Sleep must be 0–24 hours." };
  if (steps !== null && !(steps >= 0 && steps <= 200000)) return { error: "Steps must be 0–200,000." };
  const { supabase, user, dayError } = await ctx(day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const { error } = await supabase.from("fit_days").upsert({ user_id: user.id, day, sleep_h: sleep, steps, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) return fail(error.code);
  revalidatePath("/fit", "layout");
  return { ok: true };
}
