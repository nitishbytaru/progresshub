/**
 * Rule-based day meal plan from the built-in food list: four meals sized to the user's calorie and
 * protein targets, filtered by diet type. Deterministic for a seed, so a plan is stable for the day
 * and a "swap" only changes the one slot asked for. Pure; no I/O.
 */
import { FOODS, allowedDiets, isCountable, isLiquid, type Diet, type Food, type Meal } from "./fit-foods";

export type PlanItem = { slot: string; food: Food; servings: number; kcal: number; protein: number; carbs: number; fat: number };
export type PlanMeal = { meal: Meal; items: PlanItem[]; kcal: number; protein: number };
export type DayPlan = { meals: PlanMeal[]; kcal: number; protein: number; carbs: number; fat: number };

const SHARE: Record<Meal, number> = { breakfast: 0.25, lunch: 0.35, snack: 0.1, dinner: 0.3 };
const ORDER: Meal[] = ["breakfast", "lunch", "snack", "dinner"];

/** Treats and fried foods are fine to log, but the planner never prescribes them. */
const NOT_PLANNED = new Set([
  "samosa", "pakora", "chips", "french-fries", "soft-drink", "gulab-jamun", "rasgulla", "jalebi", "ice-cream", "kheer",
  "maggi", "pizza-slice", "burger-veg", "chole-bhature", "bhatura", "butter-naan", "pav-bhaji", "vada-pav", "pani-puri",
  "bhel", "chicken-65", "biscuits", "dark-chocolate", "lassi-sweet", "sugar", "honey", "pickle", "butter", "ghee",
  "tea-milk", "coffee-milk", "black-coffee", "green-tea", "mutton-biryani", "butter-chicken", "paneer-butter-masala",
  "french-toast", "puri", "cheese-slice", "orange-juice", "banana-shake",
]);

/** Slots per meal: [slot name, roles to draw from]. */
const TEMPLATE: Record<Meal, [string, Food["role"][]][]> = {
  breakfast: [["main", ["main"]], ["protein", ["protein"]], ["fruit", ["fruit"]]],
  lunch: [["main", ["main"]], ["protein", ["protein"]], ["side", ["side"]]],
  snack: [["snack", ["protein", "snack", "fruit"]]],
  dinner: [["main", ["main"]], ["protein", ["protein"]], ["side", ["side"]]],
};

/** Small deterministic PRNG (mulberry32) from a string seed. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Countable servings (1 pc, 1 slice…) step by 1; others by 0.5. */
const countable = (f: Food) => isCountable(f.serving);
/** Most pieces to plan: 4 of a full item (roti, egg), more of small ones (almonds) up to ~300 kcal. */
const maxPieces = (f: Food) => Math.max(4, Math.min(20, Math.floor(300 / Math.max(1, f.kcal))));
const roundServ = (f: Food, s: number) => {
  const step = countable(f) ? 1 : 0.5;
  return Math.min(countable(f) ? maxPieces(f) : isLiquid(f.serving) ? 5 : 3, Math.max(step, Math.round(s / step) * step));
};

const item = (slot: string, food: Food, servings: number): PlanItem => ({
  slot,
  food,
  servings,
  kcal: Math.round(food.kcal * servings),
  protein: Math.round(food.protein * servings * 10) / 10,
  carbs: Math.round(food.carbs * servings * 10) / 10,
  fat: Math.round(food.fat * servings * 10) / 10,
});

/**
 * Build a day plan. `swaps` bumps a slot's choice: key `${meal}:${slot}` → swap count.
 * Protein items are picked from the most protein-dense options; mains fill the remaining calories.
 */
