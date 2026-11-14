"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { validateDay } from "@/lib/fit";
import { parseMeal, type ParsedFood } from "@/lib/fit-ai";
import { FOOD_BY_KEY, type Diet, type Meal } from "@/lib/fit-foods";
import { createClient } from "@/lib/supabase/server";

export type FoodResult = { error?: string; ok?: true };

const MEALS: Meal[] = ["breakfast", "lunch", "dinner", "snack"];
const DIETS: Diet[] = ["vegan", "veg", "egg", "nonveg"];
const MEAL_AI_CAP = 40;
const r1 = (n: number) => Math.round(n * 10) / 10;
const missing = (code?: string) => code === "42P01" || code === "PGRST205";

async function session(day: string) {
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const dayError = validateDay(day, today);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, today, user, dayError };
}

const done = (error?: { code?: string } | null): FoodResult => {
  if (!error) {
    revalidatePath("/fit", "layout");
    return { ok: true };
  }
  if (missing(error.code)) return { error: "Food logging isn't set up on the server yet." };
  return { error: "Couldn't save that. Try again in a moment." };
};

/** Add a built-in or custom food. Nutrition is looked up here, never taken from the browser. */
export async function addFood(input: { day: string; meal: Meal; key?: string; customId?: string; servings: number }): Promise<FoodResult> {
  if (!MEALS.includes(input.meal)) return { error: "Pick a meal." };
  const servings = Number(input.servings);
  if (!(servings > 0 && servings <= 20)) return { error: "Servings must be between 0.25 and 20." };
  const { supabase, user, dayError } = await session(input.day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };

  let row: { source: "builtin" | "custom"; food_key: string | null; name: string; serving_label: string; kcal: number; p: number; c: number; f: number };
  if (input.key) {
    const food = FOOD_BY_KEY.get(input.key);
    if (!food) return { error: "That food isn't in the list." };
    row = { source: "builtin", food_key: food.key, name: food.name, serving_label: food.serving, kcal: food.kcal, p: food.protein, c: food.carbs, f: food.fat };
  } else if (input.customId) {
    const { data, error } = await supabase.from("custom_foods").select("*").eq("id", input.customId).maybeSingle();
    if (error || !data) return done(error ?? { code: "x" });
    row = { source: "custom", food_key: data.id, name: data.name, serving_label: data.serving_label, kcal: Number(data.kcal), p: Number(data.protein_g), c: Number(data.carbs_g), f: Number(data.fat_g) };
  } else {
    return { error: "Pick a food." };
  }

  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    day: input.day,
    meal: input.meal,
    source: row.source,
    food_key: row.food_key,
    name: row.name,
    serving_label: row.serving_label,
    servings,
    kcal: r1(row.kcal * servings),
    protein_g: r1(row.p * servings),
    carbs_g: r1(row.c * servings),
    fat_g: r1(row.f * servings),
  });
  return done(error);
}

/** Change servings on an entry, scaling its stored nutrition. */
export async function updateServings(id: string, servings: number): Promise<FoodResult> {
  if (!(servings > 0 && servings <= 20)) return { error: "Servings must be between 0.25 and 20." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("food_logs").select("servings, kcal, protein_g, carbs_g, fat_g").eq("id", id).maybeSingle();
  if (error || !data) return done(error ?? { code: "x" });
  const k = servings / Number(data.servings);
  const { error: e2 } = await supabase
    .from("food_logs")
    .update({ servings, kcal: r1(Number(data.kcal) * k), protein_g: r1(Number(data.protein_g) * k), carbs_g: r1(Number(data.carbs_g) * k), fat_g: r1(Number(data.fat_g) * k) })
    .eq("id", id);
  return done(e2);
}

export async function deleteFood(id: string): Promise<FoodResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("food_logs").delete().eq("id", id);
  return done(error);
}

/** Copy every entry of a meal from one day onto another (e.g. yesterday's breakfast). */
export async function copyMeal(fromDay: string, toDay: string, meal: Meal): Promise<FoodResult> {
  if (!MEALS.includes(meal)) return { error: "Pick a meal." };
  const { supabase, user, dayError } = await session(toDay);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const { data, error } = await supabase.from("food_logs").select("source, food_key, name, serving_label, servings, kcal, protein_g, carbs_g, fat_g").eq("day", fromDay).eq("meal", meal);
  if (error) return done(error);
  if (!data?.length) return { error: "Nothing logged for that meal to copy." };
  const { error: e2 } = await supabase.from("food_logs").insert(data.map((r) => ({ ...r, user_id: user.id, day: toDay, meal })));
  return done(e2);
}

