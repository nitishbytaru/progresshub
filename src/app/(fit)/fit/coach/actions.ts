"use server";

import { revalidatePath } from "next/cache";
import { getToday } from "@/lib/data";
import { getFoodRange, getMealPrep, getProfile, getWeekPlan, getWeights } from "@/lib/fit";
import { chatCoachAI, planMealsAI, planWeekAI } from "@/lib/fit-coach-ai";
import { MAX_TURNS, cleanMood, validateMealEdit, validateWeekEdit, type ChatTurn } from "@/lib/fit-coach-chat";
import { cleanIngredients, remainingMeals, validatePrep } from "@/lib/fit-coach-meals";
import { fallbackPlan, lastTrained, lockedDays, mergeWeek, openDays, validatePlan, WEEKDAYS } from "@/lib/fit-coach-plan";
import { MEALS, mealLabel, type CoreMeal } from "@/lib/fit-foods";
import { adaptiveTdee, sum, targets } from "@/lib/fit-nutrition";
import { addDays, weekStart } from "@/lib/fit-stats";
import { MUSCLES } from "@/lib/fit-units";
import { createClient } from "@/lib/supabase/server";

/** AI calls a day, shared by the week planner and meal prep (the old coach chat's cap). */
const COACH_AI_CAP = 30;
const r1 = (n: number) => Math.round(n * 10) / 10;
const missing = (code?: string) => code === "42P01" || code === "PGRST205";
const setupError = "The coach isn't set up on the server yet.";

async function session() {
  const [supabase, today] = await Promise.all([createClient(), getToday()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, today, user };
}

/** Take one AI call from today's cap (false when used up or unavailable). */
async function takeAI(supabase: Awaited<ReturnType<typeof createClient>>, today: string) {
  const { data, error } = await supabase.rpc("fit_ai_take", { p_kind: "coach", p_day: today, p_cap: COACH_AI_CAP });
  return !error && Boolean(data);
}

export type PlanResult = { error?: string; ok?: true; source?: "ai" | "rules" };

/**
 * Generate this week's training, or re-plan it. Completed and past days are locked as they happened;
 * the AI plans the open days (today if not logged, through Saturday) around them, and the rule-based
 * planner steps in when the AI is unavailable or today's AI calls are used up. Sunday is always off.
 */
export async function generateWeekPlan(): Promise<PlanResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const monday = weekStart(today);
  const [profile, { logs }, current] = await Promise.all([getProfile(), getWeights(120), getWeekPlan(monday)]);
  const merged = mergeWeek(current, logs, today);
  const gymTarget = Math.max(0, Math.min(6, profile?.gym_days_target ?? 6));
  const gymLeft = Math.max(0, gymTarget - merged.completedGym);
  const input = { today, merged: merged.days, logs, gymLeft };

  const open = openDays(merged.days);
  let days = fallbackPlan(input);
  let source: "ai" | "rules" = "rules";
  if (open.length && gymLeft > 0 && (await takeAI(supabase, today))) {
    const since28 = addDays(today, -28);
    const raw = await planWeekAI({
      goal: profile?.goal ?? null,
      gym_days_per_week: gymTarget,
      sessions_left: gymLeft,
      locked_days: lockedDays(merged.days).map((d) => ({ day: d.day, weekday: WEEKDAYS[(new Date(`${d.day}T00:00:00Z`).getUTCDay() + 6) % 7], trained: d.muscles, rest: d.rest })),
      open_days: merged.days.filter((d) => open.includes(d.day)).map((d) => ({ day: d.day, weekday: d.weekday })),
      days_since_trained: lastTrained(logs, today, lockedDays(merged.days)),
      sessions_last_28_days: Object.fromEntries(MUSCLES.map((m) => [m, logs.filter((l) => l.gym && l.day > since28 && l.muscles.includes(m)).length])) as Record<(typeof MUSCLES)[number], number>,
    });
    if (raw) {
      days = validatePlan(raw, input);
      source = "ai";
    }
  }

  const { error } = await supabase
    .from("coach_week_plans")
    .upsert({ user_id: user.id, week_start: monday, days, generated_at: new Date().toISOString() }, { onConflict: "user_id,week_start" });
  if (error) return { error: missing(error.code) ? setupError : "Couldn't save the plan. Try again." };
  revalidatePath("/fit", "layout");
  return { ok: true, source };
}

export type CoachResult = { error?: string; ok?: true };

/** Save today's ingredient list (kept for the day). */
export async function saveIngredients(list: string[]): Promise<CoachResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const ingredients = cleanIngredients(list);
  const { error } = await supabase
    .from("coach_meal_preps")
    .upsert({ user_id: user.id, day: today, ingredients, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) return { error: missing(error.code) ? setupError : "Couldn't save your ingredients." };
  return { ok: true };
}