export function planDay(opts: { kcal: number; protein: number; diet: Diet; seed: string; swaps?: Record<string, number> }): DayPlan {
  const ok = new Set(allowedDiets(opts.diet));
  const usable = FOODS.filter((f) => ok.has(f.diet) && !NOT_PLANNED.has(f.key));
  const used = new Set<string>();

  const meals = ORDER.map((meal): PlanMeal => {
    const kBudget = opts.kcal * SHARE[meal];
    const pBudget = opts.protein * SHARE[meal];
    const chosen: { slot: string; food: Food }[] = [];

    for (const [slot, roles] of TEMPLATE[meal]) {
      let pool = usable.filter((f) => f.meals.includes(meal) && roles.includes(f.role) && !used.has(f.key));
      if (!pool.length) pool = usable.filter((f) => roles.includes(f.role) && !used.has(f.key));
      if (!pool.length) continue;
      if (slot === "protein" || slot === "snack") {
        // Most protein per kcal first; keep the top half so variety remains.
        pool = [...pool].sort((a, b) => b.protein / b.kcal - a.protein / a.kcal).slice(0, Math.max(3, Math.ceil(pool.length / 2)));
      }
      const r = rng(`${opts.seed}|${meal}|${slot}|${opts.swaps?.[`${meal}:${slot}`] ?? 0}`);
      const food = pool[Math.floor(r() * pool.length)];
      used.add(food.key);
      chosen.push({ slot, food });
    }

    // Size: protein slot to the protein budget, sides at 1, mains fill remaining kcal.
    const items: PlanItem[] = [];
    let k = 0;
    let p = 0;
    for (const c of chosen.filter((c) => c.slot !== "main")) {
      let s = c.food.portion;
      if (c.slot === "protein" || c.slot === "snack") {
        const need = Math.max(0, pBudget - p) * (meal === "snack" ? 1 : 0.75);
        s = c.food.protein > 0 ? need / c.food.protein : 1;
        s = Math.min(s, (kBudget * (meal === "snack" ? 1 : 0.55)) / c.food.kcal);
      }
      const it = item(c.slot, c.food, roundServ(c.food, s));
      items.push(it);
      k += it.kcal;
      p += it.protein;
    }
    const main = chosen.find((c) => c.slot === "main");
    if (main) {
      const it = item("main", main.food, roundServ(main.food, Math.max(0, kBudget - k) / main.food.kcal));
      items.unshift(it);
      k += it.kcal;
      p += it.protein;
    }
    return { meal, items, kcal: Math.round(k), protein: Math.round(p) };
  });

  // Balance pass: nudge servings one step at a time until the day is within ±4% of the kcal target,
  // never dropping protein below 95% of its target when trimming.
  const total = () => meals.flatMap((m) => m.items).reduce((s, i) => s + i.kcal, 0);
  const prot = () => meals.flatMap((m) => m.items).reduce((s, i) => s + i.protein, 0);
  for (let guard = 0; guard < 40; guard++) {
    const diff = total() - opts.kcal;
    if (Math.abs(diff) <= opts.kcal * 0.04) break;
    let best: { mi: number; ii: number; next: PlanItem; gain: number } | null = null;
    meals.forEach((m, mi) =>
      m.items.forEach((it, ii) => {
        const step = countable(it.food) ? 1 : 0.5;
        const s2 = it.servings + (diff > 0 ? -step : step);
        if (s2 < step || s2 > (countable(it.food) ? maxPieces(it.food) + 1 : isLiquid(it.food.serving) ? 5 : 3.5)) return;
        const next = item(it.slot, it.food, s2);
        if (diff > 0 && prot() - it.protein + next.protein < opts.protein * 0.95 && it.protein > 0) return;
        const gain = Math.abs(diff) - Math.abs(diff - it.kcal + next.kcal);
        if (gain > 0 && (!best || gain > best.gain)) best = { mi, ii, next, gain };
      }),
    );
    if (!best) break;
    const { mi, ii, next } = best as { mi: number; ii: number; next: PlanItem };
    meals[mi].items[ii] = next;
  }
  for (const m of meals) {
    m.kcal = Math.round(m.items.reduce((s, i) => s + i.kcal, 0));
    m.protein = Math.round(m.items.reduce((s, i) => s + i.protein, 0));
  }

  const all = meals.flatMap((m) => m.items);
  return {
    meals,
    kcal: Math.round(all.reduce((s, i) => s + i.kcal, 0)),
    protein: Math.round(all.reduce((s, i) => s + i.protein, 0)),
    carbs: Math.round(all.reduce((s, i) => s + i.carbs, 0)),
    fat: Math.round(all.reduce((s, i) => s + i.fat, 0)),
  };
}
