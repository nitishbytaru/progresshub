import "server-only";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import { getToday } from "./data";
import { UNIT_COOKIE, isMuscle, isUnit, type Muscle, type Unit } from "./fit-units";
import type { CustomExerciseRow } from "./fit-exercises";
import type { CoachDay, WeekPlanRow } from "./fit-coach-plan";
import type { MealPrepRow, PrepMeal, PrepWarning } from "./fit-coach-meals";
import { MAX_TURNS, type ChatTurn } from "./fit-coach-chat";
import type { Diet, Meal } from "./fit-foods";
import type { FitProfile } from "./fit-nutrition";

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

/**
 * True when a Supabase error means the trainer tables aren't migrated yet (42P01 / PGRST205):
 * pages then render their empty states instead of crashing.
 */
const missingTable = (e: { code?: string; message?: string } | null) =>
  Boolean(e && (e.code === "42P01" || e.code === "PGRST205" || /schema cache|does not exist/i.test(e.message ?? "")));

export async function getProfile(): Promise<FitProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("fit_profiles").select("*").maybeSingle();
  if (error) {
    if (missingTable(error)) return null;
    throw error;
  }
  if (!data) return null;
  return {
    sex: data.sex,
    birth_year: data.birth_year,
    height_cm: Number(data.height_cm),
    activity: data.activity,
    goal: data.goal,
    target_kg: data.target_kg === null ? null : Number(data.target_kg),
    weekly_rate_kg: Number(data.weekly_rate_kg),
    diet: data.diet as Diet,
    gym_days_target: data.gym_days_target,
    water_target_ml: data.water_target_ml,
  };
}

export type FoodEntry = {
  id: string;
  day: string;
  meal: Meal;
  source: "builtin" | "custom" | "ai";
  food_key: string | null;
  name: string;
  serving_label: string;
  servings: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

/** Food diary entries between two days (inclusive), oldest first. */
export async function getFoodRange(from: string, to: string): Promise<FoodEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("food_logs")
    .select("id, day, meal, source, food_key, name, serving_label, servings, kcal, protein_g, carbs_g, fat_g, fiber_g")
    .gte("day", from)
    .lte("day", to)
    .order("day")
    .order("created_at");
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    day: r.day,
    meal: r.meal,
    source: r.source,
    food_key: r.food_key,
    name: r.name,
    serving_label: r.serving_label,
    servings: Number(r.servings),
    kcal: Number(r.kcal),
    protein: Number(r.protein_g),
    carbs: Number(r.carbs_g),
    fat: Number(r.fat_g),
    fiber: Number(r.fiber_g ?? 0),
  }));
}

export type CustomFood = { id: string; name: string; serving_label: string; kcal: number; protein: number; carbs: number; fat: number; fiber: number; diet: Diet };

export async function getCustomFoods(): Promise<CustomFood[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("custom_foods").select("*").order("name");
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    serving_label: r.serving_label,
    kcal: Number(r.kcal),
    protein: Number(r.protein_g),
    carbs: Number(r.carbs_g),
    fat: Number(r.fat_g),
    fiber: Number(r.fiber_g ?? 0),
    diet: r.diet,
  }));
}

export type FitDay = { day: string; water_ml: number; sleep_h: number | null; steps: number | null; note: string | null };

export async function getFitDays(from: string, to: string): Promise<FitDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("fit_days").select("day, water_ml, sleep_h, steps, note").gte("day", from).lte("day", to).order("day");
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((r) => ({ day: r.day, water_ml: r.water_ml, sleep_h: r.sleep_h === null ? null : Number(r.sleep_h), steps: r.steps, note: r.note }));
}

/** Your own exercises, oldest first (so each keeps its colour). Empty until the table exists. */
export async function getCustomExercises(): Promise<CustomExerciseRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("custom_exercises").select("id, name, muscle, bodyweight").order("created_at");
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).filter((r) => isMuscle(r.muscle)).map((r) => ({ id: r.id, name: r.name, muscle: r.muscle, bodyweight: Boolean(r.bodyweight) }));
}

export type WorkoutSet = { id: string; day: string; exercise_key: string; muscle: Muscle; set_no: number; reps: number; weight_kg: number };

export async function getSets(from: string, to: string): Promise<WorkoutSet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sets")
    .select("id, day, exercise_key, muscle, set_no, reps, weight_kg")
    .gte("day", from)
    .lte("day", to)
    .order("day")
    .order("set_no");
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).filter((r) => isMuscle(r.muscle)).map((r) => ({ ...r, muscle: r.muscle as Muscle, weight_kg: Number(r.weight_kg) }));
}

/** True once the trainer tables exist (so pages can show a "being set up" note instead of forms). */
export async function trainerReady(): Promise<boolean> {
  const supabase = await createClient();
  // A GET (not HEAD): HEAD responses carry no error body, so a missing table would look fine.
  const { error } = await supabase.from("fit_profiles").select("user_id").limit(1);
  return !missingTable(error);
}

/** The viewer's chosen weight unit (cookie), kg by default. */
export async function getUnit(): Promise<Unit> {
  const v = (await cookies()).get(UNIT_COOKIE)?.value;
  return isUnit(v) ? v : "kg";
}

/** This week's coach plan (null until generated, or before the coach tables exist). */
export async function getWeekPlan(weekStart: string): Promise<WeekPlanRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("coach_week_plans").select("week_start, days, generated_at").eq("week_start", weekStart).maybeSingle();
  if (error) {
    if (missingTable(error)) return null;
    throw error;
  }
  return data ? { week_start: data.week_start, days: (data.days ?? []) as CoachDay[], generated_at: data.generated_at } : null;
}

/** Today's meal prep: ingredients and any generated meals (null before first use). */
export async function getMealPrep(day: string): Promise<MealPrepRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("coach_meal_preps").select("day, ingredients, meals, warnings, generated_at").eq("day", day).maybeSingle();
  if (error) {
    if (missingTable(error)) return null;
    throw error;
  }
  return data
    ? { day: data.day, ingredients: (data.ingredients ?? []) as string[], meals: (data.meals ?? []) as PrepMeal[], warnings: (data.warnings ?? []) as PrepWarning[], generated_at: data.generated_at }
    : null;
}

export type FitDataCounts = { weighIns: number; sets: number; meals: number; days: number; foods: number };

/** How many rows "Clear fit data" would delete, per kind (RLS scopes every count to the viewer). */
export async function getFitDataCounts(): Promise<FitDataCounts> {
  const supabase = await createClient();
  const count = async (table: string) => {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    return error ? 0 : (count ?? 0);
  };
  const [weighIns, sets, meals, days, foods] = await Promise.all(
    ["weight_logs", "workout_sets", "food_logs", "fit_days", "custom_foods"].map(count),
  );
  return { weighIns, sets, meals, days, foods };
}

/** Today's Coach Dumbo chat thread (empty before the first message, or before the table exists). */
export async function getCoachChat(day: string): Promise<ChatTurn[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("coach_chats").select("turns").eq("day", day).maybeSingle();
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return ((data?.turns ?? []) as ChatTurn[]).slice(-MAX_TURNS);
}
