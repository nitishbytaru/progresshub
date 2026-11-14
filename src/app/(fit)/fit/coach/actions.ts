"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { getFoodRange, getProfile, getWeights } from "@/lib/fit";
import { askCoach } from "@/lib/fit-ai";
import { nextWeekPlan, pace, weightTrend } from "@/lib/fit-coach";
import { FOOD_BY_KEY, type Meal } from "@/lib/fit-foods";
import { targets } from "@/lib/fit-nutrition";
import { addDays } from "@/lib/fit-stats";
import { MUSCLES } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

const COACH_AI_CAP = 30;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * AI coach answer. Context is numbers only (no name, email or handle): goal, targets, recent intake,
 * weight trend, gym pace, per-muscle recency and next week's rule-based plan. Capped per day.
 */
export async function askCoachAction(question: string): Promise<{ error?: string; answer?: string }> {
  const q = question.trim();
  if (!q) return { error: "Ask something about training or food." };
  if (q.length > 300) return { error: "Keep it under 300 characters." };
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const { data: allowed, error } = await supabase.rpc("fit_ai_take", { p_kind: "coach", p_day: today, p_cap: COACH_AI_CAP });
  if (error) return { error: "The coach chat isn't set up on the server yet." };
  if (!allowed) return { error: `You've asked ${COACH_AI_CAP} questions today. The plan and tips above still update.` };

  const [profile, { logs }, food] = await Promise.all([getProfile(), getWeights(90), getFoodRange(addDays(today, -6), today)]);
  const kg = logs[0]?.kg ?? null;
  const t = profile && kg ? targets(profile, kg, today) : null;
  const p = pace(logs, today);
  const trend = weightTrend(logs, today);
  const plan = nextWeekPlan(logs, today, profile?.gym_days_target ?? p.keepPace);
  const perDay = new Map<string, { kcal: number; protein: number }>();
  food.forEach((e) => {
    const d = perDay.get(e.day) ?? { kcal: 0, protein: 0 };
    perDay.set(e.day, { kcal: d.kcal + e.kcal, protein: d.protein + e.protein });
  });
  const gym = logs.filter((l) => l.gym);
  const context = {
    today,
    profile: profile && {
      sex: profile.sex,
      age: Number(today.slice(0, 4)) - profile.birth_year,
      height_cm: profile.height_cm,
      activity: profile.activity,
      goal: profile.goal,
      target_kg: profile.target_kg,
      weekly_rate_kg: profile.weekly_rate_kg,
      diet: profile.diet,
      gym_days_target: profile.gym_days_target,
    },
    weight_kg_latest: kg,
    weight_trend_kg_per_week: trend?.perWeek ?? null,
    daily_targets: t && { kcal: t.kcal, protein_g: t.protein, carbs_g: t.carbs, fat_g: t.fat, tdee: t.tdee },
    last_7_days_food: [...perDay].map(([day, v]) => ({ day, kcal: Math.round(v.kcal), protein_g: Math.round(v.protein) })),
    gym_pace: p,
    days_since_trained: Object.fromEntries(
      MUSCLES.map((m) => {
        const d = gym.filter((l) => l.muscles.includes(m)).map((l) => l.day).sort().at(-1);
        return [m, d ? Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000) : null];
      }),
    ),
    next_week_plan: plan.days.filter((d) => d.muscles.length).map((d) => ({ day: d.weekday, muscles: d.muscles })),
  };
  const answer = await askCoach(q, context);
  if (!answer) return { error: "The coach is unavailable right now. Try again in a minute." };
  return { answer };
}

/** Log a planned meal (built-in foods only) to today's diary in one tap. */
export async function logPlannedMeal(meal: Meal, items: { key: string; servings: number }[]): Promise<{ error?: string; ok?: true }> {
  if (!["breakfast", "lunch", "dinner", "snack"].includes(meal)) return { error: "Pick a meal." };
  if (!Array.isArray(items) || !items.length || items.length > 8) return { error: "Nothing to log." };
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Your session expired. Sign in again." };
  const rows = items.flatMap((i) => {
    const f = FOOD_BY_KEY.get(i.key);
    const s = Number(i.servings);
    if (!f || !(s > 0 && s <= 20)) return [];
    return [{ user_id: user.id, day: today, meal, source: "builtin", food_key: f.key, name: f.name, serving_label: f.serving, servings: s, kcal: r1(f.kcal * s), protein_g: r1(f.protein * s), carbs_g: r1(f.carbs * s), fat_g: r1(f.fat * s) }];
  });
  if (!rows.length) return { error: "Nothing to log." };
  const { error } = await supabase.from("food_logs").insert(rows);
  if (error) return { error: error.code === "42P01" || error.code === "PGRST205" ? "Food logging isn't set up on the server yet." : "Couldn't log that meal." };
  revalidatePath("/fit", "layout");
  return { ok: true };
}