export async function addCustomFood(input: { name: string; serving_label: string; kcal: number; protein: number; carbs: number; fat: number; diet: Diet }): Promise<FoodResult> {
  const name = input.name.trim().slice(0, 80);
  const serving = input.serving_label.trim().slice(0, 40) || "1 serving";
  if (!name) return { error: "Give the food a name." };
  if (!(input.kcal >= 0 && input.kcal <= 5000)) return { error: "Calories must be 0–5000." };
  for (const [l, v, max] of [["Protein", input.protein, 500], ["Carbs", input.carbs, 1000], ["Fat", input.fat, 500]] as const) {
    if (!(v >= 0 && v <= max)) return { error: `${l} must be 0–${max} g.` };
  }
  if (!DIETS.includes(input.diet)) return { error: "Pick a diet type." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("custom_foods").insert({
    user_id: user.id,
    name,
    serving_label: serving,
    kcal: r1(input.kcal),
    protein_g: r1(input.protein),
    carbs_g: r1(input.carbs),
    fat_g: r1(input.fat),
    diet: input.diet,
  });
  return done(error);
}

/** Set the day's water to an absolute amount in ml. */
export async function setWater(day: string, ml: number): Promise<FoodResult> {
  const amount = Math.round(Number(ml));
  if (!(amount >= 0 && amount <= 15000)) return { error: "Water must be 0–15 L." };
  const { supabase, user, dayError } = await session(day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const { error } = await supabase.from("fit_days").upsert({ user_id: user.id, day, water_ml: amount, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  return done(error);
}

/** AI: split a typed meal into foods (nothing is saved until the user confirms). Capped per day. */
export async function describeMeal(text: string): Promise<{ error?: string; items?: ParsedFood[] }> {
  const t = text.trim();
  if (!t) return { error: "Describe what you ate." };
  if (t.length > 300) return { error: "Keep it under 300 characters." };
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const { data: allowed, error } = await supabase.rpc("fit_ai_take", { p_kind: "meal", p_day: today, p_cap: MEAL_AI_CAP });
  if (error) return { error: missing(error.code) || error.code === "PGRST202" ? "AI food entry isn't set up on the server yet." : "AI is unavailable right now. Search the list instead." };
  if (!allowed) return { error: `You've used today's ${MEAL_AI_CAP} AI entries. Search the list instead.` };
  const items = await parseMeal(t);
  if (items === null) return { error: "AI is unavailable right now. Search the list instead." };
  if (!items.length) return { error: "Couldn't find any food in that. Try e.g. “2 rotis, dal and curd”." };
  return { items };
}

/** Save confirmed AI items. Built-in matches are re-priced from our list; others are clamped. */
export async function addParsed(day: string, meal: Meal, items: ParsedFood[]): Promise<FoodResult> {
  if (!MEALS.includes(meal)) return { error: "Pick a meal." };
  if (!Array.isArray(items) || !items.length || items.length > 10) return { error: "Nothing to add." };
  const { supabase, user, dayError } = await session(day);
  if (!user) return { error: "Your session expired. Sign in again." };
  if (dayError) return { error: dayError };
  const clamp = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(0, v)) : 0);
  const rows = items.map((i) => {
    const servings = Math.min(20, Math.max(0.25, clamp(i.servings, 20) || 1));
    const food = i.key ? FOOD_BY_KEY.get(i.key) : undefined;
    if (food) {
      return { source: "builtin", food_key: food.key, name: food.name, serving_label: food.serving, servings, kcal: r1(food.kcal * servings), protein_g: r1(food.protein * servings), carbs_g: r1(food.carbs * servings), fat_g: r1(food.fat * servings) };
    }
    return {
      source: "ai",
      food_key: null,
      name: String(i.name ?? "Food").trim().slice(0, 80) || "Food",
      serving_label: String(i.serving_label ?? "serving").trim().slice(0, 40) || "serving",
      servings,
      kcal: r1(clamp(i.kcal, 5000)),
      protein_g: r1(clamp(i.protein, 300)),
      carbs_g: r1(clamp(i.carbs, 600)),
      fat_g: r1(clamp(i.fat, 300)),
    };
  });
  const { error } = await supabase.from("food_logs").insert(rows.map((r) => ({ ...r, user_id: user.id, day, meal })));
  return done(error);
}
