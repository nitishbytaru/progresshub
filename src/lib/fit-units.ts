/** Weight units for the Fitness app. Weights are always stored in kg; lb is display + input only. */
export type Unit = "kg" | "lb";

export const UNIT_COOKIE = "fit_unit";
export const KG_PER_LB = 0.45359237;
export const KG_MIN = 20;
export const KG_MAX = 400;

export const isUnit = (v: unknown): v is Unit => v === "kg" || v === "lb";

/** kg → the chosen unit, unrounded. */
export const fromKg = (kg: number, unit: Unit) => (unit === "lb" ? kg / KG_PER_LB : kg);

/** A weight in the chosen unit with one decimal, e.g. "72.4" or "159.6". */
export const fmtWeight = (kg: number, unit: Unit) => fromKg(kg, unit).toFixed(1);

/** The allowed input range in the chosen unit (20–400 kg ≈ 44–882 lb). */
export const unitRange = (unit: Unit) =>
  unit === "lb" ? { min: Math.ceil(KG_MIN / KG_PER_LB), max: Math.floor(KG_MAX / KG_PER_LB) } : { min: KG_MIN, max: KG_MAX };

/** Parses a typed weight ("72.4" or "72,4") in `unit` and returns kg (2 decimals), or an error message. */
export function parseWeight(raw: string, unit: Unit): { kg: number } | { error: string } {
  const n = Number(raw.trim().replace(",", "."));
  if (!raw.trim() || !Number.isFinite(n)) return { error: `Enter your weight in ${unit}, like ${unit === "lb" ? "160.0" : "72.4"}.` };
  const { min, max } = unitRange(unit);
  if (n < min || n > max) return { error: `Weight must be between ${min} and ${max} ${unit}.` };
  const kg = unit === "lb" ? Math.round(Math.round(n * 10) / 10 * KG_PER_LB * 100) / 100 : Math.round(n * 10) / 10;
  return { kg: Math.min(Math.max(kg, KG_MIN), KG_MAX) };
}

/** Muscle groups a gym day can be tagged with (matches the weight_logs.muscles check constraint). */
export const MUSCLES = ["chest", "back", "shoulders", "biceps", "triceps", "legs"] as const;
export type Muscle = (typeof MUSCLES)[number];
export const isMuscle = (v: unknown): v is Muscle => MUSCLES.includes(v as Muscle);
export const muscleLabel = (m: Muscle) => m.charAt(0).toUpperCase() + m.slice(1);

/** Each muscle group's bumper-plate colour (CSS var from fit.css) and the ink that reads on it. */
export const PLATE: Record<Muscle, { fill: string; ink: string }> = {
  chest: { fill: "var(--plate-chest)", ink: "#ffffff" },
  back: { fill: "var(--plate-back)", ink: "#ffffff" },
  legs: { fill: "var(--plate-legs)", ink: "#141414" },
  shoulders: { fill: "var(--plate-shoulders)", ink: "#141414" },
  biceps: { fill: "var(--plate-biceps)", ink: "#141414" },
  triceps: { fill: "var(--plate-triceps)", ink: "#ffffff" },
};
