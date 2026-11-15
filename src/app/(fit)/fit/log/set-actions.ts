"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { validateDay } from "@/lib/fit";
import { EXERCISE_BY_KEY, customKey, isCustomKey } from "@/lib/fit-exercises";
import { KG_PER_LB, isMuscle, isUnit, type Muscle } from "@/lib/fit-units";
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

/**
 * Log one or more sets of an exercise, each with its own reps and weight (e.g. 15×0, 12×10, 10×10).
 * They're numbered on from what's already logged today. The muscle comes from the exercise library
 * (or your own saved exercise), never the browser.
 */
export async function addSet(input: { day: string; exercise: string; unit: string; sets: { reps: number; weight: number }[] }): Promise<SetResult> {
  const builtin = EXERCISE_BY_KEY.get(input.exercise);
  if (!builtin && !isCustomKey(input.exercise)) return { error: "Pick an exercise." };
  if (!Array.isArray(input.sets) || !input.sets.length) return { error: "Add at least one set." };
  if (input.sets.length > 10) return { error: "Log up to 10 sets at a time." };
  const unit = isUnit(input.unit) ? input.unit : "kg";
  const clean: { reps: number; kg: number }[] = [];
  for (const [i, s] of input.sets.entries()) {
    const reps = Math.round(Number(s?.reps));
    if (!(reps >= 1 && reps <= 100)) return { error: `Set ${i + 1}: reps must be 1–100.` };
    const kg = Math.round(Number(s?.weight || 0) * (unit === "lb" ? KG_PER_LB : 1) * 10) / 10;
    if (!(kg >= 0 && kg <= 600)) return { error: `Set ${i + 1}: weight must be 0–600 kg.` };
    clean.push({ reps, kg });
  }
  const { supabase, user, dayError } = await ctx(input.day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  // Your own exercise: its muscle comes from your saved row (RLS keeps it to your own).
  let ex: { key: string; muscle: Muscle } | undefined = builtin;
  if (!ex) {
    const id = input.exercise.slice(2);
    const { data, error: e0 } = await supabase.from("custom_exercises").select("id, muscle").eq("id", id).maybeSingle();
    if (e0) return fail(e0.code);
    if (!data || !isMuscle(data.muscle)) return { error: "That exercise no longer exists." };
    ex = { key: customKey(data.id), muscle: data.muscle };
  }
  const { count, error: e1 } = await supabase.from("workout_sets").select("id", { count: "exact", head: true }).eq("day", input.day).eq("exercise_key", ex.key);
  if (e1) return fail(e1.code);
  const from = count ?? 0;
  if (from + clean.length > 30) return { error: "That's more than 30 sets of one exercise today." };
  const rows = clean.map((c, k) => ({ user_id: user.id, day: input.day, exercise_key: ex.key, muscle: ex.muscle, set_no: from + k + 1, reps: c.reps, weight_kg: c.kg }));
  const { error } = await supabase.from("workout_sets").insert(rows);
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

/** Minutes asleep from bedtime to wake-up ("23:30" → "07:00" = 450), crossing midnight when needed. */
function sleepMinutes(bed: string, wake: string): number | null {
  const t = (v: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) : null);
  const b = t(bed);
  const w = t(wake);
  if (b === null || w === null) return null;
  return ((w - b + 1440) % 1440) || 1440;
}

/** Last night's sleep from bedtime and wake-up time. Saves only sleep (steps stay as they were). */
export async function setSleep(day: string, times: { bed: string; wake: string }): Promise<SetResult & { hours?: number }> {
  const mins = sleepMinutes(String(times.bed ?? ""), String(times.wake ?? ""));
  if (mins === null) return { error: "Pick a bedtime and a wake-up time." };
  if (mins < 30 || mins > 16 * 60) return { error: "That's not a night's sleep: check the times (30 min to 16 h)." };
  const hours = Math.round((mins / 60) * 10) / 10;
  const { supabase, user, dayError } = await ctx(day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const { error } = await supabase.from("fit_days").upsert({ user_id: user.id, day, sleep_h: hours, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) return fail(error.code);
  revalidatePath("/fit", "layout");
  return { ok: true, hours };
}

export type ExerciseResult = { error?: string; exercise?: { id: string; name: string; muscle: Muscle; bodyweight: boolean } };

/** Save your own exercise (anything missing from the built-in list). */
export async function addCustomExercise(input: { name: string; muscle: string; bodyweight: boolean }): Promise<ExerciseResult> {
  const name = String(input.name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  if (name.length < 2) return { error: "Give the exercise a name." };
  if (!isMuscle(input.muscle)) return { error: "Pick a muscle group." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const { data, error } = await supabase
    .from("custom_exercises")
    .insert({ user_id: user.id, name, muscle: input.muscle, bodyweight: Boolean(input.bodyweight) })
    .select("id, name, muscle, bodyweight")
    .single();
  if (error) {
    if (error.code === "23505") return { error: `You already have “${name}”.` };
    if (missing(error.code)) return { error: "Custom exercises aren't set up on the server yet." };
    return { error: "Couldn't save that exercise. Try again." };
  }
  revalidatePath("/fit", "layout");
  return { exercise: { id: data.id, name: data.name, muscle: data.muscle as Muscle, bodyweight: Boolean(data.bodyweight) } };
}
