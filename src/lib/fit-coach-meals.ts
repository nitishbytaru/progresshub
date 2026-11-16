/**
 * The coach's meal prep for today. Pure types and validation (no I/O): AI output is reduced to the
 * meals still to eat, numbers are clamped, and a shortfall warning is added when the plan can't reach
 * the remaining protein or calories, even if the AI didn't say so.
 */
import { MEALS, type CoreMeal } from "./fit-foods";

export type PrepMeal = {
  meal: CoreMeal;
  dish: string;
  items: { name: string; qty: string }[];
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  steps: string[];
};
export type PrepWarning = { kind: "protein" | "kcal" | "carbs" | "fiber" | "variety"; text: string };
export type MealPrepRow = { day: string; ingredients: string[]; meals: PrepMeal[]; warnings: PrepWarning[]; generated_at: string | null };
export type Macros = { kcal: number; protein: number; carbs: number; fiber: number };

const KINDS = ["protein", "kcal", "carbs", "fiber", "variety"] as const;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");
const num = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(Math.min(max, Math.max(0, v)) * 10) / 10 : 0);

/** Clean a typed ingredient list: trimmed, de-duplicated (case-insensitive), 30 max, 2–40 chars each. */
export function cleanIngredients(list: unknown): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const s = str(raw, 40);
    if (s.length < 2 || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= 30) break;
  }
  return out;
}

/** Core meals with nothing logged today, in diary order. */
export const remainingMeals = (logged: Set<string>): CoreMeal[] => MEALS.filter((m) => !logged.has(m));

/** Basics anyone has; the plan may use these without them being listed. */
const PANTRY = ["oil", "ghee", "butter", "salt", "pepper", "spice", "masala", "chilli", "chili", "turmeric", "cumin", "jeera", "mustard", "garlic", "ginger", "coriander", "cilantro", "mint", "curry leaves", "herb", "water", "lemon", "tea", "coffee", "sugar", "vinegar", "hing"];
const words = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, " ").split(/[^a-z]+/).filter((w) => w.length > 2).map((w) => w.replace(/(es|s)$/, ""));

/** Items the plan uses that aren't in your list or the pantry basics (so the coach can say so). */
export function offList(meals: PrepMeal[], ingredients: string[]): string[] {
  const have = new Set(ingredients.flatMap(words));
  const extra = new Set<string>();
  for (const m of meals)
    for (const it of m.items) {
      const n = it.name.toLowerCase();
      if (PANTRY.some((p) => n.includes(p))) continue;
      if (!words(n).some((w) => have.has(w))) extra.add(it.name);
    }
  return [...extra];
}

/** Reduce the AI's answer to valid meals for `remaining`, plus warnings (ours added when it falls short or uses unlisted items). */
export function validatePrep(raw: { meals: unknown[]; warnings: unknown[] }, remaining: CoreMeal[], left: Macros, ingredients: string[] = []): { meals: PrepMeal[]; warnings: PrepWarning[] } {
  const meals: PrepMeal[] = [];
  for (const r of raw.meals as Record<string, unknown>[]) {
    if (!r || typeof r !== "object") continue;
    const meal = r.meal as CoreMeal;
    if (!remaining.includes(meal) || meals.some((m) => m.meal === meal)) continue;
    const dish = str(r.dish, 80);
    if (!dish) continue;
    meals.push({
      meal,
      dish,
      items: (Array.isArray(r.items) ? r.items : [])
        .slice(0, 6)
        .map((i: Record<string, unknown>) => ({ name: str(i?.name, 40), qty: str(i?.qty, 20) }))
        .filter((i) => i.name),
      kcal: num(r.kcal, 2500),
      protein: num(r.protein, 200),
      carbs: num(r.carbs, 400),
      fat: num(r.fat, 200),
      fiber: num(r.fiber, 80),
      steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 4).map((s) => str(s, 140)).filter(Boolean),
    });
  }
  meals.sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal));

  const warnings: PrepWarning[] = (raw.warnings as Record<string, unknown>[])
    .filter((w) => w && KINDS.includes(w.kind as PrepWarning["kind"]))
    .map((w) => ({ kind: w.kind as PrepWarning["kind"], text: str(w.text, 200) }))
    .filter((w) => w.text)
    .slice(0, 4);

  const extra = ingredients.length ? offList(meals, ingredients) : [];
  if (extra.length) warnings.unshift({ kind: "variety", text: `This plan uses ${extra.slice(0, 3).join(", ")}, which ${extra.length === 1 ? "isn't" : "aren't"} on your list. Add ${extra.length === 1 ? "it" : "them"} if you have ${extra.length === 1 ? "it" : "them"}, or remove and generate again.` });

  const total = meals.reduce((t, m) => ({ kcal: t.kcal + m.kcal, protein: t.protein + m.protein }), { kcal: 0, protein: 0 });
  if (left.protein > 10 && total.protein < left.protein * 0.85 && !warnings.some((w) => w.kind === "protein")) {
    warnings.unshift({ kind: "protein", text: `About ${Math.round(left.protein - total.protein)} g short on protein. Add a protein source (eggs, paneer, chicken, curd, dal or soya) and generate again.` });
  }
  if (left.kcal > 150 && total.kcal < left.kcal * 0.85 && !warnings.some((w) => w.kind === "kcal")) {
    warnings.push({ kind: "kcal", text: `About ${Math.round(left.kcal - total.kcal)} kcal under today's target. Add a filling staple (rice, roti, oats, potatoes or nuts) and generate again.` });
  }
  return { meals, warnings };
}
