/**
 * Nutrition rules for the fit coach. Pure functions, no I/O; every number the app shows about
 * calories comes from here (the AI never invents targets).
 */
import type { Diet } from "./fit-foods";

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Goal = "lose" | "maintain" | "gain";

export type FitProfile = {
  sex: Sex;
  birth_year: number;
  height_cm: number;
  activity: Activity;
  goal: Goal;
  target_kg: number | null;
  weekly_rate_kg: number;
  diet: Diet;
  gym_days_target: number;
  water_target_ml: number;
};

export const ACTIVITY: Record<Activity, { factor: number; label: string; hint: string }> = {
  sedentary: { factor: 1.2, label: "Sedentary", hint: "Desk job, little walking" },
  light: { factor: 1.375, label: "Light", hint: "On your feet a bit, 1–3 workouts/wk" },
  moderate: { factor: 1.55, label: "Moderate", hint: "3–5 workouts/wk" },
  active: { factor: 1.725, label: "Active", hint: "6–7 hard workouts/wk" },
  very_active: { factor: 1.9, label: "Very active", hint: "Physical job + daily training" },
};

export const GOAL_LABEL: Record<Goal, string> = { lose: "Lose fat", maintain: "Maintain", gain: "Build muscle" };

/** kcal in 1 kg of body weight change (fat-mass approximation used across the app). */
export const KCAL_PER_KG = 7700;

export const ageOf = (birthYear: number, today: string) => Number(today.slice(0, 4)) - birthYear;

/** Mifflin-St Jeor basal metabolic rate. */
export function bmr(p: Pick<FitProfile, "sex" | "birth_year" | "height_cm">, kg: number, today: string) {
  const base = 10 * kg + 6.25 * p.height_cm - 5 * ageOf(p.birth_year, today);
  return Math.round(p.sex === "male" ? base + 5 : base - 161);
}

export type Targets = {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Fiber target, g: 14 g per 1,000 kcal (Dietary Guidelines), at least 25 g. */
  fiber: number;
  /** Daily kcal change applied for the goal (negative = deficit). */
  adjust: number;
  /** True when the requested rate was capped by the safety floor. */
  floored: boolean;
};

/**
 * Daily targets: TDEE = BMR × activity; goal adds ±(weekly rate × 7700 / 7), floored at a safe
 * minimum. Protein 2.0 g/kg cutting, 1.8 maintaining, 1.8 gaining; fat 25% of kcal; carbs the rest;
 * fiber 14 g per 1,000 kcal (minimum 25 g).
 * `tdeeOverride` lets the adaptive (observed) TDEE replace the formula once there is enough data.
 */
export function targets(p: FitProfile, kg: number, today: string, tdeeOverride?: number | null): Targets {
  const b = bmr(p, kg, today);
  const tdee = Math.round(tdeeOverride ?? b * ACTIVITY[p.activity].factor);
  const rate = p.goal === "maintain" ? 0 : p.weekly_rate_kg;
  const wanted = Math.round(((p.goal === "lose" ? -1 : 1) * rate * KCAL_PER_KG) / 7);
  const floor = Math.max(p.sex === "female" ? 1200 : 1500, Math.round(b * 1.1));
  let kcal = tdee + (p.goal === "maintain" ? 0 : wanted);
  const floored = kcal < floor;
  kcal = Math.max(kcal, floor);
  // Lean gains: cap the surplus at +500.
  if (p.goal === "gain") kcal = Math.min(kcal, tdee + 500);
  const protein = Math.round(kg * (p.goal === "lose" ? 2.0 : 1.8));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const fiber = Math.max(25, Math.round((kcal / 1000) * 14));
  return { bmr: b, tdee, kcal: Math.round(kcal), protein, carbs, fat, fiber, adjust: Math.round(kcal - tdee), floored };
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number; fiber: number };
export const ZERO: Totals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

export function sum(items: { kcal: number; protein: number; carbs: number; fat: number; fiber?: number }[]): Totals {
  return items.reduce<Totals>(
    (t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.protein, carbs: t.carbs + i.carbs, fat: t.fat + i.fat, fiber: t.fiber + (i.fiber ?? 0) }),
    { ...ZERO },
  );
}

/**
 * Observed TDEE from real data: average daily intake minus the energy stored or lost, read from the
 * change in 7-day-average weight over the window. Needs ≥10 logged food days and ≥2 weigh-ins
 * spanning ≥10 days; otherwise null (the formula is used instead).
 */
export function adaptiveTdee(
  intake: { day: string; kcal: number }[],
  weights: { day: string; kg: number }[],
): { tdee: number; days: number } | null {
  const logged = intake.filter((d) => d.kcal > 300);
  if (logged.length < 10 || weights.length < 2) return null;
  const w = [...weights].sort((a, b) => a.day.localeCompare(b.day));
  const t0 = Date.parse(w[0].day);
  const t1 = Date.parse(w.at(-1)!.day);
  const span = (t1 - t0) / 86_400_000;
  if (span < 10) return null;
  // Mean weight (and mean date) of the first and last 7 days: compares like with like, no smoothing lag.
  const head = w.filter((x) => Date.parse(x.day) < t0 + 7 * 86_400_000);
  const tail = w.filter((x) => Date.parse(x.day) > t1 - 7 * 86_400_000);
  const mean = (xs: typeof w, f: (x: (typeof w)[number]) => number) => xs.reduce((s, x) => s + f(x), 0) / xs.length;
  const gapDays = (mean(tail, (x) => Date.parse(x.day)) - mean(head, (x) => Date.parse(x.day))) / 86_400_000;
  if (gapDays < 5) return null;
  const delta = mean(tail, (x) => x.kg) - mean(head, (x) => x.kg);
  const meanIntake = logged.reduce((s, d) => s + d.kcal, 0) / logged.length;
  const tdee = Math.round(meanIntake - (delta * KCAL_PER_KG) / gapDays);
  if (tdee < 1000 || tdee > 6000) return null;
  return { tdee, days: logged.length };
}