export type PrepResult = { error?: string; ok?: true; meals?: number; warnings?: number };

/**
 * Plan today's remaining meals from the ingredients at hand. Meals already logged today are left out
 * and what was eaten counts toward the day's targets, so the plan covers only what's left.
 */
export async function generateMealPrep(list: string[]): Promise<PrepResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const ingredients = cleanIngredients(list);
  if (!ingredients.length) return { error: "Add the ingredients you have first." };
  const [profile, { logs }, food] = await Promise.all([getProfile(), getWeights(60), getFoodRange(addDays(today, -28), today)]);
  const kg = logs[0]?.kg ?? null;
  if (!profile || !kg) return { error: "Set up your profile and log a weight so the coach knows your targets." };

  const perDay = new Map<string, number>();
  food.forEach((e) => perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.kcal));
  const observed = adaptiveTdee([...perDay].map(([day, kcal]) => ({ day, kcal })), logs.map((l) => ({ day: l.day, kg: l.kg })));
  const t = targets(profile, kg, today, observed?.tdee);
  const todays = food.filter((e) => e.day === today);
  const eaten = sum(todays);
  const logged = new Set(todays.map((e) => e.meal));
  const remaining = remainingMeals(logged);
  if (!remaining.length) return { error: "You've logged every meal today. Nothing left to plan." };
  const left = { kcal: Math.max(0, t.kcal - eaten.kcal), protein: Math.max(0, t.protein - eaten.protein), carbs: Math.max(0, t.carbs - eaten.carbs), fiber: Math.max(0, t.fiber - eaten.fiber) };

  if (!(await takeAI(supabase, today))) return { error: `You've used today's ${COACH_AI_CAP} coach requests. Try again tomorrow.` };
  const raw = await planMealsAI({
    diet: profile.diet,
    daily_targets: { kcal: t.kcal, protein_g: t.protein, carbs_g: t.carbs, fiber_g: t.fiber },
    eaten_today: { kcal: Math.round(eaten.kcal), protein_g: Math.round(eaten.protein), carbs_g: Math.round(eaten.carbs), fiber_g: Math.round(eaten.fiber), meals_logged: MEALS.filter((m) => logged.has(m)) },
    remaining_targets: { kcal: Math.round(left.kcal), protein_g: Math.round(left.protein), carbs_g: Math.round(left.carbs), fiber_g: Math.round(left.fiber) },
    remaining_meals: remaining,
    ingredients,
  });
  if (!raw) return { error: "The coach couldn't plan meals right now. Try again in a minute." };
  const { meals, warnings } = validatePrep(raw, remaining, left, ingredients);
  if (!meals.length) return { error: "The coach couldn't make meals from those ingredients. Add a few more and try again." };

  const { error } = await supabase
    .from("coach_meal_preps")
    .upsert({ user_id: user.id, day: today, ingredients, meals, warnings, generated_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  if (error) return { error: missing(error.code) ? setupError : "Couldn't save the meal prep." };
  revalidatePath("/fit", "layout");
  return { ok: true, meals: meals.length, warnings: warnings.length };
}

/** Log one planned dish to today's Food diary (as an estimate). The next plan then skips that meal. */
export async function logPrepMeal(meal: CoreMeal): Promise<CoachResult & { dish?: string }> {
  if (!MEALS.includes(meal)) return { error: "Pick a meal." };
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const prep = await getMealPrep(today);
  const m = prep?.meals.find((x) => x.meal === meal);
  if (!m) return { error: `No ${mealLabel(meal).toLowerCase()} planned. Generate the meal prep first.` };
  const { error } = await supabase.from("food_logs").insert({
    user_id: user.id,
    day: today,
    meal,
    source: "ai",
    food_key: null,
    name: m.dish.slice(0, 80),
    serving_label: "1 plate",
    servings: 1,
    kcal: r1(m.kcal),
    protein_g: r1(m.protein),
    carbs_g: r1(m.carbs),
    fat_g: r1(m.fat),
    fiber_g: r1(m.fiber),
  });
  if (error) return { error: missing(error.code) ? "Food logging isn't set up on the server yet." : "Couldn't log that meal." };
  revalidatePath("/fit", "layout");
  return { ok: true, dish: m.dish };
}

// ---------------------------------------------------------------------------------------------
// Talk to Coach Dumbo: chat about the current plan; edits come back as proposals to Apply.
// ---------------------------------------------------------------------------------------------

export type ChatResult = { error?: string; turns?: ChatTurn[] };

/** Everything the coach needs to talk about today's plan (and to check an edit against). */
async function coachState(today: string) {
  const monday = weekStart(today);
  const [profile, { logs }, plan, prep, food] = await Promise.all([getProfile(), getWeights(120), getWeekPlan(monday), getMealPrep(today), getFoodRange(addDays(today, -28), today)]);
  const merged = mergeWeek(plan, logs, today);
  const kg = logs[0]?.kg ?? null;
  const perDay = new Map<string, number>();
  food.forEach((e) => perDay.set(e.day, (perDay.get(e.day) ?? 0) + e.kcal));
  const observed = adaptiveTdee([...perDay].map(([day, kcal]) => ({ day, kcal })), logs.map((l) => ({ day: l.day, kg: l.kg })));
  const t = profile && kg ? targets(profile, kg, today, observed?.tdee) : null;
  const todays = food.filter((e) => e.day === today);
  const eaten = sum(todays);
  const logged = new Set(todays.map((e) => e.meal));
  const remaining = remainingMeals(logged);
  const left = t
    ? { kcal: Math.max(0, t.kcal - eaten.kcal), protein: Math.max(0, t.protein - eaten.protein), carbs: Math.max(0, t.carbs - eaten.carbs), fiber: Math.max(0, t.fiber - eaten.fiber) }
    : { kcal: 0, protein: 0, carbs: 0, fiber: 0 };
  return { profile, logs, plan, prep, merged, t, left, logged, remaining };
}

async function loadTurns(supabase: Awaited<ReturnType<typeof createClient>>, today: string): Promise<ChatTurn[]> {
  const { data } = await supabase.from("coach_chats").select("turns").eq("day", today).maybeSingle();
  return ((data?.turns ?? []) as ChatTurn[]).slice(-MAX_TURNS);
}

async function saveTurns(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, today: string, turns: ChatTurn[]) {
  const { error } = await supabase
    .from("coach_chats")
    .upsert({ user_id: userId, day: today, turns: turns.slice(-MAX_TURNS), updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
  return error;
}

/** Send one message to Dumbo. He answers about the current plan and may propose an edit (not applied). */
export async function chatCoach(message: string): Promise<ChatResult> {
  const text = String(message ?? "").trim().slice(0, 300);
  if (!text) return { error: "Type a message first." };
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const turns = await loadTurns(supabase, today);
  if (!(await takeAI(supabase, today))) return { error: `You've used today's ${COACH_AI_CAP} coach requests. Try again tomorrow.` };

  const s = await coachState(today);
  const lockedSet = new Set(lockedDays(s.merged.days).map((d) => d.day));
  const ai = await chatCoachAI(
    {
      today,
      weekday: WEEKDAYS[(new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7],
      goal: s.profile?.goal ?? null,
      diet: s.profile?.diet ?? null,
      gym_days_per_week: s.profile?.gym_days_target ?? 4,
      week: s.merged.days.map((d) => ({ day: d.day, weekday: d.weekday, locked: lockedSet.has(d.day) || d.weekday === "Sun", status: d.status, muscles: d.muscles, rest: d.rest, note: d.note })),
      meal_prep: {
        ingredients: s.prep?.ingredients ?? [],
        meals: (s.prep?.meals ?? []).map((m) => ({ meal: m.meal, dish: m.dish, items: m.items, kcal: Math.round(m.kcal), protein: Math.round(m.protein) })),
        meals_logged: MEALS.filter((m) => s.logged.has(m)),
        can_change: s.remaining,
      },
      remaining_targets: s.t ? { kcal: Math.round(s.left.kcal), protein_g: Math.round(s.left.protein), carbs_g: Math.round(s.left.carbs), fiber_g: Math.round(s.left.fiber) } : null,
    },
    turns.map((t) => ({ role: t.role, text: t.text })),
    text,
  );
  if (!ai) return { error: "Dumbo couldn't answer right now. Try again in a minute." };

  // Validate the proposed edit against what's locked; anything left is a proposal, not a change.
  const week = ai.week ? validateWeekEdit(ai.week, s.merged.days, today) : null;
  const meals = ai.meals ? validateMealEdit(ai.meals, ai.warnings, s.prep?.meals ?? [], s.remaining, s.left, s.prep?.ingredients ?? []) : null;
  const proposal = week || meals ? { ...(week ? { week } : {}), ...(meals ? { meals } : {}) } : undefined;
  const at = new Date().toISOString();
  const next: ChatTurn[] = [
    ...turns,
    { role: "user", text, at },
    { role: "dumbo", text: ai.reply, mood: cleanMood(ai.mood), at, ...(proposal ? { proposal, status: "pending" as const } : {}) },
  ];
  const error = await saveTurns(supabase, user.id, today, next);
  if (error) return { error: missing(error.code) ? setupError : "Couldn't save the chat." };
  return { turns: next.slice(-MAX_TURNS) };
}

/** Apply a proposed edit (re-checked against fresh data). Keeps what it replaced so Undo works. */
export async function applyCoachChange(index: number): Promise<ChatResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const turns = await loadTurns(supabase, today);
  const turn = turns[index];
  if (!turn || turn.role !== "dumbo" || !turn.proposal || turn.status !== "pending") return { error: "That change isn't available anymore." };
  const s = await coachState(today);
  const undo: NonNullable<Extract<ChatTurn, { role: "dumbo" }>["undo"]> = {};

  if (turn.proposal.week) {
    const week = validateWeekEdit(turn.proposal.week.days, s.merged.days, today);
    if (week) {
      undo.week = s.plan?.days ?? null;
      const { error } = await supabase
        .from("coach_week_plans")
        .upsert({ user_id: user.id, week_start: weekStart(today), days: week.days, generated_at: new Date().toISOString() }, { onConflict: "user_id,week_start" });
      if (error) return { error: missing(error.code) ? setupError : "Couldn't save the training week." };
    }
  }
  if (turn.proposal.meals) {
    const meals = validateMealEdit(turn.proposal.meals.meals, turn.proposal.meals.warnings, s.prep?.meals ?? [], s.remaining, s.left, s.prep?.ingredients ?? []);
    if (meals) {
      undo.meals = s.prep ? { meals: s.prep.meals, warnings: s.prep.warnings } : null;
      const { error } = await supabase
        .from("coach_meal_preps")
        .upsert(
          { user_id: user.id, day: today, ingredients: s.prep?.ingredients ?? [], meals: meals.meals, warnings: meals.warnings, generated_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          { onConflict: "user_id,day" },
        );
      if (error) return { error: missing(error.code) ? setupError : "Couldn't save the meal prep." };
    }
  }
  if (!("week" in undo) && !("meals" in undo)) return { error: "Nothing to change: the plan already looks like that (or those days are done)." };
  const next = turns.map((t, i) => (i === index && t.role === "dumbo" ? { ...t, status: "applied" as const, undo, appliedAt: new Date().toISOString() } : t));
  await saveTurns(supabase, user.id, today, next);
  revalidatePath("/fit", "layout");
  return { turns: next };
}

/** Put back what an applied edit replaced. */
export async function undoCoachChange(index: number): Promise<ChatResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const turns = await loadTurns(supabase, today);
  const turn = turns[index];
  if (!turn || turn.role !== "dumbo" || turn.status !== "applied" || !turn.undo) return { error: "Nothing to undo." };
  if ("week" in turn.undo) {
    const q = turn.undo.week
      ? supabase.from("coach_week_plans").upsert({ user_id: user.id, week_start: weekStart(today), days: turn.undo.week, generated_at: new Date().toISOString() }, { onConflict: "user_id,week_start" })
      : supabase.from("coach_week_plans").delete().eq("user_id", user.id).eq("week_start", weekStart(today));
    const { error } = await q;
    if (error) return { error: "Couldn't undo the training change." };
  }
  if ("meals" in turn.undo) {
    const m = turn.undo.meals;
    const { error } = await supabase
      .from("coach_meal_preps")
      .update({ meals: m?.meals ?? [], warnings: m?.warnings ?? [], updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("day", today);
    if (error) return { error: "Couldn't undo the meal change." };
  }
  const next = turns.map((t, i) => (i === index && t.role === "dumbo" ? { ...t, status: "undone" as const, undo: undefined } : t));
  await saveTurns(supabase, user.id, today, next);
  revalidatePath("/fit", "layout");
  return { turns: next };
}

export async function discardCoachChange(index: number): Promise<ChatResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  const turns = await loadTurns(supabase, today);
  const turn = turns[index];
  if (!turn || turn.role !== "dumbo" || turn.status !== "pending") return { turns };
  const next = turns.map((t, i) => (i === index && t.role === "dumbo" ? { ...t, status: "discarded" as const } : t));
  await saveTurns(supabase, user.id, today, next);
  return { turns: next };
}

export async function clearCoachChat(): Promise<ChatResult> {
  const { supabase, today, user } = await session();
  if (!user) return { error: "Your session expired. Sign in again." };
  await supabase.from("coach_chats").delete().eq("user_id", user.id).eq("day", today);
  return { turns: [] };
}
