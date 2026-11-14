"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, GlassWater, Plus, Trash2 } from "lucide-react";
import { copyMeal, deleteFood, setWater, updateServings } from "@/app/(fit)/fit/food/actions";
import type { CustomFood, FoodEntry } from "@/lib/fit";
import { MEALS, mealLabel, type Diet, type Food, type Meal } from "@/lib/fit-foods";
import type { Targets } from "@/lib/fit-nutrition";
import { AddFoodDialog } from "./add-food-dialog";
import { KcalRing } from "./kcal-ring";
import { MacroBars } from "./macro-bars";

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
const longDay = new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
const addDays = (d: string, n: number) => new Date(utc(d).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const GLASS = 250;

/** The day's food: totals ring + macros + water on one side, the four meals on the other. */
export function FoodDiary({
  day,
  today,
  entries,
  custom,
  targets,
  water,
  waterTarget,
  recent,
  diet,
  yesterdayMeals,
}: {
  day: string;
  today: string;
  entries: FoodEntry[];
  custom: CustomFood[];
  targets: Targets | null;
  water: number;
  waterTarget: number;
  recent: Food[];
  diet: Diet | null;
  yesterdayMeals: Meal[];
}) {
  const [adding, setAdding] = useState<Meal | null>(null);
  const [lastMeal, setLastMeal] = useState<Meal>("breakfast");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [waterNow, setWaterNow] = useState(water);
  const [waterDay, setWaterDay] = useState(day);
  if (waterDay !== day) {
    setWaterDay(day);
    setWaterNow(water);
  }

  const totals = entries.reduce(
    (t, e) => ({ kcal: t.kcal + e.kcal, protein: t.protein + e.protein, carbs: t.carbs + e.carbs, fat: t.fat + e.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const glasses = Math.ceil(waterTarget / GLASS);
  const filled = Math.round(waterNow / GLASS);
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ?? null);
    });
  const tapGlass = (i: number) => {
    const ml = (i + 1 === filled ? i : i + 1) * GLASS;
    setWaterNow(ml);
    run(() => setWater(day, ml));
  };

  const dayLabel = day === today ? "Today" : day === addDays(today, -1) ? "Yesterday" : longDay.format(utc(day));

  return (
    <div className="grid gap-5 md:grid-cols-12 md:items-start md:gap-6 lg:gap-10">
      {/* Day + totals */}
      <section aria-label="Day totals" className="card-in flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-6 md:sticky md:top-6 md:col-span-5">
        <div className="flex items-center justify-between gap-2">
          <Link href={`/food?day=${addDays(day, -1)}`} aria-label="Previous day" className="grid size-11 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink">
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <div className="text-center">
            <p className="font-display text-2xl font-bold uppercase">{dayLabel}</p>
            {day !== today && (
              <Link href="/food" className="text-xs font-semibold text-ink-subtle underline-offset-4 hover:text-ink hover:underline">
                Back to today
              </Link>
            )}
          </div>
          {day < today ? (
            <Link href={`/food?day=${addDays(day, 1)}`} aria-label="Next day" className="grid size-11 place-items-center rounded-full border border-outline text-ink-variant hover:bg-hover hover:text-ink">
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          ) : (
            <span className="size-11" aria-hidden />
          )}
        </div>
        <div className="flex flex-col items-center gap-5 sm:flex-row md:flex-col lg:flex-row">
          <KcalRing eaten={totals.kcal} target={targets?.kcal ?? null} />
          <MacroBars totals={totals} targets={targets} />
        </div>
        {!targets && (
          <p className="rounded-xl border border-dashed border-outline p-3 text-sm text-ink-variant">
            <Link href="/me" className="font-semibold text-ink underline underline-offset-4">Set up your profile</Link> to see calorie and protein targets.
          </p>
        )}
        <div className="flex flex-col gap-2 border-t border-outline-variant pt-4">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              <GlassWater className="size-4" aria-hidden /> Water
            </span>
            <span className="font-display text-xl font-bold">
              {(waterNow / 1000).toFixed(2).replace(/0$/, "")}
              <span className="text-sm text-ink-subtle"> / {(waterTarget / 1000).toFixed(1)} L</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Water: ${filled} of ${glasses} glasses. Tap a glass to set.`}>
            {Array.from({ length: glasses }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => tapGlass(i)}
                aria-label={`${i + 1} glass${i ? "es" : ""}`}
                aria-pressed={i < filled}
                className={`h-9 w-7 rounded-b-lg rounded-t-sm border transition-colors ${i < filled ? "border-ink bg-ink" : "border-outline hover:border-ink-subtle"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Meals */}
      <div className="flex flex-col gap-4 md:col-span-7">
        {MEALS.map((meal, mi) => {
          const items = entries.filter((e) => e.meal === meal);
          const kcal = items.reduce((s, e) => s + e.kcal, 0);
          return (
            <section key={meal} aria-label={mealLabel(meal)} className="card-in rounded-2xl border border-outline-variant bg-surface" style={{ ["--card-i" as string]: mi + 1 }}>
              <div className="flex items-center justify-between gap-3 p-4 sm:px-5">
                <h2 className="font-display text-2xl font-bold uppercase">{mealLabel(meal)}</h2>
                <div className="flex items-center gap-2">
                  {items.length > 0 && <span className="font-display text-xl font-bold text-ink-variant">{Math.round(kcal)} kcal</span>}
                  {!items.length && yesterdayMeals.includes(meal) && (
                    <button type="button" disabled={pending} onClick={() => run(() => copyMeal(addDays(day, -1), day, meal))} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-outline px-3 text-xs font-bold text-ink-variant hover:bg-hover hover:text-ink">
                      <Copy className="size-3.5" aria-hidden /> Same as yesterday
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLastMeal(meal);
                      setAdding(meal);
                    }}
                    aria-label={`Add food to ${mealLabel(meal)}`}
                    className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                  >
                    <Plus className="size-5" aria-hidden />
                  </button>
                </div>
              </div>
              {items.length > 0 && (
                <ul className="divide-y divide-outline-variant border-t border-outline-variant">
                  {items.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {e.servings} × {e.serving_label} · {Math.round(e.protein)} g protein{e.source === "ai" ? " · estimate" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label={`Fewer ${e.name}`} disabled={pending || e.servings <= 0.5} onClick={() => run(() => updateServings(e.id, Math.max(0.5, e.servings - 0.5)))} className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink disabled:opacity-30">
                          −
                        </button>
                        <button type="button" aria-label={`More ${e.name}`} disabled={pending} onClick={() => run(() => updateServings(e.id, e.servings + 0.5))} className="grid size-8 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink">
                          +
                        </button>
                      </div>
                      <span className="w-14 text-right font-display text-xl font-bold">{Math.round(e.kcal)}</span>
                      <button type="button" aria-label={`Remove ${e.name}`} disabled={pending} onClick={() => run(() => deleteFood(e.id))} className="grid size-9 place-items-center rounded-full text-ink-subtle hover:bg-hover hover:text-ink">
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        <p aria-live="polite" className="min-h-5 text-sm text-ink-variant">
          {msg}
        </p>
      </div>

      <AddFoodDialog open={adding !== null} onOpenChange={(o) => !o && setAdding(null)} day={day} meal={adding ?? lastMeal} diet={diet} custom={custom} recent={recent} />
    </div>
  );
}
